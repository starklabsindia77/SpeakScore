import React from 'react';

export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' }) {
    const toneClass = {
        neutral: 'bg-gray-100 text-gray-800',
        success: 'bg-green-100 text-green-700',
        warning: 'bg-amber-100 text-amber-700',
        danger: 'bg-red-100 text-red-700'
    }[tone];
    return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${toneClass}`}>{children}</span>;
}
