import { Socket, io } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(userId: string) {
    if (!socket) {
        socket = io(`${process.env.NEXT_PUBLIC_WS_URL!}/battle`, {
            transports: ["websocket"],
            auth: { userId },
            autoConnect: false,
        });
    }
    return socket;
}
