'use client';

import React from 'react';
import { useAuth } from '@/hooks';
import { Loader2, Shield, Wallet } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
}

export const AuthGuard = ({ 
  children, 
  fallback,
  requireAuth = true 
}: AuthGuardProps) => {
  const { isAuthenticated, isConnected, isSigning, status } = useAuth();

  // Show loading while checking auth state
  if (status === 'idle' && isConnected === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
      </div>
    );
  }

  // If auth not required, just render children
  if (!requireAuth) {
    return <>{children}</>;
  }

  // Show connecting/signing state
  if (isSigning) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
        <div className="relative">
          <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full" />
          <Shield className="w-12 h-12 text-cyan-400 relative" />
        </div>
        <div className="text-center">
          <p className="text-white font-bold">Authenticating</p>
          <p className="text-gray-500 text-sm">Please sign the message in your wallet</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show fallback or default message
  if (!isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] gap-4 p-8">
        <div className="relative">
          <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full" />
          <Wallet className="w-12 h-12 text-yellow-400 relative" />
        </div>
        <div className="text-center max-w-md">
          <p className="text-white font-bold text-lg mb-2">Authentication Required</p>
          <p className="text-gray-500 text-sm">
            Please connect your wallet and sign the authentication message to access this feature.
          </p>
        </div>
      </div>
    );
  }

  // Authenticated - render children
  return <>{children}</>;
};

// Hook for protecting route-level components
export const useAuthGuard = () => {
  const { isAuthenticated, isConnected, signIn } = useAuth();

  return {
    isAuthenticated,
    isConnected,
    signIn,
    canAccess: isAuthenticated,
    requiresAuth: !isAuthenticated && isConnected,
  };
};
