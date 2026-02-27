"use client";

import React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { CreateMatch } from "@/components/create-match/CreateMatch";
import { LaserBackground } from "@/components/ui/effects/LaserBackground";
import { Matching } from "@/components/create-match/Matching";
import { ConnectWalletButton } from "@/components/wallet/ConnectWalletButton";
import { SocketProvider } from "@/components/socket/SocketProvider";
import { useMatching } from "@/hooks/useMatching";

export default function CreateMatchPage() {
    const userId = "user-id-placeholder"; // Replace with actual user ID from authentication

    // socket connect from create to end (matching -> match found -> match start -> match end)
    return (
        <SocketProvider userId={userId}>
            <div className="min-h-screen bg-black text-white">
                {/* BACKGROUND */}
                <LaserBackground intensity={0.4} />
                <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_90%)] z-0 pointer-events-none" />

            {/* HEADER */}
            <PageHeader
                title="Create a New Match"
                backUrl="/"
                showNetworkStatus
                rightContent={<ConnectWalletButton variant="page" />}
            />

            {/* MAIN CONTENT */}
            <div className="flex flex-col max-w-[900px] mx-auto gap-6 p-6">
                <CreateMatch
                    matching={matching}
                    addPlayer={addPlayer}
                    removePlayer={removePlayer}
                />

                {/* MAIN CONTENT */}
                <div className="flex flex-col max-w-[900px] mx-auto gap-6 p-6">
                    <CreateMatch />

                    <Matching />
                </div>
            </div>
        </SocketProvider>
    );
}
