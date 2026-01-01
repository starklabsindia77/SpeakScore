import { useEffect, useState } from 'react';
import { apiFetch } from '../../api';
import { AdminLayout } from '../../components/common/AdminLayout';
import { Gauge, CreditCard, Banknote, TrendingUp } from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../auth';
import { formatDate } from '../../utils/date';

export function BillingPage() {
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    const [balance, setBalance] = useState<number | null>(null);
    const [stats, setStats] = useState<{ totalRevenue: number; totalCreditsSold: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [creditsToBuy, setCreditsToBuy] = useState(100);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        loadData();
        if (!isSuperAdmin) {
            // Load razorpay script for Org Admins
            if (!document.getElementById('razorpay-js')) {
                const script = document.createElement('script');
                script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                script.id = 'razorpay-js';
                document.body.appendChild(script);
            }
        }
    }, [isSuperAdmin]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (isSuperAdmin) {
                const [statsData, txData] = await Promise.all([
                    apiFetch<any>('/api/admin/billing/stats'),
                    apiFetch<any>('/api/admin/billing/transactions')
                ]);
                setStats(statsData);
                setHistory(txData);
            } else {
                try {
                    const orgData = await apiFetch<any>('/api/org/me');
                    setBalance(orgData?.creditsBalance ?? 0);
                } catch (e) {
                    setBalance(0);
                }
                // Organization users' specific history could be fetched here if endpoint exists
            }
        } catch (err) {
            console.error('Failed to load billing data', err);
        } finally {
            setLoading(false);
        }
    };

    const handleBuy = async () => {
        setProcessing(true);
        try {
            const order = await apiFetch<any>('/api/billing/order', {
                method: 'POST',
                body: JSON.stringify({ credits: creditsToBuy })
            });

            const options = {
                key: order.keyId,
                amount: order.amount,
                currency: order.currency,
                name: 'SpeakScore Credits',
                description: `Purchase ${creditsToBuy} Credits`,
                order_id: order.orderId,
                handler: async function (response: any) {
                    try {
                        await apiFetch('/api/billing/verify', {
                            method: 'POST',
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                credits: creditsToBuy
                            })
                        });
                        alert('Payment Successful! Credits added.');
                        loadData();
                    } catch (err: any) {
                        alert('Verification Failed: ' + err.message);
                    }
                },
                prefill: {
                    name: user?.email.split('@')[0] || 'Admin',
                    email: user?.email
                },
                theme: { color: '#2563eb' }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.on('payment.failed', (response: any) => alert(response.error.description));
            rzp.open();
        } catch (err: any) {
            alert('Failed to initiate payment: ' + err.message);
        } finally {
            setProcessing(false);
        }
    };

    if (loading && history.length === 0) {
        return (
            <AdminLayout>
                <div className="flex h-[50vh] items-center justify-center">
                    <p className="text-slate-500 italic">Loading billing data...</p>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 border-b pb-2">
                    {isSuperAdmin ? 'Platform Revenue' : 'Billing & Credits'}
                </h1>
                <p className="text-slate-500 mt-2">
                    {isSuperAdmin
                        ? 'Overview of platform revenue and global transactions across all organizations.'
                        : 'Manage your organization\'s credit balance and purchase history.'}
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm ring-1 ring-slate-100/50">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">
                        {isSuperAdmin ? 'Total Revenue' : 'Current Balance'}
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${isSuperAdmin ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                            {isSuperAdmin ? <Banknote size={32} /> : <Gauge size={32} />}
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-slate-900">
                                {isSuperAdmin
                                    ? `₹${stats?.totalRevenue.toLocaleString() || '0'}`
                                    : (balance !== null ? balance.toLocaleString() : '--')}
                            </div>
                            <div className="text-sm text-slate-500 font-medium">
                                {isSuperAdmin ? 'Lifetime Platform Revenue' : 'Available Credits'}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm ring-1 ring-slate-100/50">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">
                        {isSuperAdmin ? 'Credits Summary' : 'Purchase Credits'}
                    </h2>
                    {isSuperAdmin ? (
                        <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
                                <TrendingUp size={32} />
                            </div>
                            <div>
                                <div className="text-3xl font-bold text-slate-900">
                                    {stats?.totalCreditsSold.toLocaleString() || '0'}
                                </div>
                                <div className="text-sm text-slate-500 font-medium">Total Credits Sold</div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700">Amount to Buy</label>
                                <select
                                    value={creditsToBuy}
                                    onChange={(e) => setCreditsToBuy(Number(e.target.value))}
                                    className="mt-1 block w-full rounded-lg border-slate-200 py-2.5 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                                >
                                    {[100, 500, 1000, 5000].map(val => (
                                        <option key={val} value={val}>{val} Credits (₹{val.toLocaleString()})</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={handleBuy}
                                disabled={processing}
                                className="w-full flex justify-center items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-200 transition-all"
                            >
                                <CreditCard size={18} />
                                {processing ? 'Processing...' : 'Pay with Razorpay'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-10">
                <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-lg font-semibold text-slate-900">
                        {isSuperAdmin ? 'Global Transaction History' : 'Transaction History'}
                    </h2>
                    {isSuperAdmin && <Badge tone="neutral">{history.length} Recent</Badge>}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xl shadow-slate-200/20">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50 text-slate-500">
                            <tr>
                                {isSuperAdmin && <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest">Organization</th>}
                                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest">Date</th>
                                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest">Amount</th>
                                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest">Credits</th>
                                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {history.length > 0 ? (
                                history.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors group">
                                        {isSuperAdmin && (
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                                                {tx.orgName}
                                            </td>
                                        )}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {formatDate(tx.created_at)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800 uppercase">
                                            {tx.currency} {tx.amount.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                                            {tx.credits.toLocaleString()} pts
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Badge tone={tx.status === 'SUCCESS' ? 'success' : 'warning'}>
                                                {tx.status}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={isSuperAdmin ? 5 : 4} className="px-6 py-20 text-center text-sm text-slate-400 italic">
                                        No transaction records found matching your criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    {loading && history.length > 0 && (
                        <div className="py-2 text-center bg-slate-50/50 border-t">
                            <span className="text-xs text-slate-400 animate-pulse">Refreshing data...</span>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
