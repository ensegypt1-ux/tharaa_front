import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "../auth/storage";
import { getAdminSocketUrl } from "./socketUrl";
import {
  ADMIN_SOCKET_EVENTS,
  type AdminOrderCreatedEvent,
  type SocketConnectionState,
} from "./types";
import type { Order } from "../types";

type OrderCreatedHandler = (payload: AdminOrderCreatedEvent) => void;
type OrderUpdatedHandler = (payload: Order) => void;
type StateHandler = (state: SocketConnectionState) => void;
type ReconnectedHandler = () => void;

let socket: Socket | null = null;
let connectionState: SocketConnectionState = "idle";
let intentionalDisconnect = false;
let listenersAttached = false;

const createdHandlers = new Set<OrderCreatedHandler>();
const updatedHandlers = new Set<OrderUpdatedHandler>();
const stateHandlers = new Set<StateHandler>();
const reconnectedHandlers = new Set<ReconnectedHandler>();

let stateNotifyScheduled = false;

function setState(next: SocketConnectionState) {
  if (connectionState === next) return;
  connectionState = next;
  if (stateNotifyScheduled) return;
  stateNotifyScheduled = true;
  queueMicrotask(() => {
    stateNotifyScheduled = false;
    const state = connectionState;
    stateHandlers.forEach((handler) => {
      try {
        handler(state);
      } catch {
        // ignore subscriber errors
      }
    });
  });
}

function notifyReconnected() {
  reconnectedHandlers.forEach((handler) => handler());
}

function attachListeners(instance: Socket) {
  if (listenersAttached) return;
  listenersAttached = true;

  instance.on("connect", () => {
    setState("connected");
  });

  instance.on("disconnect", () => {
    if (!intentionalDisconnect) {
      setState("disconnected");
    }
  });

  instance.on("connect_error", () => {
    if (!intentionalDisconnect) {
      setState("error");
    }
  });

  instance.io.on("reconnect", () => {
    setState("connected");
    notifyReconnected();
  });

  instance.on(ADMIN_SOCKET_EVENTS.ORDER_CREATED, (payload: AdminOrderCreatedEvent) => {
    createdHandlers.forEach((handler) => handler(payload));
  });

  instance.on(ADMIN_SOCKET_EVENTS.ORDER_UPDATED, (payload: Order) => {
    updatedHandlers.forEach((handler) => handler(payload));
  });
}

export function getAdminSocketState(): SocketConnectionState {
  return connectionState;
}

export function subscribeAdminSocketState(handler: StateHandler): () => void {
  stateHandlers.add(handler);
  return () => {
    stateHandlers.delete(handler);
  };
}

export function getAdminSocketStateSnapshot(): SocketConnectionState {
  return connectionState;
}

export function getAdminSocketStateServerSnapshot(): SocketConnectionState {
  return "idle";
}

export function onAdminOrderCreated(handler: OrderCreatedHandler): () => void {
  createdHandlers.add(handler);
  return () => {
    createdHandlers.delete(handler);
  };
}

export function onAdminOrderUpdated(handler: OrderUpdatedHandler): () => void {
  updatedHandlers.add(handler);
  return () => {
    updatedHandlers.delete(handler);
  };
}

export function onAdminSocketReconnected(handler: ReconnectedHandler): () => void {
  reconnectedHandlers.add(handler);
  return () => {
    reconnectedHandlers.delete(handler);
  };
}

export function connectAdminSocket(accessToken?: string): void {
  const token = accessToken ?? getAccessToken();
  if (!token) {
    disconnectAdminSocket();
    return;
  }

  intentionalDisconnect = false;

  if (socket?.connected) {
    socket.auth = { token };
    setState("connected");
    return;
  }

  if (socket) {
    socket.auth = { token };
    setState("connecting");
    socket.connect();
    return;
  }

  setState("connecting");
  socket = io(getAdminSocketUrl(), {
    auth: { token },
    transports: ["websocket"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
  });
  attachListeners(socket);
}

/** Force a reconnect with a fresh access token after JWT refresh. */
export function reconnectAdminSocketWithToken(accessToken: string): void {
  if (!accessToken) {
    disconnectAdminSocket();
    return;
  }

  intentionalDisconnect = false;

  if (!socket) {
    connectAdminSocket(accessToken);
    return;
  }

  socket.auth = { token: accessToken };
  setState("connecting");

  const onConnected = () => {
    setState("connected");
    notifyReconnected();
  };

  if (socket.connected) {
    socket.once("disconnect", () => {
      socket?.once("connect", onConnected);
      socket?.connect();
    });
    // Avoid permanent idle state; this disconnect is part of token rotation.
    intentionalDisconnect = true;
    socket.disconnect();
    intentionalDisconnect = false;
  } else {
    socket.once("connect", onConnected);
    socket.connect();
  }
}

export function disconnectAdminSocket(): void {
  intentionalDisconnect = true;
  if (socket) {
    socket.removeAllListeners();
    socket.io.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  listenersAttached = false;
  setState("idle");
}
