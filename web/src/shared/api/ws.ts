import { type Socket, io } from "socket.io-client";

/**
 * Socket.IO singleton.
 * Manages connection lifecycle, auth, and reconnection.
 */

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(accessToken: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  // Disconnect existing socket if any
  if (socket) {
    socket.disconnect();
  }

  const wsUrl = import.meta.env.VITE_WS_URL || "http://localhost:3000";

  socket = io(`${wsUrl}/ws`, {
    auth: { token: accessToken },
    reconnection: true,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 30_000,
    reconnectionAttempts: Number.POSITIVE_INFINITY,
    transports: ["websocket", "polling"],
    autoConnect: true,
  });

  socket.on("connect", () => {
    console.log("[WS] Connected:", socket?.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("[WS] Disconnected:", reason);
  });

  socket.on("connect_error", (error) => {
    console.error("[WS] Connection error:", error.message);
  });

  socket.on("reconnect", (attempt) => {
    console.log("[WS] Reconnected after", attempt, "attempts");
    // Request sync of missed events
    socket?.emit("sync:request", {
      lastEventId: getLastEventId(),
    });
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function updateSocketAuth(accessToken: string): void {
  if (socket) {
    socket.auth = { token: accessToken };
    // Reconnect with new token to ensure backend accepts it
    if (socket.connected) {
      socket.disconnect();
    }
    socket.connect();
  }
}

/**
 * Get last event ID from localStorage for reconnect sync.
 */
function getLastEventId(): string | null {
  try {
    return localStorage.getItem("ponte-last-event-id");
  } catch {
    return null;
  }
}

/**
 * Store last event ID for reconnect sync.
 */
export function setLastEventId(eventId: string): void {
  try {
    localStorage.setItem("ponte-last-event-id", eventId);
  } catch {
    // localStorage may not be available
  }
}
