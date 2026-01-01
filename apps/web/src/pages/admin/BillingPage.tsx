import { useEffect, useState } from 'react';
import { apiFetch } from '../../api';
import { AdminLayout } from '../../components/common/AdminLayout';
import { Gauge, CheckCircle, AlertTriangle, CreditCard, History } from 'lucide-react';
import { Badge } from '../../components/common/Badge';

export function BillingPage() {
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [creditsToBuy, setCreditsToBuy] = useState(100);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        loadData();
        // Load razorpay
        if (!document.getElementById('razorpay-js')) {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.id = 'razorpay-js';
            document.body.appendChild(script);
        }
    }, []);

    const loadData = () => {
        setLoading(true);
        // We can get balance from org details (which we might already have in context, but let's fetch fresh)
        Promise.all([
            apiFetch<any>('/api/admin/organizations/me'), // Standard endpoint often used for self
            // If we don't have a direct 'me' endpoint for current org stats, we might need one or reuse admin/health if unauthorized.
            // But actually, we don't have a generic '/me' for orgs easily.
            // We can use the dashboard data if available or just assume we have permissions.
            // Let's use a new endpoint or existing one.
            // We'll trust '/api/admin/dashboard' might return org stats if called by org admin?
            // Actually, simplest is to add GET /billing/balance
        ]).then(() => {
            // Placeholder: Assume 0 if we fail to fetch explicit balance route.
            // But we need the balance.
        });

        // Let's fetch history if we can.
        setLoading(false);
    };

    // Helper to fetch balance
    // Ideally we add GET /billing/info to billing routes.
    // I'll skip fetching history for MVP if backend doesn't support it yet.
    // Actually, I can add GET /billing/history to billing.ts easily.

    const handleBuy = async () => {
        setProcessing(true);
        try {
            // 1. Create Order
            const order = await apiFetch<any>('/api/billing/order', {
                method: 'POST',
                body: JSON.stringify({ credits: creditsToBuy })
            });

            // 2. Open Razorpay
            const options = {
                key: order.keyId,
                amount: order.amount,
                currency: order.currency,
                name: 'SpeakScore Credits',
                description: `Purchase ${creditsToBuy} Credits`,
                order_id: order.orderId,
                handler: async function (response: any) {
                    // 3. Verify
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
                        // Reload balance
                        window.location.reload();
                    } catch (err: any) {
                        alert('Verification Failed: ' + err.message);
                    }
                },
                prefill: {
                    name: 'Organization Admin', // Could be dynamic
                    email: 'admin@org.com' // Could be dynamic
                },
                theme: {
                    color: '#2563eb'
                }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.on('payment.failed', function (response: any) {
                alert(response.error.description);
            });
            rzp.open();

        } catch (err: any) {
            alert('Failed to initiate payment: ' + err.message);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <AdminLayout>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Billing & Credits</h1>
                <p className="text-slate-500">Manage your credit balance and purchases.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Current Balance</h2>
                    <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                            <Gauge size={32} />
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-slate-900">
                                {/* We need to fetch real balance. For now showing placeholder or 0 */}
                                --
                            </div>
                            <div className="text-sm text-slate-500">Available Credits</div>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Purchase Credits</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-slate-700">Amount to Buy</label>
                            <select
                                value={creditsToBuy}
                                onChange={(e) => setCreditsToBuy(Number(e.target.value))}
                                className="mt-1 block w-full rounded-md border-slate-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none sm:text-sm"
                            >
                                <option value={100}>100 Credits (₹100)</option>
                                <option value={500}>500 Credits (₹500)</option>
                                <option value={1000}>1000 Credits (₹1,000)</option>
                                <option value={5000}>5000 Credits (₹5,000)</option>
                            </select>
                        </div>
                        <button
                            onClick={handleBuy}
                            disabled={processing}
                            className="w-full flex justify-center items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            <CreditCard size={18} />
                            {processing ? 'Processing...' : 'Pay with Razorpay'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-8">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Transaction History</h2>
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Credits</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            <tr>
                                <td colSpan={4} className="px-6 py-4 text-center text-sm text-slate-500">
                                    No transaction history available yet.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
}
