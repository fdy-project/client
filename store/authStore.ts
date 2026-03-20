import { create } from 'zustand';
import { importKeyFromBase64, exportKeyToBase64 } from '@/lib/crypto';
import { Storage } from "@plasmohq/storage"

const storage = new Storage({
    area: "local"
})

interface AuthState {
    accessToken: string | null;
    masterKey: CryptoKey | null;
    authMethod: string | null;
    isInitialized: boolean;
    setAccessToken: (token: string | null) => Promise<void>;
    setMasterKey: (key: CryptoKey | null) => Promise<void>;
    setAuthMethod: (method: string | null) => Promise<void>;
    setInitialized: (val: boolean) => void;
    clearAuth: () => Promise<void>;
    clearSession: () => Promise<void>;
    restoreAuth: () => Promise<void>;
    restoreMasterKey: () => Promise<void>;
    deleteAccount: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    accessToken: null,
    masterKey: null,
    authMethod: null,
    isInitialized: false,

    setAccessToken: async (token) => {
        set({ accessToken: token });
        if (token) {
            console.log("💾 [AuthStore] Saving AccessToken");
            await storage.set('fdy_access_token', token).catch(e => console.error("Storage set error", e));
            // Web Fallback
            if (typeof window !== 'undefined') localStorage.setItem('fdy_access_token', token);
        } else {
            await storage.remove('fdy_access_token');
            if (typeof window !== 'undefined') localStorage.removeItem('fdy_access_token');
        }
    },

    setMasterKey: async (key) => {
        set({ masterKey: key });
        if (key) {
            console.log("💾 [AuthStore] Exporting & Saving MasterKey");
            const b64 = await exportKeyToBase64(key);
            await storage.set('fdy_master_key', b64).catch(e => console.error("Storage set error", e));
            // Web Fallback
            if (typeof window !== 'undefined') localStorage.setItem('fdy_master_key', b64);
        } else {
            await storage.remove('fdy_master_key');
            if (typeof window !== 'undefined') localStorage.removeItem('fdy_master_key');
        }
    },

    setAuthMethod: async (method) => {
        set({ authMethod: method });
        if (method) {
            console.log("💾 [AuthStore] Saving AuthMethod");
            await storage.set('fdy_auth_method', method).catch(e => console.error("Storage set error", e));
            if (typeof window !== 'undefined') localStorage.setItem('fdy_auth_method', method);
        } else {
            await storage.remove('fdy_auth_method');
            if (typeof window !== 'undefined') localStorage.removeItem('fdy_auth_method');
        }
    },

    setInitialized: (val) => set({ isInitialized: val }),

    clearAuth: async () => {
        await storage.remove('fdy_master_key');
        await storage.remove('fdy_access_token');
        await storage.remove('fdy_auth_method');
        if (typeof window !== 'undefined') {
            localStorage.removeItem('fdy_master_key');
            localStorage.removeItem('fdy_access_token');
            localStorage.removeItem('fdy_auth_method');
        }
        set({ accessToken: null, masterKey: null, authMethod: null });
    },

    clearSession: async () => {
        await storage.remove('fdy_access_token');
        if (typeof window !== 'undefined') localStorage.removeItem('fdy_access_token');
        set({ accessToken: null });
    },

    restoreAuth: async () => {
        try {
            let cachedKey = await storage.get('fdy_master_key');
            let cachedToken = await storage.get('fdy_access_token');
            let cachedMethod = await storage.get('fdy_auth_method');

            // Web Fallback
            if (!cachedKey && typeof window !== 'undefined') cachedKey = localStorage.getItem('fdy_master_key') ?? undefined;
            if (!cachedToken && typeof window !== 'undefined') cachedToken = localStorage.getItem('fdy_access_token') ?? undefined;
            if (!cachedMethod && typeof window !== 'undefined') cachedMethod = localStorage.getItem('fdy_auth_method') ?? undefined;

            console.log("🔄 [AuthStore] Restoring session...", { 
                hasKey: !!cachedKey, 
                hasToken: !!cachedToken 
            });

            if (cachedKey) {
                const key = await importKeyFromBase64(cachedKey as string);
                set({ masterKey: key });
                console.log("✅ [AuthStore] MasterKey restored");
            }
            if (cachedToken) {
                set({ accessToken: cachedToken as string });
                console.log("✅ [AuthStore] AccessToken restored");
            }
            if (cachedMethod) {
                set({ authMethod: cachedMethod as string });
            }
        } catch (e) {
            console.error("❌ [AuthStore] Failed to restore session:", e);
        }
    },

    // Legacy method for backward compatibility if needed, but we should use restoreAuth
    restoreMasterKey: async () => {
        const cached = await storage.get<string>('fdy_master_key');
        if (cached) {
            try {
                const key = await importKeyFromBase64(cached);
                set({ masterKey: key });
            } catch (e) {
                console.error("Failed to restore master key", e);
            }
        }
    },

    deleteAccount: async () => {
        try {
            const { authApi } = await import('@/lib/api');
            await authApi.deleteMember();
            // Clear everything after successful deletion
            await get().clearAuth();
        } catch (e) {
            console.error("❌ [AuthStore] Failed to delete account:", e);
            throw e;
        }
    }
}));
