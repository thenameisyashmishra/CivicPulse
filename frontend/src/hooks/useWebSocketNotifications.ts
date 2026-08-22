/*
 * CivicPulse — Live WebSocket Notification Hook
 * Connects to the backend WebSocket stream with auto-reconnect, fallback URL discovery,
 * and toast dispatching on incoming real-time municipal events.
 */

import { useEffect, useCallback, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { getSavedUser } from "@/lib/data";

export type NotificationSeverity = "info" | "success" | "warning" | "error" | "critical";

export type NotificationEventType =
  | "evidence_uploaded"
  | "vote_cast"
  | "vote_tally_updated"
  | "review_decided"
  | "approval_step_progression"
  | "project_created"
  | "project_status_changed"
  | "project_deleted"
  | "system_announcement"
  | (string & {});

export interface NotificationItem {
  id: string;
  eventType: NotificationEventType;
  title: string;
  message: string;
  projectId?: string;
  projectName?: string;
  evidenceId?: number | string;
  userId?: number | string;
  severity: NotificationSeverity;
  timestamp: string; // ISO string
  read: boolean;
  data?: Record<string, any>;
}

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export interface WebSocketHookOptions {
  url?: string;
  projectId?: string;
  userId?: number;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  enableToasts?: boolean;
}

export interface WebSocketHookReturn {
  notifications: NotificationItem[];
  unreadCount: number;
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  removeNotification: (id: string) => void;
  addNotification: (item: Omit<NotificationItem, "id" | "timestamp" | "read"> & Partial<NotificationItem>) => void;
  subscribeProject: (projectId: string) => void;
  unsubscribeProject: (projectId: string) => void;
  reconnect: () => void;
}

// ─── Default Seed Notifications ──────────────────────────────────────────────
const DEFAULT_SEED_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "seed-1",
    eventType: "system_announcement",
    title: "PW-2024-002: Budget overrun detected (+16%)",
    message: "Expenditure has exceeded the approved quarterly allocation milestone.",
    projectId: "PW-2024-002",
    severity: "critical",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    read: false,
  },
  {
    id: "seed-2",
    eventType: "project_status_changed",
    title: "PW-2024-004: Site inactive for 14+ days",
    message: "No geotagged evidence or contractor activity reported in over two weeks.",
    projectId: "PW-2024-004",
    severity: "warning",
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    read: false,
  },
  {
    id: "seed-3",
    eventType: "evidence_uploaded",
    title: "VR-005: Verification pending — awaiting upload",
    message: "Site engineer inspection scheduled for drone survey confirmation.",
    projectId: "PW-2024-005",
    severity: "info",
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    read: false,
  },
];

// ─── Shared Global Store for WebSocket & Notifications ───────────────────────
class NotificationStore {
  private notifications: NotificationItem[] = [];
  private listeners = new Set<() => void>();
  private ws: WebSocket | null = null;
  private connectionStatus: ConnectionStatus = "disconnected";
  private reconnectTimeout: number | null = null;
  private pingInterval: number | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 20;
  private candidateIndex = 0;
  private activeSubscriptions = new Set<string>();
  private hydratedFromHistory = false;
  private cachedSnapshot: {
    notifications: NotificationItem[];
    connectionStatus: ConnectionStatus;
    isConnected: boolean;
    unreadCount: number;
  } | null = null;

