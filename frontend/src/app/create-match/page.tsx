"use client";

import React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { CreateMatch } from "@/components/create-match/CreateMatch";
import { LaserBackground } from "@/components/ui/effects/LaserBackground";
import { Matching } from "@/components/create-match/Matching";
import { ConnectWalletButton } from "@/components/wallet/ConnectWalletButton";
import { SocketProvider } from "@/components/socket/SocketProvider";

export default function CreateMatchPage() {
    const userId = "user-id-placeholder";

    return (
        <SocketProvider userId={userId}>
            <div className="min-h-screen bg-black text-white">
                <LaserBackground intensity={0.4} />
                <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_90%)] z-0 pointer-events-none" />

                <PageHeader
                    title="Create a New Match"
                    backUrl="/"
                    showNetworkStatus
                    rightContent={<ConnectWalletButton variant="page" />}
                />

                <div className="flex flex-col max-w-[900px] mx-auto gap-6 p-6">
                    <CreateMatch />
                    <Matching />
                </div>
            </div>
        </SocketProvider>
    );
}
