"""
WebSocket & Push Notification Endpoints for CivicPulse Real-Time System.

Features:
- WebSocket connection endpoint at `/api/ws/notifications` with user & project query params.
- WebSocket connection endpoint at `/api/ws/notifications/{user_id}`.
- Heartbeat ping/pong and interactive room subscription protocol.
- Telemetry endpoint for active connection monitoring.
- System broadcast REST endpoint for municipal alerts.
- Recent notification history endpoint for initial client state sync.
"""

import json
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel

from app.core.deps import require_roles
from app.core.websockets import ws_manager
from app.db import models
from app.db.models import UserRole

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ws", tags=["notifications"])
direct_ws_router = APIRouter(prefix="/ws", tags=["notifications"])


class SystemBroadcastRequest(BaseModel):
    title: str
    message: str
    event: str = "system_announcement"
    project_id: Optional[str] = None
    user_id: Optional[int] = None
    severity: str = "info"  # "info" | "warning" | "critical"


async def handle_websocket_session(
    websocket: WebSocket,
    user_id: Optional[int] = None,
    project_id: Optional[str] = None,
):
    """Core WebSocket event loop handling client messages and subscriptions."""
    current_user_id = user_id
    current_project_id = project_id

    await ws_manager.connect(websocket, user_id=current_user_id, project_id=current_project_id)
    try:
        while True:
            raw_data = await websocket.receive_text()
            # Handle text-based ping or JSON payloads
            if raw_data.strip() == "ping":
                await websocket.send_text(json.dumps({"event": "pong"}))
                continue

            try:
                msg = json.loads(raw_data)
            except Exception:
                # Raw text message
                continue

            action = msg.get("action") or msg.get("event")

            if action == "ping":
                await websocket.send_text(json.dumps({"event": "pong"}))
            elif action == "subscribe_project":
                sub_pid = msg.get("project_id") or msg.get("projectId")
                if sub_pid:
                    ws_manager.subscribe_project(websocket, sub_pid)
                    await websocket.send_text(
                        json.dumps({"event": "subscribed", "projectId": sub_pid})
                    )
            elif action == "unsubscribe_project":
                unsub_pid = msg.get("project_id") or msg.get("projectId")
                if unsub_pid:
                    ws_manager.unsubscribe_project(websocket, unsub_pid)
                    await websocket.send_text(
                        json.dumps({"event": "unsubscribed", "projectId": unsub_pid})
                    )
            elif action == "identify":
                ident_uid = msg.get("user_id") or msg.get("userId")
                if ident_uid:
                    current_user_id = int(ident_uid)
                    ws_manager.associate_user(websocket, current_user_id)
                    await websocket.send_text(
                        json.dumps({"event": "identified", "userId": current_user_id})
                    )

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, user_id=current_user_id, project_id=current_project_id)
    except Exception as exc:
        logger.warning(f"WebSocket session terminated with error: {exc}")
        ws_manager.disconnect(websocket, user_id=current_user_id, project_id=current_project_id)


@router.websocket("/notifications")
@direct_ws_router.websocket("/notifications")
async def websocket_notifications_query(
    websocket: WebSocket,
    user_id: Optional[int] = Query(None),
    project_id: Optional[str] = Query(None),
):
    """
    Real-time WebSocket endpoint parameterized via query strings:
    /api/ws/notifications?user_id=12&project_id=PW-2024-001
    """
    await handle_websocket_session(websocket, user_id=user_id, project_id=project_id)


@router.websocket("/notifications/{user_id}")
@direct_ws_router.websocket("/notifications/{user_id}")
async def websocket_notifications_path(
    websocket: WebSocket,
    user_id: int,
    project_id: Optional[str] = Query(None),
):
    """
    Real-time WebSocket endpoint with user_id in the URL path:
    /api/ws/notifications/12?project_id=PW-2024-001
    """
    await handle_websocket_session(websocket, user_id=user_id, project_id=project_id)


@router.get("/status")
def get_websocket_status():
    """Returns telemetry on active WebSocket connections and project rooms."""
    return {
        "status": "online",
        **ws_manager.get_stats(),
    }


@router.get("/history")
def get_notification_history(limit: int = Query(20, ge=1, le=100)):
    """Returns recent notification events for state hydration."""
    return ws_manager.get_recent_history(limit=limit)


@router.post("/broadcast")
def trigger_manual_broadcast(
    payload: SystemBroadcastRequest,
    current_user: models.User = Depends(require_roles(UserRole.admin, UserRole.engineer)),
):
    """Allows administrators to publish official municipal broadcast notices."""
    ws_manager.emit_event(
        event_type=payload.event,
        data={
            "title": payload.title,
            "message": payload.message,
            "severity": payload.severity,
            "sender": current_user.name,
            "role": current_user.role.value,
        },
        user_id=payload.user_id,
        project_id=payload.project_id,
        broadcast_global=(payload.user_id is None and payload.project_id is None),
    )
    return {"status": "broadcast_queued", "title": payload.title}
