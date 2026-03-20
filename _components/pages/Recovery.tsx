import { useState } from 'react';
import { authApi, RecoveryInitResponse } from '@/lib/api';
import { 
    deriveKEK, 
    deriveRecoveryKEK, 
    deriveAuthHash, 
    decryptDEK, 
    encryptDEK,
    DEFAULT_KDF_PARAMS 
} from '@/lib/crypto';
import { Shield, Key, Mail, ArrowRight, Check, RotateCcw, Lock } from 'lucide-react';

interface RecoveryProps {
    onNavigate: (page: string) => void;
}

export function Recovery({ onNavigate }: RecoveryProps) {
    const [step, setStep] = useState<'ID' | 'RECOVERY'>('ID');
    const [loginId, setLoginId] = useState('');
    const [recoveryCode, setRecoveryCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [recoverySalt, setRecoverySalt] = useState<string | null>(null);
    const [kdfParams, setKdfParams] = useState<RecoveryInitResponse['kdfParam'] | null>(null);
    const [recoveryEncryptedDek, setRecoveryEncryptedDek] = useState<string | null>(null);

    const handleIdSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!loginId) return;

        setIsProcessing(true);
        try {
            const initData = await authApi.recoveryInit({ loginId });
            setRecoverySalt(initData.recoverySalt);
            setKdfParams(initData.kdfParam);
            setRecoveryEncryptedDek(initData.recoveryEncryptedDek);
            setStep('RECOVERY');
        } catch (err) {
            console.error("Recovery Init Failed", err);
            alert("User not found or connection error.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRecovery = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!recoveryCode || !newPassword || !recoverySalt || !kdfParams) return;
        if (newPassword !== confirmPassword) {
            alert("Passwords do not match.");
            return;
        }
        
        // We need recoveryEncryptedDek to get the DEK.
        if (!recoveryEncryptedDek) {
            alert("Missing recovery data from server. Recovery cannot proceed.");
            return;
        }

        setIsProcessing(true);
        try {
            // 1. Derive Recovery KEK and Decrypt DEK
            const recoveryKek = await deriveRecoveryKEK(recoveryCode, recoverySalt, kdfParams);
            const dekKey = await decryptDEK(recoveryEncryptedDek, recoveryKek);
            const dek = new Uint8Array(await crypto.subtle.exportKey("raw", dekKey));

            // 2. Derive New Password Salt & KEK & AuthHash
            const newPasswordSalt = Array.from(crypto.getRandomValues(new Uint8Array(16)))
                .map(b => b.toString(16).padStart(2, '0')).join('');
            const newKek = await deriveKEK(newPassword, newPasswordSalt, DEFAULT_KDF_PARAMS);
            const newPasswordEncryptedDek = await encryptDEK(dek, newKek);
            const newPasswordAuthHash = await deriveAuthHash(newPassword, newPasswordSalt, DEFAULT_KDF_PARAMS);

            // 3. Derive Old Recovery AuthHash for verification
            const oldRecoveryAuthHash = await deriveAuthHash(recoveryCode, recoverySalt, kdfParams);

            // 4. Send Recovery Request
            await authApi.recovery({
                loginId,
                recoveryAuthHash: oldRecoveryAuthHash,
                newPasswordAuthHash,
                newPasswordSalt,
                newPasswordEncryptedDek,
                newKdfParam: {
                    iterations: DEFAULT_KDF_PARAMS.iterations,
                    memory: DEFAULT_KDF_PARAMS.memory,
                    parallelism: DEFAULT_KDF_PARAMS.parallelism,
                    keyLength: DEFAULT_KDF_PARAMS.keyLength,
                    algorithm: DEFAULT_KDF_PARAMS.algorithm
                }
            });

            alert("Account recovered successfully! Please login with your new password.");
            onNavigate('login');
        } catch (err) {
            console.error("Recovery Failed", err);
            alert("Recovery failed. Please check your recovery code.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#FBFBFA] p-4 sm:p-6 font-sans">
            <main className="w-full max-w-[400px] flex flex-col items-center py-8">
                <div className="flex flex-col items-center mb-10">
                    <div className="w-16 h-16 bg-white border border-neutral-200 rounded-2xl flex justify-center items-center shadow-sm mb-6">
                        <RotateCcw className="w-10 h-10 text-neutral-900 stroke-[1.5]" />
                    </div>
                    <h1 className="text-3xl font-semibold text-neutral-900 tracking-tight mb-2">
                        Account Recovery
                    </h1>
                    <p className="text-neutral-500 text-sm font-normal text-center">
                        Use your recovery code to reset your password.
                    </p>
                </div>
                
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
                                {isProcessing ? "Checking..." : "Next Step"}
                                <ArrowRight size={16} />
                            </button>
                            <button 
                                type="button"
                                onClick={() => onNavigate('login')}
                                className="w-full text-center text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
                            >
                                Back to Login
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleRecovery} className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider ml-1">
                                        Recovery Code
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                                        <input 
                                            type="text"
                                            placeholder="XXXX-XXXX-XXXX-XXXX"
                                            className="w-full h-11 pl-10 pr-4 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-neutral-900/5 focus:border-neutral-900 transition-all uppercase"
                                            value={recoveryCode}
                                            onChange={(e) => setRecoveryCode(e.target.value)}
                                            disabled={isProcessing}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider ml-1">
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                                        <input 
                                            type="password"
                                            placeholder="New password"
                                            className="w-full h-11 pl-10 pr-4 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/5 focus:border-neutral-900 transition-all"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            disabled={isProcessing}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider ml-1">
                                        Confirm Password
                                    </label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                                        <input 
                                            type="password"
                                            placeholder="Confirm new password"
                                            className="w-full h-11 pl-10 pr-4 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/5 focus:border-neutral-900 transition-all"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            disabled={isProcessing}
                                        />
                                    </div>
                                </div>
                            </div>
                            <button 
                                type="submit"
                                disabled={isProcessing || !recoveryCode || !newPassword}
                                className="w-full h-11 bg-neutral-900 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? "Recovering..." : "Recover Account"}
                            </button>
                            <button 
                                type="button"
                                onClick={() => setStep('ID')}
                                className="w-full text-center text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
                            >
                                Change ID
                            </button>
                        </form>
                    )}
                </div>
                
                <footer className="mt-20">
                    <p className="text-neutral-300 text-[10px] font-medium tracking-wide">
                        &copy; 2026 FDY &bull; SECURE RECOVERY SYSTEM
                    </p>
                </footer>
            </main>
        </div>
    );
}
