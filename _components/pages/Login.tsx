import { useState } from 'react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { deriveAuthHash, deriveKEK, decryptDEK } from '@/lib/crypto';
import { Shield, Key, Mail, ArrowRight, Check } from 'lucide-react';
import { logger } from '@/utils/logger';

function LoginHeader() {
    return (
        <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-white border border-neutral-200 rounded-2xl flex justify-center items-center shadow-sm mb-6 overflow-hidden">
                <Shield className="w-10 h-10 text-neutral-900 stroke-[1.5]" />
            </div>
            <h1 className="text-3xl font-semibold text-neutral-900 tracking-tight mb-2">
                FDY
            </h1>
            <p className="text-neutral-500 text-sm font-normal text-center">
                Your eyes only. <br/> A private space for your secret thoughts.
            </p>
        </div>
    );
}

interface LoginProps {
    onNavigate: (page: string) => void;
}

export function Login({ onNavigate }: LoginProps) {
    const { setAccessToken, setMasterKey } = useAuthStore();
    
    const [step, setStep] = useState<'ID' | 'PW'>('ID');
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [salt, setSalt] = useState<string | null>(null);
    const [kdfParams, setKdfParams] = useState<any>(null);

    const handleIdSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!loginId) return;

        setIsProcessing(true);
        try {
            const initData = await authApi.loginInit({ loginId });
            setSalt(initData.passwordSalt);
            setKdfParams(initData.kdfParam);
            setStep('PW');
        } catch (err) {
            console.error("Login Init Failed", err);
            alert("User not found or connection error.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password || !salt || !kdfParams) return;

        setIsProcessing(true);
        try {
            const authHash = await deriveAuthHash(password, salt, kdfParams);
            const loginRes = await authApi.login({ loginId, passwordAuthHash: authHash });
            
            await setAccessToken(loginRes.accessToken);
            const kek = await deriveKEK(password, salt, kdfParams);
            const dek = await decryptDEK(loginRes.passwordEncryptedDek, kek);
            await setMasterKey(dek);
            
            logger.log("✅ [Login] Success!");
            onNavigate('node');
        } catch (err) {
            console.error("Login Failed", err);
            alert("Invalid password.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#FBFBFA] p-4 sm:p-6 font-sans">
            <main className="w-full max-w-[360px] flex flex-col items-center py-8">
                <LoginHeader />
                
                <div className="w-full bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm">
                    {step === 'ID' ? (
                        <form onSubmit={handleIdSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider ml-1">
                                    Login ID
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                                    <input 
                                        type="text"
                                        placeholder="email@example.com"
                                        className="w-full h-11 pl-10 pr-4 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/5 focus:border-neutral-900 transition-all"
                                        value={loginId}
                                        onChange={(e) => setLoginId(e.target.value)}
                                        disabled={isProcessing}
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <button 
                                type="submit"
                                disabled={isProcessing || !loginId}
                                className="w-full h-11 bg-neutral-900 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? "Processing..." : "Continue"}
                                <ArrowRight size={16} />
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                                        Password
                                    </label>
                                    <button 
                                        type="button" 
                                        onClick={() => setStep('ID')}
                                        className="text-xs text-neutral-400 hover:text-neutral-600"
                                    >
                                        Change ID
                                    </button>
                                </div>
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                                    <input 
                                        type="password"
                                        placeholder="Enter your password"
                                        className="w-full h-11 pl-10 pr-4 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/5 focus:border-neutral-900 transition-all"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={isProcessing}
                                        autoFocus
                                    />
                                </div>
                                <p className="text-[11px] text-neutral-400 ml-1">
                                    Your password is never sent to the server.
                                </p>
                            </div>
                            <div className="flex justify-end mt-[-12px]">
                                <button 
                                    type="button"
                                    onClick={() => onNavigate('recovery')}
                                    className="text-[11px] text-neutral-400 hover:text-neutral-900 transition-colors"
                                >
                                    Forgot password?
                                </button>
                            </div>
                            <button 
                                type="submit"
                                disabled={isProcessing || !password}
                                className="w-full h-11 bg-neutral-900 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? "Authenticating..." : "Login to Workspace"}
                            </button>
                        </form>
                    )}

                    <div className="mt-6 pt-6 border-t border-neutral-100 flex justify-center">
                        <p className="text-sm text-neutral-500">
                            New to FDY Write?{' '}
                            <button 
                                onClick={() => onNavigate('signup')}
                                className="text-neutral-900 font-semibold hover:underline underline-offset-4"
                            >
                                Create account
                            </button>
                        </p>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-2 mt-10">
                    <div className="flex items-center gap-2 text-neutral-400">
                        <Check size={14} className="text-neutral-300" />
                        <span className="text-xs font-medium">End-to-end encrypted</span>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-400">
                        <Check size={14} className="text-neutral-300" />
                        <span className="text-xs font-medium">Zero-knowledge architecture</span>
                    </div>
                </div>

                <footer className="mt-20">
                    <p className="text-neutral-300 text-[10px] font-medium tracking-wide">
                        &copy; 2026 FDY &bull; SECURE WRITING ENVIRONMENT
                    </p>
                </footer>
            </main>
        </div>
    );
}