  constructor() {
    // Load persisted notifications if available, otherwise use seed alerts
    try {
      const saved = localStorage.getItem("cp_notifications");
      if (saved) {
        this.notifications = JSON.parse(saved);
      } else {
        this.notifications = [...DEFAULT_SEED_NOTIFICATIONS];
      }
    } catch {
      this.notifications = [...DEFAULT_SEED_NOTIFICATIONS];
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.cachedSnapshot = null;
    this.persist();
    for (const listener of this.listeners) {
      listener();
    }
  }

  private persist() {
    try {
      localStorage.setItem("cp_notifications", JSON.stringify(this.notifications.slice(0, 50)));
    } catch {
      // Ignore storage quota errors
    }
  }

  public getSnapshot = () => {
    if (!this.cachedSnapshot) {
      this.cachedSnapshot = {
        notifications: this.notifications,
        connectionStatus: this.connectionStatus,
        isConnected: this.connectionStatus === "connected",
        unreadCount: this.notifications.filter((n) => !n.read).length,
      };
    }
    return this.cachedSnapshot;
  };

  public markAsRead(id: string) {
    this.notifications = this.notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    this.notify();
  }

  public markAllAsRead() {
    this.notifications = this.notifications.map((n) => ({ ...n, read: true }));
    this.notify();
  }

  public clearNotifications() {
    this.notifications = [];
    this.notify();
  }

  public removeNotification(id: string) {
    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.notify();
  }

  public addNotification(
    item: Omit<NotificationItem, "id" | "timestamp" | "read"> & Partial<NotificationItem>,
    triggerToast: boolean = true
  ) {
    const newNotification: NotificationItem = {
      id: item.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      eventType: item.eventType || "system_announcement",
      title: item.title,
      message: item.message,
      projectId: item.projectId,
      projectName: item.projectName,
      evidenceId: item.evidenceId,
      userId: item.userId,
      severity: item.severity || "info",
      timestamp: item.timestamp || new Date().toISOString(),
      read: item.read ?? false,
      data: item.data,
    };

    // Avoid exact duplicate IDs
    this.notifications = [
      newNotification,
      ...this.notifications.filter((n) => n.id !== newNotification.id),
    ].slice(0, 50);

    this.notify();

    if (triggerToast) {
      this.dispatchToast(newNotification);
    }
  }

  private dispatchToast(notif: NotificationItem) {
    const description = notif.message;
    const title = notif.title;

    switch (notif.severity) {
      case "success":
        toast.success(title, { description, duration: 5000 });
        break;
      case "critical":
      case "error":
        toast.error(title, { description, duration: 6000 });
        break;
      case "warning":
        toast.warning(title, { description, duration: 5000 });
        break;
      case "info":
      default:
        toast.info(title, { description, duration: 5000 });
        break;
    }
  }

  public connect(customUrl?: string) {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.connectionStatus = "connecting";
    this.notify();

    // Fetch initial history if not already hydrated
    if (!this.hydratedFromHistory) {
      this.hydrateHistory();
    }

    const wsUrl = this.resolveWebSocketUrl(customUrl);

    try {
      const socket = new WebSocket(wsUrl);
      this.ws = socket;

      socket.onopen = () => {
        this.connectionStatus = "connected";
        this.reconnectAttempts = 0;
        this.candidateIndex = 0;
        this.notify();

        // Start heartbeat ping
        this.startPing();

        // Resubscribe to any active project rooms
        for (const pid of this.activeSubscriptions) {
          this.sendSocketMessage({ action: "subscribe_project", project_id: pid });
        }

        // Identify current user if authenticated
        const currentUser = getSavedUser();
        if (currentUser && (currentUser as any).id) {
          this.sendSocketMessage({ action: "identify", user_id: (currentUser as any).id });
        }
      };

      socket.onmessage = (event) => {
        try {
          const raw = typeof event.data === "string" ? event.data : "";
          if (raw.trim() === "pong" || raw.trim() === "ping") return;

          const parsed = JSON.parse(raw);
          this.handleIncomingMessage(parsed);
        } catch {
          // Non-JSON message, ignore
        }
      };

      socket.onerror = () => {
        this.connectionStatus = "error";
        this.notify();
      };

      socket.onclose = () => {
        this.stopPing();
        this.ws = null;
        this.connectionStatus = "disconnected";
        this.notify();

        // Rotate candidate URL on failure
        this.candidateIndex++;
        this.scheduleReconnect(customUrl);
      };
    } catch {
      this.connectionStatus = "error";
      this.notify();
      this.scheduleReconnect(customUrl);
    }
  }

  private scheduleReconnect(customUrl?: string) {
    if (this.reconnectTimeout) {
      window.clearTimeout(this.reconnectTimeout);
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    // Exponential backoff with ceiling at 15s
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 15000);

    this.reconnectTimeout = window.setTimeout(() => {
      this.connect(customUrl);
    }, delay);
  }

  private resolveWebSocketUrl(customUrl?: string): string {
    if (customUrl) return customUrl;

    const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
    const protocol = isSecure ? "wss:" : "ws:";
    const host = typeof window !== "undefined" ? window.location.host : "localhost:3000";
    const isDevPort = host.includes(":3000");

    // Candidate URL paths with fallbacks
    const candidateUrls: string[] = [];

    if (isDevPort) {
      // Direct backend connection candidates for local Vite dev
      candidateUrls.push(`${protocol}//localhost:8000/ws/notifications`);
      candidateUrls.push(`${protocol}//localhost:8000/api/ws/notifications`);
      candidateUrls.push(`${protocol}//${host}/ws/notifications`);
      candidateUrls.push(`${protocol}//${host}/api/ws/notifications`);
    } else {
      // Same-origin candidates for staging / production / proxies
      candidateUrls.push(`${protocol}//${host}/ws/notifications`);
      candidateUrls.push(`${protocol}//${host}/api/ws/notifications`);
      candidateUrls.push(`${protocol}//localhost:8000/ws/notifications`);
    }

    const selectedUrl = candidateUrls[this.candidateIndex % candidateUrls.length];
    return selectedUrl;
  }

  private handleIncomingMessage(msg: Record<string, any>) {
    const eventType = msg.event || msg.event_type || msg.type || msg.action;

    // Ignore protocol control responses
    if (
      !eventType ||
      eventType === "pong" ||
      eventType === "subscribed" ||
      eventType === "unsubscribed" ||
      eventType === "identified"
    ) {
      return;
    }

    const data = msg.data || {};
    const title =
      msg.title ||
      data.title ||
      this.deriveTitle(eventType, data, msg.projectId || data.project_id);

    const message =
      msg.message ||
      data.message ||
      this.deriveMessage(eventType, data, msg.projectId || data.project_id);

    const projectId = msg.projectId || msg.project_id || data.project_id || data.projectId;
    const projectName = data.project_name || data.name;
    const evidenceId = msg.evidenceId || data.evidence_id || data.evidenceId;
    const userId = msg.userId || data.user_id || data.userId;
    const severity = this.normalizeSeverity(msg.severity || data.severity, eventType, data);
    const timestamp = msg.timestamp || new Date().toISOString();

    this.addNotification({
      id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      eventType,
      title,
      message,
      projectId,
      projectName,
      evidenceId,
      userId,
      severity,
      timestamp,
      data,
    });
  }

  private normalizeSeverity(
    rawSeverity: any,
    eventType: string,
    data: Record<string, any>
  ): NotificationSeverity {
    if (rawSeverity === "critical" || rawSeverity === "error") return "critical";
    if (rawSeverity === "warning") return "warning";
    if (rawSeverity === "success") return "success";
    if (rawSeverity === "info") return "info";

    // Infer severity by event characteristics
    if (eventType === "review_decided" || eventType === "approval_step_progression") {
      const decision = (data.decision || "").toLowerCase();
      const status = (data.new_status || data.status || "").toLowerCase();
      if (decision === "approved" || status === "verified") return "success";
      if (decision === "rejected" || status === "failed" || status === "flagged") return "critical";
      if (decision === "escalated" || status === "delayed") return "warning";
      return "info";
    }

    if (eventType === "project_deleted") return "critical";
    if (eventType === "evidence_uploaded") return "info";
    if (eventType === "vote_cast" || eventType === "vote_tally_updated") return "info";
    if (eventType === "project_created") return "success";

    return "info";
  }

  private deriveTitle(eventType: string, _data: Record<string, any>, projectId?: string): string {
    const pid = projectId ? ` [${projectId}]` : "";
    switch (eventType) {
      case "evidence_uploaded":
        return `New Evidence Uploaded${pid}`;
      case "vote_cast":
      case "vote_tally_updated":
        return `Citizen Vote Recorded${pid}`;
      case "review_decided":
      case "approval_step_progression":
        return `Verification Review Decision${pid}`;
      case "project_created":
        return `New Project Created${pid}`;
      case "project_status_changed":
        return `Project Status Updated${pid}`;
      case "project_deleted":
        return `Project Removed${pid}`;
      default:
        return "Municipal Alert";
    }
  }

  private deriveMessage(eventType: string, data: Record<string, any>, _projectId?: string): string {
    if (eventType === "evidence_uploaded") {
      return `New geotagged field evidence was submitted for review.`;
    }
    if (eventType === "vote_cast" || eventType === "vote_tally_updated") {
      const total = data.total_votes ? ` (Total: ${data.total_votes})` : "";
      return `A citizen voted on evidence verification tally${total}.`;
    }
    if (eventType === "review_decided" || eventType === "approval_step_progression") {
      const dec = data.decision ? `Decision: ${data.decision}.` : "";
      return `Multi-tier governance review step progressed. ${dec}`.trim();
    }
    return "Real-time municipal event broadcast received.";
  }

  private async hydrateHistory() {
    this.hydratedFromHistory = true;
    try {
      const res = await fetch("/api/ws/history?limit=15");
      if (res.ok) {
        const history = (await res.json()) as Array<Record<string, any>>;
        if (Array.isArray(history) && history.length > 0) {
          const historicalItems: NotificationItem[] = history.map((item, idx) => {
            const data = item.data || {};
            const eventType = item.event || item.event_type || "system_announcement";
            return {
              id: `hist-${idx}-${item.timestamp || Date.now()}`,
              eventType,
              title: item.title || data.title || this.deriveTitle(eventType, data, item.projectId),
              message: item.message || data.message || this.deriveMessage(eventType, data, item.projectId),
              projectId: item.projectId || data.project_id,
              projectName: data.project_name || data.name,
              evidenceId: item.evidenceId || data.evidence_id,
              userId: item.userId || data.user_id,
              severity: this.normalizeSeverity(item.severity || data.severity, eventType, data),
              timestamp: item.timestamp || new Date().toISOString(),
              read: true, // Mark older historical items as read
              data,
            };
          });

          // Merge without duplicating existing IDs
          const existingIds = new Set(this.notifications.map((n) => n.id));
          const uniqueNew = historicalItems.filter((h) => !existingIds.has(h.id));
          if (uniqueNew.length > 0) {
            this.notifications = [...this.notifications, ...uniqueNew].slice(0, 50);
            this.notify();
          }
        }
      }
    } catch {
      // Historical hydration is best effort
    }
  }

  public subscribeProject(projectId: string) {
    if (!projectId) return;
    this.activeSubscriptions.add(projectId);
    this.sendSocketMessage({ action: "subscribe_project", project_id: projectId });
  }

  public unsubscribeProject(projectId: string) {
    if (!projectId) return;
    this.activeSubscriptions.delete(projectId);
    this.sendSocketMessage({ action: "unsubscribe_project", project_id: projectId });
  }

  public sendSocketMessage(payload: Record<string, any>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  private startPing() {
    this.stopPing();
    this.pingInterval = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ action: "ping" }));
      }
    }, 25000);
  }

  private stopPing() {
    if (this.pingInterval) {
      window.clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}

// Global Singleton Instance
const globalNotificationStore = new NotificationStore();

// ─── Relative Time Helper ───────────────────────────────────────────────────
export function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 45) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  } catch {
    return "Recent";
  }
}

