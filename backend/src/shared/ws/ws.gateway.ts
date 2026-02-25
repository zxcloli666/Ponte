import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Injectable } from "@nestjs/common";
import type { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import pino from "pino";

const logger = pino({ level: Deno.env.get("LOG_LEVEL") ?? "info" });

interface AuthPayload {
  sub: string;
  deviceType: "android" | "ios";
  deviceId?: string;
}

@WebSocketGateway({
  namespace: "/ws",
  transports: ["websocket", "polling"],
})
@Injectable()
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private connectedClients = new Map<string, Socket>();

  handleConnection(client: Socket): void {
    const token =
      (client.handshake.query["token"] as string) ??
      client.handshake.auth?.token;

    if (!token) {
      logger.warn({ socketId: client.id }, "Connection rejected: no token");
      client.disconnect(true);
      return;
    }

    try {
      const secret = Deno.env.get("JWT_ACCESS_SECRET") ?? "";
      const payload = jwt.verify(token, secret) as AuthPayload;

      client.data.userId = payload.sub;
      client.data.deviceType = payload.deviceType;
      client.data.deviceId = payload.deviceId;

      client.join(`user:${payload.sub}`);

      if (payload.deviceId) {
        client.join(`device:${payload.deviceId}`);
      }

      this.connectedClients.set(client.id, client);
      logger.info(
        { socketId: client.id, userId: payload.sub, deviceType: payload.deviceType },
        "Client connected",
      );
    } catch (err) {
      logger.warn({ socketId: client.id, error: (err as Error).message }, "JWT verification failed");
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.connectedClients.delete(client.id);
    logger.info({ socketId: client.id, userId: client.data.userId }, "Client disconnected");
  }

  @SubscribeMessage("ping")
  handlePing(@ConnectedSocket() client: Socket): void {
    client.emit("pong", { timestamp: Date.now() });
  }

  @SubscribeMessage("ack")
  handleAck(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ackId: string },
  ): void {
    logger.debug({ socketId: client.id, ackId: data.ackId }, "Ack received");
  }

  @SubscribeMessage("sync:request")
  handleSyncRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { lastEventId: string },
  ): void {
    logger.info(
      { socketId: client.id, userId: client.data.userId, lastEventId: data.lastEventId },
      "Sync requested",
    );
  }

  emitToUser(userId: string, event: string, data: unknown): void {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  emitToDevice(deviceId: string, event: string, data: unknown): void {
    this.server.to(`device:${deviceId}`).emit(event, data);
  }

  emitToRoom(room: string, event: string, data: unknown): void {
    this.server.to(room).emit(event, data);
  }
}
