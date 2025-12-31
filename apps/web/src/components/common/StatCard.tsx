export function StatCard({ label, value, hint, tone = 'neutral' }: { label: string; value: number | string; hint: string; tone?: 'neutral' | 'warning' }) {
    const toneClass = tone === 'warning' ? 'text-amber-600 bg-amber-50' : 'text-blue-700 bg-blue-50';
    return (
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
            <p className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${toneClass}`}>{hint}</p>
        </div>
    );
}
