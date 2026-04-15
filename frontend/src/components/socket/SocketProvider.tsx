import { getSocket } from "@/lib/socket";
import { createContext, useEffect, useState } from "react";

export const SocketContext = createContext<{ connected: boolean } | null>(null);

export const SocketProvider = ({
    children,
    userId,
}: {
    children: React.ReactNode;
    userId: string;
}) => {
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        const socket = getSocket(userId);

        socket.connect();

        socket.on("connect", () => {
            setConnected(true);
            socket.emit("auth", { userId });
        });

        socket.on("disconnect", () => {
            setConnected(false);
        });

        return () => {
            socket.off("connect");
            socket.off("disconnect");
        };
    }, [userId]);

    return (
        <SocketContext.Provider value={{ connected }}>
            {children}
        </SocketContext.Provider>
    );
};
