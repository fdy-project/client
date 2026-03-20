'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/lib/api';
import { logger } from '@/utils/logger';

function RootContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { accessToken, masterKey, isInitialized, setInitialized, restoreAuth } = useAuthStore();
    const [isMounted, setIsMounted] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const init = async () => {
            if (!isInitialized) {
                logger.log("🔍 [Root] Initializing session...");
                try {
                    // 1. Restore masterKey and accessToken from storage
                    await restoreAuth();
                    
                    // 2. Try to refresh session if needed
                    if (!useAuthStore.getState().accessToken) {
                        await authApi.refreshSession();
                    }
                    logger.log("✅ [Root] Session restored.");
                } catch (e) {
                    logger.log("ℹ️ [Root] No existing session found or refresh failed.");
                } finally {
                    setInitialized(true);
                }
            }
        };
        init();
    }, [isInitialized, setInitialized, restoreAuth]);

    useEffect(() => {
        // 모든 쿼리 파라미터 로깅 (디버깅용)
        const params: Record<string, string> = {};
        searchParams.forEach((v, k) => { params[k] = v; });
        logger.log("🔍 [Root] URL Params:", params);

        const authCodeId = searchParams.get('authCodeId');

        // authCodeId가 있고, 아직 토큰이 없으며, 처리 중이 아닐 때만 실행
        if (authCodeId && !accessToken && isInitialized && !isProcessing) {
            logger.log("🛫 [Root] Found authCodeId, exchanging for tokens...");
            setIsProcessing(true);
            authApi.exchangeOAuth2Token(authCodeId)
                .then(() => {
                    logger.log("✅ [Root] Token exchange successful.");
                    router.replace('/node');
                })
                .catch((err) => {
                    console.error("❌ [Root] Token exchange failed:", err);
                    router.replace('/auth/login');
                })
                .finally(() => {
                    setIsProcessing(false);
                });
            return;
        }

        // 초기화가 완료되었고, authCodeId 처리가 필요 없는 상태일 때의 리다이렉트
        if (isMounted && isInitialized && !isProcessing && !authCodeId) {
            if (accessToken && masterKey) {
                router.replace('/node');
            } else {
                router.replace('/auth/login');
            }
        }
    }, [isMounted, isInitialized, accessToken, masterKey, searchParams, isProcessing, router]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#FBFBFA]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-6 h-6 border-2 border-neutral-200 border-t-neutral-800 rounded-full animate-spin" />
                {isProcessing && <p className="text-neutral-500 text-sm font-medium animate-pulse">Securing your session...</p>}
            </div>
        </div>
    );
}

export default function RootPage() {
    return (
        <Suspense fallback={null}>
            <RootContent />
        </Suspense>
    );
}
