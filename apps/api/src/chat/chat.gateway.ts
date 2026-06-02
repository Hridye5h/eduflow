import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

type AuthedSocket = Socket & { data: { userId: string; schoolId: string; role: string } };

@WebSocketGateway({ namespace: '/chat', cors: { origin: true, credentials: true } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger(ChatGateway.name);

  constructor(private jwt: JwtService, private chat: ChatService) {}

  async handleConnection(client: AuthedSocket) {
    try {
      const token =
        (client.handshake.auth as any)?.token ||
        (client.handshake.headers['authorization'] as string)?.replace(/^Bearer /, '');
      if (!token) return client.disconnect(true);
      const payload: any = await this.jwt.verifyAsync(token);
      client.data.userId = payload.sub;
      client.data.schoolId = payload.schoolId;
      client.data.role = payload.role;
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(_client: AuthedSocket) {}

  @SubscribeMessage('joinGroup')
  joinGroup(@ConnectedSocket() client: AuthedSocket, @MessageBody() groupId: string) {
    client.join(`group:${groupId}`);
    return { joined: groupId };
  }

  @SubscribeMessage('leaveGroup')
  leave(@ConnectedSocket() client: AuthedSocket, @MessageBody() groupId: string) {
    client.leave(`group:${groupId}`);
    return { left: groupId };
  }

  @SubscribeMessage('sendMessage')
  async send(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { groupId: string; body: string },
  ) {
    const msg = await this.chat.send(client.data.schoolId, data.groupId, client.data.userId, data.body);
    this.server.to(`group:${data.groupId}`).emit('message', msg);
    return msg;
  }
}
