'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Login } from '@/_components/pages/Login';

export default function LoginPage() {
    const router = useRouter();

    // 웹에서 페이지 이동을 처리하는 함수
    const handleNavigate = (page: string) => {
        if (page === 'signup') router.push('/auth/signup');
        if (page === 'node') router.replace('/node');
        if (page === 'login') router.push('/auth/login');
        if (page === 'recovery') router.push('/auth/recovery');
    };

    return (
        <Suspense fallback={null}>
            <Login onNavigate={handleNavigate} />
        </Suspense>
    );
}
