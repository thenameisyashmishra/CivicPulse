"""
WebSocket Connection Manager & Real-Time Broadcast Hub for CivicPulse.

Features:
- High-concurrency async WebSocket connection multiplexing.
- Room subscriptions by Project ID, User ID, and Global broadcast.
- Dynamic runtime subscription and unsubscription to project channels.
- Thread-safe and async-safe event dispatcher for synchronous route handlers.
- Instant push broadcast on review approvals, evidence submissions, vote tallies, and project status changes.
- Ring buffer for recent notification history.
"""

import asyncio
from collections import deque
from datetime import datetime, timezone
import json
import logging
from typing import Any, Dict, List, Optional, Set

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    High-concurrency Connection Manager for real-time WebSocket communication.
    Supports user multiplexing, dynamic project room subscriptions, and global alerts.
    """

    def __init__(self, history_limit: int = 50):
        # Maps user_id -> Set of active WebSockets (supports multiple tabs / devices)
        self.user_connections: Dict[int, Set[WebSocket]] = {}
        # Maps project_id -> Set of active WebSockets subscribed to project updates
        self.project_rooms: Dict[str, Set[WebSocket]] = {}
        # All global active WebSockets
        self.active_connections: Set[WebSocket] = set()
        # Ring buffer for recent notifications
        self._history: deque[Dict[str, Any]] = deque(maxlen=history_limit)
        # Event loop reference for worker-thread dispatching
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def set_event_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        """Register the main event loop for thread-safe cross-thread broadcasts."""
        self._loop = loop

    async def connect(
        self,
        websocket: WebSocket,
        user_id: Optional[int] = None,
        project_id: Optional[str] = None,
    ) -> None:
        """Accepts and registers a new WebSocket connection."""
        await websocket.accept()
        self.active_connections.add(websocket)

        # Capture current running loop if not already set
        if self._loop is None or not self._loop.is_running():
            try:
                self._loop = asyncio.get_running_loop()
            except RuntimeError:
                pass

        if user_id is not None:
            if user_id not in self.user_connections:
                self.user_connections[user_id] = set()
            self.user_connections[user_id].add(websocket)

        if project_id is not None:
            if project_id not in self.project_rooms:
                self.project_rooms[project_id] = set()
            self.project_rooms[project_id].add(websocket)

        logger.info(
            f"WebSocket client connected (User: {user_id}, Project: {project_id}). "
            f"Active connections: {len(self.active_connections)}"
        )

    def disconnect(
        self,
        websocket: WebSocket,
        user_id: Optional[int] = None,
        project_id: Optional[str] = None,
    ) -> None:
        """Removes a WebSocket connection and cleans up room mappings."""
        self.active_connections.discard(websocket)

        if user_id is not None and user_id in self.user_connections:
            self.user_connections[user_id].discard(websocket)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
        else:
            # Clean up across all user buckets if user_id was omitted
            for uid in list(self.user_connections.keys()):
                self.user_connections[uid].discard(websocket)
                if not self.user_connections[uid]:
                    del self.user_connections[uid]

        if project_id is not None and project_id in self.project_rooms:
            self.project_rooms[project_id].discard(websocket)
            if not self.project_rooms[project_id]:
                del self.project_rooms[project_id]
        else:
            # Clean up across all project rooms
            for pid in list(self.project_rooms.keys()):
                self.project_rooms[pid].discard(websocket)
                if not self.project_rooms[pid]:
                    del self.project_rooms[pid]

        logger.info(f"WebSocket client disconnected. Total active: {len(self.active_connections)}")

    def subscribe_project(self, websocket: WebSocket, project_id: str) -> None:
        """Subscribes an existing connection to a project room."""
        if project_id not in self.project_rooms:
            self.project_rooms[project_id] = set()
        self.project_rooms[project_id].add(websocket)
        logger.debug(f"Socket subscribed to project room {project_id}")

    def unsubscribe_project(self, websocket: WebSocket, project_id: str) -> None:
        """Unsubscribes a connection from a project room."""
        if project_id in self.project_rooms:
            self.project_rooms[project_id].discard(websocket)
            if not self.project_rooms[project_id]:
                del self.project_rooms[project_id]
            logger.debug(f"Socket unsubscribed from project room {project_id}")

    def associate_user(self, websocket: WebSocket, user_id: int) -> None:
        """Associates a connection with a user ID dynamically."""
        if user_id not in self.user_connections:
            self.user_connections[user_id] = set()
        self.user_connections[user_id].add(websocket)

    async def broadcast_to_user(self, user_id: int, message: Dict[str, Any]) -> None:
        """Sends a real-time notification to a specific user across all their devices."""
        if user_id in self.user_connections:
            dead_sockets = set()
            payload = json.dumps(message)
            for connection in list(self.user_connections[user_id]):
                try:
                    await connection.send_text(payload)
                except Exception:
                    dead_sockets.add(connection)
            for dead in dead_sockets:
                self.disconnect(dead, user_id=user_id)

    async def broadcast_to_project(self, project_id: str, message: Dict[str, Any]) -> None:
        """Sends a real-time update to all citizens / reviewers viewing a specific project."""
        if project_id in self.project_rooms:
            dead_sockets = set()
            payload = json.dumps(message)
            for connection in list(self.project_rooms[project_id]):
                try:
                    await connection.send_text(payload)
                except Exception:
                    dead_sockets.add(connection)
            for dead in dead_sockets:
                self.disconnect(dead, project_id=project_id)

    async def broadcast_global(self, message: Dict[str, Any]) -> None:
        """Broadcasts global municipal alerts or project updates to all connected clients."""
        dead_sockets = set()
        payload = json.dumps(message)
        for connection in list(self.active_connections):
            try:
                await connection.send_text(payload)
            except Exception:
                dead_sockets.add(connection)
        for dead in dead_sockets:
            self.disconnect(dead)

    def emit_event(
        self,
        event_type: str,
        data: Dict[str, Any],
        user_id: Optional[int] = None,
        project_id: Optional[str] = None,
        broadcast_global: bool = False,
    ) -> None:
        """
        Thread-safe & async-safe event dispatcher that can be called from
        both synchronous endpoints (running in threadpool) and async endpoints.
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        message: Dict[str, Any] = {
            "event": event_type,
            "data": data,
            "timestamp": now_iso,
        }

        # Expose top-level fields for fast frontend consumption
        if "title" in data:
            message["title"] = data["title"]
        if "message" in data:
            message["message"] = data["message"]
        if project_id:
            message["projectId"] = project_id
        if user_id:
            message["userId"] = user_id
        if "evidence_id" in data:
            message["evidenceId"] = data["evidence_id"]

        # Record into recent history
        self._history.appendleft(message)

        async def _do_broadcast():
            tasks = []
            if broadcast_global or (user_id is None and project_id is None):
                tasks.append(self.broadcast_global(message))
            if project_id:
                tasks.append(self.broadcast_to_project(project_id, message))
            if user_id:
                tasks.append(self.broadcast_to_user(user_id, message))
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)

        try:
            loop = asyncio.get_running_loop()
            loop.create_task(_do_broadcast())
        except RuntimeError:
            # Called from a worker thread in threadpool
            if self._loop and self._loop.is_running():
                asyncio.run_coroutine_threadsafe(_do_broadcast(), self._loop)
            else:
                try:
                    # Fallback if loop is not running yet
                    asyncio.run(_do_broadcast())
                except Exception as exc:
                    logger.debug(f"Broadcast dispatch skipped (no active loop): {exc}")

    def get_recent_history(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Returns the most recent broadcast notifications."""
        return list(self._history)[:limit]

    def get_stats(self) -> Dict[str, Any]:
        """Returns real-time connection telemetry stats."""
        return {
            "active_connections": len(self.active_connections),
            "active_users": len(self.user_connections),
            "active_project_rooms": len(self.project_rooms),
            "project_room_ids": list(self.project_rooms.keys()),
        }


# Singleton ConnectionManager instance
ws_manager = ConnectionManager()
