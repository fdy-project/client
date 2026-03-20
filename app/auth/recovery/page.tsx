'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Recovery } from '@/_components/pages/Recovery';

export default function RecoveryPage() {
    const router = useRouter();

    const handleNavigate = (page: string) => {
        if (page === 'login') router.push('/auth/login');
        if (page === 'signup') router.push('/auth/signup');
        if (page === 'node') router.replace('/node');
        if (page === 'recovery') router.push('/auth/recovery');
    };

    return (
        <Suspense fallback={null}>
            <Recovery onNavigate={handleNavigate} />
        </Suspense>
    );
}
