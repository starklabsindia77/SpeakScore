import { FastifyInstance } from 'fastify';
import { db, withTenantTransaction, assertSafeSchemaName } from '../../db';
import { sql } from 'kysely';
import { RazorpayService } from '../../services/billing/razorpay';
import { randomUUID } from 'crypto';

export default async function billingRoutes(app: FastifyInstance) {
    // Determine cost per credit (e.g. 1 credit = 1 INR for now, or fetch from settings)
    // For MVP transparency: 1 Credit = 1 INR. 
    // Minimal purchase: 100 Credits.

    app.post('/order', { preHandler: [app.authorize(['ORG_ADMIN', 'SUPER_ADMIN'])] }, async (request, reply) => {
        const { credits } = request.body as { credits: number };
        if (!credits || credits < 10) {
            return reply.badRequest('Minimum 10 credits required');
        }

        const amount = credits * 1; // 1 INR per credit
        const receipt = `rcpt_${randomUUID().split('-')[0]}`;

        try {
            const order = await RazorpayService.createOrder(amount, 'INR', receipt);
            return {
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                keyId: await RazorpayService.getKeyId()
            };
        } catch (err: any) {
            request.log.error(err, 'Razorpay Order Creation Failed');
            return reply.internalServerError('Payment initialization failed: ' + err.message);
        }
    });

    app.post('/verify', { preHandler: [app.authorize(['ORG_ADMIN', 'SUPER_ADMIN'])] }, async (request, reply) => {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, credits } = request.body as any;
        const tenantId = request.headers['x-tenant-id'] as string;

        // Use user's org if not specified in header (for simple calls)
        const orgId = tenantId || request.user?.orgId;
        if (!orgId) return reply.badRequest('Organization context missing');

        // Verify signature
        try {
            const isValid = await RazorpayService.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
            if (!isValid) return reply.badRequest('Invalid payment signature');
        } catch (err) {
            return reply.badRequest('Payment verification failed');
        }

        // Get Schema Name
        const org = await db.selectFrom('organizations').select('schema_name').where('id', '=', orgId).executeTakeFirst();
        if (!org) return reply.notFound('Organization not found');

        // Helper to check if already processed
        const alreadyProcessed = await withTenantTransaction(org.schema_name, async (trx) => {
            const existing = await trx.selectFrom('credit_purchases').select('id').where('razorpay_order_id', '=', razorpay_order_id).executeTakeFirst();
            return !!existing;
        });

        if (alreadyProcessed) {
            return { success: true, message: 'Already processed' };
        }

        // Add Credits and Log Transaction
        await db.transaction().execute(async (trx) => {
            // 1. Update Global Balance
            await trx.updateTable('organizations')
                .set((eb) => ({
                    credits_balance: sql`credits_balance + ${Number(credits)}`,
                    updated_at: new Date()
                }))
                .where('id', '=', orgId)
                .execute();

            // 2. Log in Tenant Schema
            await withTenantTransaction(org.schema_name, async (tenantTrx) => {
                await tenantTrx.insertInto('credit_purchases')
                    .values({
                        id: randomUUID(),
                        razorpay_order_id,
                        razorpay_payment_id,
                        amount: Number(credits), // Assuming 1:1
                        credits: Number(credits),
                        currency: 'INR',
                        status: 'SUCCESS',
                        meta_json: JSON.stringify({ verified: true }),
                        created_at: new Date(),
                        updated_at: new Date()
                    })
                    .execute();
            });
        });

        return { success: true, newBalance: 'updated' };
    });
}
