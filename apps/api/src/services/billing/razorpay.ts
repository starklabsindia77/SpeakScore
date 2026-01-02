import Razorpay from 'razorpay';
import { db } from '../../db';

export class RazorpayService {
    private static instance: Razorpay | null = null;

    static async getKeyId() {
        const setting = await db.selectFrom('platform_settings')
            .select('value')
            .where('key', '=', 'billing_config')
            .executeTakeFirst();
        return (setting?.value as any)?.razorpay?.keyId;
    }

    private static async getInstance() {
        if (this.instance) return this.instance;

        const setting = await db.selectFrom('platform_settings')
            .select('value')
            .where('key', '=', 'billing_config')
            .executeTakeFirst();

        const config = (setting?.value as any)?.razorpay;

        if (!config?.keyId || !config?.keySecret) {
            throw new Error('Razorpay is not configured');
        }

        this.instance = new Razorpay({
            key_id: config.keyId,
            key_secret: config.keySecret
        });

        return this.instance;
    }

    static async createOrder(amount: number, currency: string = 'INR', receipt: string) {
        const rzp = await this.getInstance();
        return rzp.orders.create({
            amount: amount * 100, // Amount in paise
            currency,
            receipt,
            payment_capture: true
        });
    }

    static async verifySignature(orderId: string, paymentId: string, signature: string) {
        const rzp = await this.getInstance();
        const { validatePaymentVerification } = require('razorpay/dist/utils/razorpay-utils');

        // Fetch secret again to be sure (or store it on instance if needed)
        const setting = await db.selectFrom('platform_settings')
            .select('value')
            .where('key', '=', 'billing_config')
            .executeTakeFirst();
        const secret = (setting?.value as any)?.razorpay?.keySecret;

        return validatePaymentVerification(
            { order_id: orderId, payment_id: paymentId },
            signature,
            secret
        );
    }
}
