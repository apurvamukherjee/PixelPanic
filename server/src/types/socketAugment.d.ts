import "socket.io";

declare module "socket.io" {
  interface SocketData {
    roomId?: string;
    anonId?: string;
  }
}
