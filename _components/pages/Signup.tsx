import { useState } from 'react';
import { authApi } from '@/lib/api';
import { 
    generateRandomDek, 
    deriveKEK, 
    deriveRecoveryKEK,
    deriveAuthHash, 
    encryptDEK, 
    DEFAULT_KDF_PARAMS 
} from '@/lib/crypto';
import { Shield, Key, Mail, ArrowRight, Check, UserPlus, FileDown } from 'lucide-react';
import { jsPDF } from 'jspdf';

function SignupHeader() {
    return (
        <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-white border border-neutral-200 rounded-2xl flex justify-center items-center shadow-sm mb-6">
                <UserPlus size={32} className="text-neutral-900 stroke-[1.5]" />
            </div>
            <h1 className="text-3xl font-semibold text-neutral-900 tracking-tight mb-2">
                Join FDY Write
            </h1>
            <p className="text-neutral-500 text-sm font-normal">
                Create your zero-knowledge account.
            </p>
        </div>
    );
}

interface SignupProps {
    onNavigate: (page: string) => void;
}

export function Signup({ onNavigate }: SignupProps) {
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [step, setStep] = useState<'FORM' | 'RECOVERY'>('FORM');
    const [recoveryCode, setRecoveryCode] = useState('');

    const generateRecoveryCode = () => {
        const array = new Uint8Array(16);
        window.crypto.getRandomValues(array);
        return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('-').toUpperCase();
    };

    const downloadRecoveryPDF = (code: string) => {
        const doc = new jsPDF();
        
        doc.setFontSize(22);
        doc.text("FDY Write - Recovery Code", 20, 30);
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text("Keep this code extremely safe. If you lose your password, this is the ONLY way to recover your data.", 20, 45, { maxWidth: 170 });
        doc.setDrawColor(200);
        doc.line(20, 55, 190, 55);
        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.setFont("courier", "bold");
        doc.text(code, 20, 70);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(`Generated for: ${loginId}`, 20, 85);
        doc.text(`Date: ${new Date().toLocaleString()}`, 20, 92);
        
        doc.save(`FDY-Recovery-Code-${loginId}.pdf`);
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!loginId || !password) return;
        if (password !== confirmPassword) {
            alert("Passwords do not match.");
            return;
        }

        setIsProcessing(true);
        try {
            const code = generateRecoveryCode();
            setRecoveryCode(code);
            const salt = window.crypto.getRandomValues(new Uint8Array(16));
            const saltString = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
            const dek = await generateRandomDek();
            const kek = await deriveKEK(password, saltString, DEFAULT_KDF_PARAMS);
            const passwordEncryptedDek = await encryptDEK(dek, kek);
            const recoveryKek = await deriveRecoveryKEK(code, saltString, DEFAULT_KDF_PARAMS);
            const recoveryEncryptedDek = await encryptDEK(dek, recoveryKek);
            
            const passwordAuthHash = await deriveAuthHash(password, saltString, DEFAULT_KDF_PARAMS);
            const recoveryAuthHash = await deriveAuthHash(code, saltString, DEFAULT_KDF_PARAMS);

            await authApi.signup({
                loginId,
                passwordAuthHash,
                passwordSalt: saltString,
                passwordEncryptedDek,
                recoveryEncryptedDek,
                recoverySalt: saltString,
                recoveryAuthHash,
                kdfParam: {
                    iterations: DEFAULT_KDF_PARAMS.iterations,
                    memory: DEFAULT_KDF_PARAMS.memory,
                    parallelism: DEFAULT_KDF_PARAMS.parallelism,
                    keyLength: DEFAULT_KDF_PARAMS.keyLength,
                    algorithm: DEFAULT_KDF_PARAMS.algorithm.toUpperCase()
                }
            });

            setStep('RECOVERY');
        } catch (err) {
            console.error("Signup Failed", err);
            alert("Signup failed. ID might already exist.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (step === 'RECOVERY') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#FBFBFA] p-6 font-sans">
                <main className="w-full max-w-[400px] flex flex-col items-center">
                    <div className="w-16 h-16 bg-green-50 border border-green-100 rounded-2xl flex justify-center items-center shadow-sm mb-6">
                        <Check size={32} className="text-green-600 stroke-[2]" />
                    </div>
                    <h1 className="text-3xl font-semibold text-neutral-900 tracking-tight mb-2">Account Created</h1>
                    <p className="text-neutral-500 text-sm text-center mb-8">
                        Your zero-knowledge account is ready. <br/>
                        <span className="font-bold text-red-500">Please save your recovery code now.</span>
                    </p>
                    <div className="w-full bg-white border-2 border-dashed border-neutral-200 rounded-2xl p-8 mb-6 text-center">
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3">Your Recovery Code</p>
                        <p className="text-xl font-mono font-bold text-neutral-900 break-all select-all">{recoveryCode}</p>
                    </div>
                    <button 
                        onClick={() => downloadRecoveryPDF(recoveryCode)}
                        className="w-full h-12 bg-neutral-900 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors mb-3"
                    >
                        <FileDown size={18} />
                        Download Recovery PDF
                    </button>
                    <button 
                        onClick={() => onNavigate('login')}
                        className="w-full h-12 bg-white border border-neutral-200 text-neutral-600 rounded-xl text-sm font-semibold hover:bg-neutral-50 transition-colors"
                    >
                        Go to Login
                    </button>
                </main>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#FBFBFA] p-6 font-sans">
            <main className="w-full max-w-[360px] flex flex-col items-center">
                <SignupHeader />
                <div className="w-full bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm">
                    <form onSubmit={handleSignup} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider ml-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                                <input 
                                    type="email"
                                    placeholder="email@example.com"
                                    className="w-full h-11 pl-10 pr-4 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/5 focus:border-neutral-900 transition-all"
                                    value={loginId}
                                    onChange={(e) => setLoginId(e.target.value)}
                                    disabled={isProcessing}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider ml-1">Password</label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                                <input 
                                    type="password"
                                    placeholder="At least 8 characters"
                                    className="w-full h-11 pl-10 pr-4 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/5 focus:border-neutral-900 transition-all"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isProcessing}
                                    required
                                    minLength={8}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider ml-1">Confirm Password</label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                                <input 
                                    type="password"
                                    placeholder="Repeat your password"
                                    className="w-full h-11 pl-10 pr-4 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/5 focus:border-neutral-900 transition-all"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={isProcessing}
                                    required
                                />
                            </div>
                        </div>
                        <button 
                            type="submit"
                            disabled={isProcessing || !loginId || !password}
                            className="w-full h-11 bg-neutral-900 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed pt-1"
                        >
                            {isProcessing ? "Creating Account..." : "Create Account"}
                            {!isProcessing && <ArrowRight size={16} />}
                        </button>
                    </form>
                    <div className="mt-6 pt-6 border-t border-neutral-100 flex justify-center">
                        <p className="text-sm text-neutral-500">
                            Already have an account?{' '}
                            <button 
                                onClick={() => onNavigate('login')}
                                className="text-neutral-900 font-semibold hover:underline underline-offset-4"
                            >
                                Login
                            </button>
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
