'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { logger } from '@/utils/logger';

export default function AuthProvider({ children }: { children: ReactNode }) {
    const { accessToken, isInitialized, setAccessToken, setInitialized, restoreAuth, clearAuth } = useAuthStore();
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        const initAuth = async () => {
            if (isInitialized) return;

            // 1. Restore both MasterKey and AccessToken from storage
            await restoreAuth();

            // 2. If no accessToken or it might be expired, try to refresh using cookie
            // Note: We try to refresh even if we have an accessToken from storage, 
            // just to ensure we have a fresh one if possible. 
            // But for now, let's only refresh if we DON'T have one to keep it simple.
            if (!useAuthStore.getState().accessToken) {
                setIsRefreshing(true);
                try {
                    const newToken = await authApi.refreshSession();
                    if (newToken) {
                        await setAccessToken(newToken);
                        await authApi.getMe();
                    }
                } catch (err) {
                    logger.log("Initial refresh failed, likely no refresh_token cookie or it's expired.");
                } finally {
                    setIsRefreshing(false);
                }
            }

            setInitialized(true);
        };

        initAuth();
    }, [isInitialized, setAccessToken, setInitialized, restoreAuth]);

    if (!isInitialized || isRefreshing) {
        return (
            <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-50">
                <Loader2 className="animate-spin text-[#37352F] mb-4" size={32} />
                <p className="text-sm text-[#666] font-medium animate-pulse">Initializing Workspace...</p>
            </div>
        );
    }

    return <>{children}</>;
}
