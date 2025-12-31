import { useEffect, useState } from 'react';
import { apiFetch } from '../../api';
import { formatTimeAgo } from '../../utils/date';

export function NotificationBell() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [show, setShow] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Poll for notifications
    useEffect(() => {
        async function fetchNotes() {
            try {
                const res = await apiFetch<any[]>('/api/notifications');
                setNotifications(res);
                setUnreadCount(res.filter((n) => !n.is_read).length);
            } catch (e) {
                // fail silently
            }
        }
        fetchNotes(); // initial
        const interval = setInterval(fetchNotes, 30000); // poll every 30s
        return () => clearInterval(interval);
    }, []);

    async function markRead(id: string) {
        try {
            await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
            );
            setUnreadCount((c) => Math.max(0, c - 1));
        } catch (e) {/* ignore */ }
    }

    return (
        <div className="relative">
            <button
                onClick={() => setShow(!show)}
                className="relative flex items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            >
                <span className="sr-only">Notifications</span>
                {/* Bell Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                    </span>
                )}
            </button>

            {show && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setShow(false)}></div>
                    <div className="absolute right-0 top-full z-20 mt-2 w-80 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl ring-1 ring-black ring-opacity-5">
                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
                            <p className="text-sm font-semibold text-slate-900">Notifications</p>
                        </div>
                        <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                            {notifications.length === 0 && (
                                <div className="p-4 text-center text-xs text-slate-500">No new notifications.</div>
                            )}
                            {notifications.map((n) => (
                                <div key={n.id} onClick={() => !n.is_read && markRead(n.id)} className={`cursor-pointer px-4 py-3 hover:bg-slate-50 ${n.is_read ? 'opacity-60' : 'bg-blue-50/30'}`}>
                                    <div className="flex justify-between">
                                        <p className={`text-sm font-medium ${n.is_read ? 'text-slate-600' : 'text-slate-900'}`}>{n.title}</p>
                                        {!n.is_read && <span className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-1.5"></span>}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                                    <p className="text-[10px] text-slate-400 mt-1">{formatTimeAgo(new Date(n.created_at || new Date()))}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
