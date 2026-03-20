import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/authStore';
import { components } from '@/src/types/api';
import { logger } from '@/utils/logger';

type Schema = components["schemas"];

/**
 * API Response Utility Types
 */
type ExtractData<T> = T extends { data: infer D } ? D : void;

// Auth Types
export type LoginRequest = Schema["MemberLoginRequest"];
export type LoginInitRequest = Schema["MemberLoginInitRequest"];
export type LoginInitResponse = ExtractData<Schema["LoginInitResponse"]>;
export type RecoveryInitRequest = Schema["MemberRecoveryInitRequest"];
export type RecoveryInitResponse = ExtractData<Schema["MemberRecoveryInitResponse"]>;
export type RecoveryRequest = Schema["MemberRecoveryRequest"];
export type RecoveryResponse = ExtractData<Schema["MemberRecoveryResponse"]>;
export type SignupRequest = Schema["MemberCreateRequest"];
export type LoginResponse = ExtractData<Schema["MemberLoginResponse"]>;
export type MeResponse = ExtractData<Schema["MemberMeResponse"]>;

// Node Types
export type NodeTreeResponse = ExtractData<Schema["NodeTreeResponse"]>;
export type NodeDetailResponse = ExtractData<Schema["NodeFileResponse"]>;
export type AddNodeRequest = Schema["NodeCreateRequest"];
export type UpdateNodeTitleRequest = Schema["NodeTitleUpdateRequest"];
export type MoveNodeRequest = Schema["NodeMoveRequest"];
export type AddNodeContentsRequest = Schema["NodeContentCreateRequest"];
export type AddNodeContentsResponse = ExtractData<Schema["NodeContentCreateResponse"]>;
export type UpdateNodeContentsRequest = Schema["NodeContentBatchUpdateRequest"];
export type DeleteNodeContentsRequest = Schema["NodeContentDeleteRequest"];

const BASE_URL = process.env.PLASMO_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const api = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true, // For session cookies
});

// Request Interceptor: Attach Access Token & Logging
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token && !config.url?.includes('/auth/refresh')) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    
    // [Request Logging] 서버로 나가는 데이터 확인
    logger.log(`\n🚀 [API REQUEST] ${config.method?.toUpperCase()} ${config.url}`);
    if (config.data) {
        logger.log(`📦 Payload:`, JSON.stringify(config.data, null, 2));
    }
    
    return config;
});

// Response Interceptor: Handle 401 & Token Refresh + Global Logging
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) prom.reject(error);
        else prom.resolve(token);
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => {
        const { method, url } = response.config;
        logger.log(`\n✅ [API SUCCESS] ${method?.toUpperCase()} ${url}`);
        logger.log(`🟢 Status: ${response.status} ${response.statusText}`);
        
        if (response.data) {
            logger.log(`📄 Response Data:`, JSON.stringify(response.data, null, 2));
        } else {
            logger.log(`📄 Response Data: (Empty)`);
        }
        
        return response;
    },
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // [Global Logging] 에러 발생 시 출력
        const method = originalRequest?.method?.toUpperCase();
        const url = originalRequest?.url;
        console.error(`\n❌ [API ERROR] ${method} ${url}`);
        
        if (error.response) {
            console.error(`🔴 Status: ${error.response.status} ${error.response.statusText}`);
            console.error(`📂 Headers:`, error.response.headers);
            console.error(`📄 Response Data (Body):`, JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.error(`⚠️ No response received. Request was:`, error.request);
        } else {
            console.error(`⚠️ Request setup error: ${error.message}`);
        }
        
        console.error(`🔍 Full Error Object:`, error);

        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/refresh')) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return api(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const res = await api.post('/api/v1/auth/refresh');
                const newToken = res.data.data.accessToken;
                await useAuthStore.getState().setAccessToken(newToken);
                processQueue(null, newToken);
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                // Use clearSession to remove accessToken but keep masterKey
                useAuthStore.getState().clearSession();
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

/**
 * API Methods
 */

export const authApi = {
    loginInit: async (payload: LoginInitRequest): Promise<LoginInitResponse> => {
        const res = await api.post('/api/v1/auth/login-init', payload);
        return res.data.data;
    },

    login: async (payload: LoginRequest): Promise<LoginResponse> => {
        const res = await api.post('/api/v1/auth/login', payload);
        return res.data.data;
    },

    signup: async (payload: SignupRequest): Promise<string> => {
        const res = await api.post('/api/v1/auth/signup', payload);
        return res.data.data;
    },

    getMe: async (): Promise<MeResponse> => {
        const res = await api.get('/api/v1/members/me');
        const data = res.data.data;
        await useAuthStore.getState().setAuthMethod(data.authMethod);
        return data;
    },

    refreshSession: async (): Promise<string> => {
        const res = await api.post('/api/v1/auth/refresh');
        const token = res.data.data.accessToken;
        await useAuthStore.getState().setAccessToken(token);
        return token;
    },

    recoveryInit: async (payload: RecoveryInitRequest): Promise<RecoveryInitResponse> => {
        const res = await api.post('/api/v1/auth/recovery-init', payload);
        return res.data.data;
    },

    recovery: async (payload: RecoveryRequest): Promise<RecoveryResponse> => {
        const res = await api.post('/api/v1/auth/recovery', payload);
        return res.data.data;
    },

    deleteMember: async (): Promise<void> => {
        await api.delete('/api/v1/members/me');
    },

    /**
     * OAuth2 Token Exchange
     * FIXME: This endpoint is missing from the auto-generated api.ts spec.
     * We assume it uses /api/v1/auth/login or similar if it's meant to be there.
     */
    exchangeOAuth2Token: async (authCodeId: string): Promise<string> => {
        // Placeholder implementation based on usage in login page
        const res = await api.post('/api/v1/auth/login', { authCodeId });
        const token = res.data.data.accessToken;
        await useAuthStore.getState().setAccessToken(token);
        return token;
    }
};

export const nodeApi = {
    getNodesTree: async (): Promise<NodeTreeResponse> => {
        const res = await api.get('/api/v1/nodes/tree');
        return res.data.data;
    },

    addNode: async (payload: AddNodeRequest): Promise<string> => {
        const res = await api.post('/api/v1/nodes', payload);
        return res.data.data;
    },

    updateNodeTitle: async (nodeId: number, payload: UpdateNodeTitleRequest): Promise<void> => {
        await api.patch(`/api/v1/nodes/${nodeId}/title`, payload);
    },

    moveNode: async (nodeId: number, payload: MoveNodeRequest): Promise<void> => {
        await api.patch(`/api/v1/nodes/${nodeId}/move`, payload);
    },

    deleteNode: async (nodeId: number): Promise<void> => {
        await api.delete(`/api/v1/nodes/${nodeId}`);
    },

    getNodeContents: async (nodeId: number): Promise<NodeDetailResponse> => {
        const res = await api.get(`/api/v1/nodes/${nodeId}`);
        return res.data.data;
    },

    addNodeContents: async (nodeId: number, payload: AddNodeContentsRequest): Promise<AddNodeContentsResponse> => {
        const res = await api.post(`/api/v1/nodes/${nodeId}/contents`, payload);
        return res.data.data;
    },

    updateNodeContents: async (payload: UpdateNodeContentsRequest): Promise<void> => {
        await api.patch('/api/v1/node-contents', payload);
    },

    deleteNodeContents: async (payload: DeleteNodeContentsRequest): Promise<void> => {
        await api.post('/api/v1/node-contents/delete', payload);
    }
};
