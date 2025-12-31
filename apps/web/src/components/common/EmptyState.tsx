export function EmptyState({ title, description }: { title: string; description: string }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="text-base font-semibold text-slate-800">{title}</p>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
    );
}