// ─── React Hook Export ──────────────────────────────────────────────────────
export function useWebSocketNotifications(
  options: WebSocketHookOptions = {}
): WebSocketHookReturn {
  const store = globalNotificationStore;
  const storeState = useSyncExternalStore(
    store.subscribe.bind(store),
    store.getSnapshot,
    store.getSnapshot
  );

  const { url, projectId } = options;

  useEffect(() => {
    // Initiate connection on mount
    store.connect(url);

    if (projectId) {
      store.subscribeProject(projectId);
      return () => {
        store.unsubscribeProject(projectId);
      };
    }
  }, [url, projectId]);

  const markAsRead = useCallback((id: string) => {
    store.markAsRead(id);
  }, []);

  const markAllAsRead = useCallback(() => {
    store.markAllAsRead();
  }, []);

  const clearNotifications = useCallback(() => {
    store.clearNotifications();
  }, []);

  const removeNotification = useCallback((id: string) => {
    store.removeNotification(id);
  }, []);

  const addNotification = useCallback(
    (item: Omit<NotificationItem, "id" | "timestamp" | "read"> & Partial<NotificationItem>) => {
      store.addNotification(item, options.enableToasts ?? true);
    },
    [options.enableToasts]
  );

  const subscribeProject = useCallback((pid: string) => {
    store.subscribeProject(pid);
  }, []);

  const unsubscribeProject = useCallback((pid: string) => {
    store.unsubscribeProject(pid);
  }, []);

  const reconnect = useCallback(() => {
    store.connect(url);
  }, [url]);

  return {
    notifications: storeState.notifications,
    unreadCount: storeState.unreadCount,
    isConnected: storeState.isConnected,
    connectionStatus: storeState.connectionStatus,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    removeNotification,
    addNotification,
    subscribeProject,
    unsubscribeProject,
    reconnect,
  };
}
