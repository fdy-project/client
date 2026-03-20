'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Node } from '@/_components/pages/Node';

export default function NodePage() {
    const router = useRouter();

    // 웹에서 페이지 이동을 처리하는 함수
    const handleNavigate = (page: string) => {
        if (page === 'login') router.replace('/auth/login');
        if (page === 'signup') router.push('/auth/signup');
        if (page === 'node') router.replace('/node');
    };

    return (
        <Suspense fallback={null}>
            <Node onNavigate={handleNavigate} />
        </Suspense>
    );
}
