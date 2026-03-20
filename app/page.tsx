'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/lib/api';
import { logger } from '@/utils/logger';
import Link from 'next/link';

// 인터랙티브 데모 컴포넌트 (체험 가능한 미니 Node)
function InteractiveDemo() {
    const demoData = {
        'db': {
            title: 'DB 비밀번호',
            content: `<계정>\nmaster\nosdijfisdjfosdisdmidcmsodimciodcisdsdocmid\n\napplication\noiiodfvidofmoidmfomdfodmicmdiofmcdiofm`
        },
        'bank': {
            title: '계좌 비밀번호',
            content: `국민은행 (123-45-67890)\n비밀번호: 4***\n\n신한은행 (987-65-43210)\n비밀번호: 9***`
        },
        'diary': {
            title: '나만의 일기장',
            content: `2026년 3월 20일\n오늘은 FDY 프로젝트의 랜딩 페이지를 작업했다.\n보안과 디자인의 조화를 찾는 과정이 즐겁다.\n내일은 더 멋진 기능을 추가해봐야지.`
        }
    };

    const [selectedId, setSelectedId] = useState<keyof typeof demoData>('db');
    const [contents, setContents] = useState({
        db: demoData.db.content,
        bank: demoData.bank.content,
        diary: demoData.diary.content,
    });
    const [isEncrypted, setIsEncrypted] = useState(false);
    const [displayText, setDisplayText] = useState(contents[selectedId]);

    useEffect(() => {
        if (isEncrypted) {
            const encrypted = contents[selectedId].split('').map(() => 
                Math.random().toString(36).substring(2, 3)
            ).join('').substring(0, 150) + "... [AES-GCM-ENCRYPTED]";
            setDisplayText(encrypted);
        } else {
            setDisplayText(contents[selectedId]);
        }
    }, [selectedId, isEncrypted, contents]);

    const handleToggleEncryption = () => {
        setIsEncrypted(!isEncrypted);
    };

    const currentContent = contents[selectedId];

    return (
        <div className="w-full bg-white border border-[#e5e3dc] rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[500px]">
            {/* Window Bar */}
            <div className="h-10 bg-[#f4f3ef] border-b border-[#e5e3dc] flex items-center px-4 justify-between shrink-0">
                <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                </div>
                <div className="font-mono text-[10px] text-neutral-400">fdy.app — Interactive Security Demo</div>
                <div className="w-10"></div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar Mockup */}
                <div className="w-44 bg-[#fafaf8] border-r border-[#eeece6] hidden sm:flex flex-col p-4 shrink-0">
                    <div className="text-[12px] font-bold mb-6 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-600" /> Workspace
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            {(Object.keys(demoData) as Array<keyof typeof demoData>).map((id) => (
                                <button
                                    key={id}
                                    onClick={() => setSelectedId(id)}
                                    className={`w-full text-left text-[12px] flex items-center gap-2 p-1.5 rounded-md transition-colors ${
                                        selectedId === id 
                                        ? 'text-neutral-700 font-medium bg-neutral-200/50' 
                                        : 'text-neutral-500 hover:bg-neutral-100'
                                    }`}
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    {demoData[id].title}
                                </button>
                            ))}
                            <div className="text-[12px] flex items-center gap-2 text-neutral-400 pl-1.5 pt-2">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                                프로젝트 A
                            </div>
                        </div>
                    </div>
                </div>

                {/* Editor Area */}
                <div className="flex-1 flex flex-col bg-white relative">
                    <div className="h-12 border-b border-[#eeece6] flex items-center px-6 justify-between bg-white z-10">
                        <div className="text-[13px] font-medium">{demoData[selectedId].title}</div>
                        <button 
                            onClick={handleToggleEncryption}
                            className={`text-[11px] font-bold px-3 py-1.5 rounded-full transition-all flex items-center gap-2 ${
                                isEncrypted 
                                ? 'bg-green-100 text-green-700 border border-green-200' 
                                : 'bg-blue-600 text-white shadow-md shadow-blue-200'
                            }`}
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {isEncrypted 
                                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                }
                            </svg>
                            {isEncrypted ? '서버 저장 상태 (암호화됨)' : '지금 암호화하기'}
                        </button>
                    </div>
                    
                    <div className="flex-1 p-6 font-mono text-[14px] overflow-auto">
                        {isEncrypted ? (
                            <div className="text-neutral-400 break-all leading-relaxed animate-pulse">
                                {displayText}
                                <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-100 text-green-800 text-[12px] font-sans">
                                    ✓ 이 데이터는 서버로 전송되어도 누구도 읽을 수 없습니다. 
                                    오직 당신의 마스터 키로만 복호화가 가능합니다.
                                </div>
                            </div>
                        ) : (
                            <textarea 
                                className="w-full h-full outline-none resize-none leading-relaxed text-neutral-700 bg-transparent"
                                value={currentContent}
                                onChange={(e) => {
                                    setContents(prev => ({ ...prev, [selectedId]: e.target.value }));
                                }}
                                placeholder="여기에 비밀 내용을 입력해보세요..."
                            />
                        )}
                    </div>

                    {!isEncrypted && (
                        <div className="absolute bottom-4 right-6 pointer-events-none">
                            <div className="flex items-center gap-2 text-[11px] text-neutral-300 font-mono">
                                <span className="w-2 h-2 rounded-full bg-neutral-200" />
                                Local Editing Mode
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function LandingPage() {
    const revealRefs = useRef<(HTMLDivElement | HTMLElement)[]>([]);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, i) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.classList.add('opacity-100', 'translate-y-0');
                    }, i * 60);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        revealRefs.current.forEach(el => {
            if (el) {
                el.classList.add('opacity-0', 'translate-y-10', 'transition-all', 'duration-700', 'ease-out');
                observer.observe(el);
            }
        });

        return () => observer.disconnect();
    }, []);

    const addToRefs = (el: HTMLDivElement | HTMLElement | null) => {
        if (el && !revealRefs.current.includes(el)) {
            revealRefs.current.push(el);
        }
    };

    return (
        <div className="bg-[#fafaf8] text-[#2c2b28] min-h-screen selection:bg-blue-100 font-sans antialiased overflow-x-hidden">
            {/* NAV */}
            <nav className="fixed top-0 left-0 right-0 z-[100] h-[60px] bg-[#fafaf8]/90 backdrop-blur-md border-b border-[#e5e3dc] flex items-center justify-between px-6 md:px-12">
                <div className="font-mono text-[17px] font-bold tracking-[3px] flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> FDY
                </div>
                <div className="flex items-center gap-8">
                    <ul className="hidden lg:flex items-center gap-8 list-none font-medium">
                        <li><a href="#security" className="text-[14px] text-neutral-500 hover:text-blue-600 transition-colors">보안 원칙</a></li>
                        <li><a href="#flow" className="text-[14px] text-neutral-500 hover:text-blue-600 transition-colors">동작 방식</a></li>
                        <li><a href="#demo" className="text-[14px] text-neutral-500 hover:text-blue-600 transition-colors">사용 방법</a></li>
                    </ul>
                    <Link href="/auth/login" className="bg-blue-600 text-white px-5 py-2 rounded-lg text-[14px] font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100">
                        로그인 →
                    </Link>
                </div>
            </nav>

            {/* HERO */}
            <div className="max-w-[1200px] mx-auto px-6 md:px-12 pt-[140px] pb-[100px] grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-20 items-center">
                <div ref={addToRefs}>
                    <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 px-4 py-2 rounded-full text-[12px] font-bold font-mono mb-8">
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                        ZERO-KNOWLEDGE · E2E ENCRYPTED
                    </div>
                    <h1 className="text-[48px] md:text-[64px] font-bold leading-[1.1] tracking-[-2px] mb-6">
                        당신만이 읽을 수<br />있는 <span className="text-blue-600 underline decoration-blue-200 underline-offset-8">문서 저장소</span>
                    </h1>
                    <p className="text-[18px] text-neutral-500 leading-relaxed font-light mb-12 max-w-[540px]">
                        FDY는 서버 운영자조차 저장된 내용을 절대 볼 수 없는 영지식(Zero-Knowledge) 아키텍처를 기반으로 합니다. 
                        오른쪽 데모에서 <b>지금 바로 암호화</b>를 체험해보세요.
                    </p>
                    <div className="flex flex-wrap gap-4">
                        <Link href="/auth/login" className="bg-blue-600 text-white px-8 py-4 rounded-2xl text-[16px] font-bold inline-flex items-center gap-3 hover:bg-blue-700 hover:-translate-y-1 transition-all shadow-xl shadow-blue-200">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                            지금 무료로 시작하기
                        </Link>
                        <a href="https://github.com/fdy-project" target="_blank" className="text-neutral-600 border border-[#e5e3dc] px-8 py-4 rounded-2xl text-[16px] font-medium hover:bg-white hover:border-neutral-400 transition-all inline-flex items-center gap-2">
                            GitHub 프로젝트 →
                        </a>
                    </div>
                </div>

                <div className="w-full" ref={addToRefs}>
                    <InteractiveDemo />
                </div>
            </div>

            {/* TRUST BAR */}
            <div className="bg-white border-y border-[#e5e3dc] py-8 px-6 overflow-x-auto">
                <div className="max-w-[1200px] mx-auto flex justify-center items-center gap-12 md:gap-20 whitespace-nowrap">
                    {[
                        { label: "AES-GCM 256-bit", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
                        { label: "Argon2id Key Derivation", icon: "M12 8v4l3 3" },
                        { label: "Web Crypto Native API", icon: "M20 6L9 17l-5-5" },
                        { label: "100% Open Source", icon: "M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" },
                    ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 text-[13px] text-neutral-400 font-mono font-medium uppercase tracking-wider">
                            <div className="w-6 h-6 bg-blue-50 rounded-md flex items-center justify-center">
                                <svg className="w-3.5 h-3.5 stroke-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d={item.icon} /></svg>
                            </div>
                            {item.label}
                        </div>
                    ))}
                </div>
            </div>

            {/* SECURITY SECTION */}
            <section className="max-w-[1200px] mx-auto px-6 md:px-12 py-32" id="security">
                <div ref={addToRefs} className="text-center mb-20">
                    <div className="font-mono text-[12px] text-blue-600 font-bold tracking-[3px] mb-4 uppercase">Principles</div>
                    <h2 className="text-[36px] md:text-[48px] font-bold tracking-[-2px] mb-6">타협할 수 없는 보안 원칙</h2>
                    <p className="text-neutral-500 max-w-2xl mx-auto font-light leading-relaxed">우리는 사용자 데이터를 관리하지 않습니다. 오직 기술로 보호할 뿐입니다.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8" ref={addToRefs}>
                    {[
                        { title: "종단간 암호화 (E2EE)", desc: "데이터는 브라우저를 떠나기 전 마스터키로 암호화됩니다. 서버에는 깨진 글자(암호문)만 도달하며, 평문은 어디에도 전송되지 않습니다.", tag: "CRYPTO-NATIVE", color: "blue" },
                        { title: "영지식 (Zero-Knowledge)", desc: "서버는 당신의 비밀번호도, 암호화 키도 모릅니다. 인증에 사용되는 값은 비밀번호에서 고도로 해싱된 별개의 데이터입니다.", tag: "PRIVACY-FIRST", color: "green" },
                        { title: "검증된 오픈 암호학", desc: "AES-GCM, Argon2id 등 글로벌 표준 암호학 알고리즘만 사용합니다. 불투명한 독자 알고리즘은 절대 사용하지 않습니다.", tag: "TRUSTED STD", color: "amber" },
                    ].map((card, i) => (
                        <div key={i} className="bg-white border border-[#e5e3dc] rounded-[32px] p-10 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-mono text-[12px] font-bold mb-8 ${card.color === 'blue' ? 'bg-blue-600 text-white' : card.color === 'green' ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'}`}>
                                0{i+1}
                            </div>
                            <h3 className="text-[20px] font-bold mb-4">{card.title}</h3>
                            <p className="text-[15px] text-neutral-500 leading-relaxed font-light">{card.desc}</p>
                            <div className="mt-8 pt-6 border-t border-neutral-100">
                                <span className={`font-mono text-[11px] font-bold tracking-widest ${card.color === 'blue' ? 'text-blue-600' : card.color === 'green' ? 'text-green-600' : 'text-amber-600'}`}>
                                    {card.tag}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* FLOW SECTION */}
            <div className="bg-[#f4f3ef] border-y border-[#e5e3dc] py-32 px-6 md:px-12" id="flow">
                <div className="max-w-[1200px] mx-auto">
                    <div ref={addToRefs} className="mb-16">
                        <div className="font-mono text-[12px] text-neutral-400 tracking-[3px] mb-4 uppercase">Encryption Flow</div>
                        <h2 className="text-[36px] md:text-[48px] font-bold tracking-[-2px]">수학적으로 증명된 안전성</h2>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 items-center">
                        <div className="bg-white border border-[#e5e3dc] rounded-[32px] overflow-hidden shadow-sm" ref={addToRefs}>
                            <table className="w-full text-left text-[14px]">
                                <thead className="bg-[#fafaf8] border-b border-[#e5e3dc]">
                                    <tr>
                                        <th className="p-6 font-mono text-[11px] text-neutral-400 uppercase tracking-widest">Key Component</th>
                                        <th className="p-6 font-mono text-[11px] text-neutral-400 uppercase tracking-widest">Description</th>
                                        <th className="p-6 font-mono text-[11px] text-neutral-400 uppercase tracking-widest text-center">Server Visibility</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#eeece6]">
                                    {[
                                        { name: "DEK", full: "Data Encryption Key", role: "문서를 직접 암호화하는 일회용 키. 브라우저 내에서 매번 랜덤하게 생성됩니다.", server: false },
                                        { name: "KEK", full: "Key Encryption Key", role: "DEK를 한 번 더 암호화하여 보호하는 키. 사용자 비밀번호에서 Argon2id로 유도됩니다.", server: false },
                                        { name: "AuthHash", full: "Authentication Hash", role: "서버 로그인을 위한 전용 해시값. 비밀번호에서 유도되지만 키(KEK)와는 완전히 분리됩니다.", server: true },
                                    ].map((row, i) => (
                                        <tr key={i} className="hover:bg-neutral-50 transition-colors">
                                            <td className="p-6">
                                                <div className={`font-mono font-bold text-[16px] ${row.server ? 'text-green-600' : 'text-blue-600'}`}>{row.name}</div>
                                                <div className="text-[11px] text-neutral-400 font-mono mt-1 leading-tight">{row.full}</div>
                                            </td>
                                            <td className="p-6 text-neutral-500 font-light leading-relaxed">{row.role}</td>
                                            <td className="p-6 text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-bold font-mono ${row.server ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600 opacity-40'}`}>
                                                    {row.server ? '✓ VISIBLE' : '✗ BLIND'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-[#1a1a1a] rounded-[32px] p-8 md:p-12 font-mono text-[14px] leading-relaxed text-[#cdd6f4] shadow-2xl" ref={addToRefs}>
                            <div className="text-neutral-500 mb-8 font-bold border-b border-neutral-800 pb-4">TERMINAL: ENCRYPTION_CHAIN.LOG</div>
                            <div className="space-y-2">
                                <div><span className="text-[#89dceb]">USER_PASS</span>  <span className="text-[#a6e3a1]">──[Argon2id]──▶</span>  <span className="text-[#f38ba8]">KEK</span>       <span className="text-[#444] ml-4 italic">// Only in Browser RAM</span></div>
                                <div><span className="text-[#89dceb]">USER_PASS</span>  <span className="text-[#a6e3a1]">──[Argon2id]──▶</span>  <span className="text-[#f38ba8]">AUTH_HASH</span> <span className="text-[#444] ml-4 italic">// Sent to Server</span></div>
                                <br />
                                <div className="text-neutral-600">// Document Encryption</div>
                                <div><span className="text-[#89dceb]">DOC_RAW</span>    <span className="text-[#a6e3a1]">──[DEK:AES]───▶</span>  <span className="text-[#f38ba8]">DOC_CIPHER</span> <span className="text-[#a6e3a1]">→</span> DB_STORE</div>
                                <div><span className="text-[#89dceb]">DEK_RAW</span>    <span className="text-[#a6e3a1]">──[KEK:AES]───▶</span>  <span className="text-[#f38ba8]">DEK_CIPHER</span> <span className="text-[#a6e3a1]">→</span> DB_STORE</div>
                                <br />
                                <div className="pt-4 text-green-500 font-bold tracking-tighter text-center border-t border-neutral-800 animate-pulse">
                                    [SYSTEM READY: DATA IS MATHEMATICALLY SECURED]
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* DEMO SECTION */}
            <section className="max-w-[1200px] mx-auto px-6 md:px-12 py-32" id="demo">
                <div ref={addToRefs} className="mb-20">
                    <div className="font-mono text-[12px] text-blue-600 font-bold tracking-[3px] mb-4 uppercase">Experience</div>
                    <h2 className="text-[36px] md:text-[48px] font-bold tracking-[-2px]">비밀은 브라우저를 벗어나지 않습니다</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                    <div className="space-y-4" ref={addToRefs}>
                        {[
                            { step: "01", title: "로컬에서 이루어지는 키 생성", desc: "로그인 버튼을 누르는 즉시 브라우저는 비밀번호를 재료로 암호화 키를 요리합니다. 이 키는 세션이 끝나면 흔적도 없이 사라집니다." },
                            { step: "02", title: "워크스페이스와 폴더 구조 암호화", desc: "단순히 내용뿐만 아니라 파일의 제목과 구조까지 암호화하여 서버 운영자조차 당신이 어떤 프로젝트를 진행하는지 알 수 없습니다." },
                            { step: "03", title: "실시간 AES-GCM 보호", desc: "노트를 작성하고 저장할 때마다 강력한 AES-GCM 256 알고리즘이 동작합니다. 서버는 그저 의미 없는 데이터 조각을 저장할 뿐입니다." },
                            { step: "04", title: "언제 어디서나 복호화", desc: "다른 장치에서 로그인하면 브라우저가 다시 당신의 비밀번호로 키를 복구해 암호화된 데이터를 순식간에 읽기 편한 텍스트로 되돌립니다." },
                        ].map((row, i) => (
                            <div key={i} className="group flex gap-8 py-8 border-b border-[#eeece6] last:border-0 hover:bg-white hover:px-6 transition-all rounded-2xl -mx-6">
                                <div className="w-10 h-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-mono text-[14px] font-bold shrink-0 mt-1 shadow-lg shadow-blue-100 group-hover:scale-110 transition-transform">{row.step}</div>
                                <div>
                                    <h4 className="text-[18px] font-bold mb-2">{row.title}</h4>
                                    <p className="text-[15px] text-neutral-500 font-light leading-relaxed">{row.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="relative" ref={addToRefs}>
                        <div className="absolute -inset-10 bg-blue-100/30 blur-[80px] rounded-full -z-10" />
                        <div className="bg-white border border-[#e5e3dc] rounded-[32px] overflow-hidden shadow-2xl ring-1 ring-black/5">
                            <div className="h-12 bg-[#f4f3ef] border-b border-[#e5e3dc] flex items-center px-6 gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                                <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                                <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                                <div className="flex-1 text-center font-mono text-[11px] text-neutral-400 font-medium">Workspace / DB 비밀번호</div>
                            </div>
                            <img src="/ex_node_page_ko.png" alt="FDY 실제 사용 화면" className="w-full h-auto" />
                            <div className="p-6 bg-[#fafaf8] border-t border-[#eeece6]">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-[12px]">✓</div>
                                    <p className="text-[12px] text-neutral-400 font-medium font-mono italic">
                                        &quot;서버가 해킹당해도, DB가 유출되어도 당신의 데이터는 이 화면 그대로 보존됩니다.&quot;
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA SECTION */}
            <div className="bg-[#2c2b28] py-32 px-6 md:px-12 text-center relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
                <div ref={addToRefs} className="relative z-10">
                    <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 px-4 py-2 rounded-full text-[12px] font-bold font-mono mb-8">
                        VERIFIABLE SECURITY · OPEN SOURCE
                    </div>
                    <h2 className="text-[40px] md:text-[56px] font-bold text-white tracking-[-2px] leading-tight mb-6">당신의 생각이<br />수학적으로 보호되는 곳</h2>
                    <p className="text-[18px] text-white/40 font-light max-w-[540px] mx-auto mb-12 leading-relaxed">
                        우리는 약속하지 않습니다. 증명할 뿐입니다. 모든 소스코드는 GitHub에서 투명하게 공개되어 있습니다.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <Link href="/auth/login" className="bg-blue-600 text-white px-10 py-5 rounded-[20px] text-[18px] font-bold hover:bg-blue-700 hover:-translate-y-1 transition-all shadow-2xl shadow-blue-900/40 inline-flex items-center gap-3">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                            로그인 / 지금 시작하기
                        </Link>
                        <a href="https://github.com/fdy-project" target="_blank" className="bg-white/5 text-white border border-white/10 px-8 py-5 rounded-[20px] text-[18px] font-medium hover:bg-white/10 hover:border-white/20 transition-all inline-flex items-center gap-3 group">
                            GitHub Repository
                            <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </a>
                    </div>
                </div>
            </div>

            {/* FOOTER */}
            <footer className="py-12 px-6 md:px-12 border-t border-[#e5e3dc] flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="font-mono text-[16px] font-bold tracking-[4px] flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-blue-600"></span> FDY
                </div>
                <div className="font-mono text-[12px] text-neutral-400 font-medium">AES-GCM 256 · Argon2id · Web Crypto API Native</div>
                <div className="flex gap-8 font-medium">
                    <a href="https://github.com/fdy-project" target="_blank" className="text-[14px] text-neutral-500 hover:text-blue-600 transition-colors">GitHub</a>
                    <a href="#" className="text-[14px] text-neutral-500 hover:text-blue-600 transition-colors">Security Policy</a>
                    <Link href="/auth/login" className="text-[14px] text-neutral-500 hover:text-blue-600 transition-colors font-bold">Sign In</Link>
                </div>
            </footer>
        </div>
    );
}

function RootContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { accessToken, masterKey, isInitialized, setInitialized, restoreAuth } = useAuthStore();
    const [isMounted, setIsMounted] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showLanding, setShowLanding] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const init = async () => {
            if (!isInitialized) {
                logger.log("🔍 [Root] Initializing session...");
                try {
                    await restoreAuth();
                    if (!useAuthStore.getState().accessToken) {
                        await authApi.refreshSession();
                    }
                    logger.log("✅ [Root] Session restored.");
                } catch (e) {
                    logger.log("ℹ [Root] No existing session found.");
                } finally {
                    setInitialized(true);
                }
            }
        };
        init();
    }, [isInitialized, setInitialized, restoreAuth]);

    useEffect(() => {
        const authCodeId = searchParams.get('authCodeId');

        if (authCodeId && !accessToken && isInitialized && !isProcessing) {
            setIsProcessing(true);
            authApi.exchangeOAuth2Token(authCodeId)
                .then(() => {
                    router.replace('/node');
                })
                .catch(() => {
                    router.replace('/auth/login');
                })
                .finally(() => {
                    setIsProcessing(false);
                });
            return;
        }

        if (isMounted && isInitialized && !isProcessing && !authCodeId) {
            if (accessToken && masterKey) {
                router.replace('/node');
            } else {
                setShowLanding(true);
            }
        }
    }, [isMounted, isInitialized, accessToken, masterKey, searchParams, isProcessing, router]);

    if (isProcessing || (!isInitialized && !showLanding)) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#fafaf8]">
                <div className="w-8 h-8 border-4 border-neutral-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
        );
    }

    if (showLanding) {
        return <LandingPage />;
    }

    return null;
}

export default function RootPage() {
    return (
        <Suspense fallback={null}>
            <RootContent />
        </Suspense>
    );
}
