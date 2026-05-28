// @ts-nocheck
import express from 'express';
import { db } from './db';
import * as schema from './schema';
import { eq, desc, and, sql, sum } from 'drizzle-orm';
import Stripe from 'stripe';
import { logger } from './logger';

const router = express.Router();

// Initialize Stripe (use test key from env)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2024-12-18.acacia',
});

// ----------------------
// STRIPE CHECKOUT
// ----------------------

// POST /create-checkout-session - Create Stripe checkout session for subscription
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { planId, playerId, successUrl, cancelUrl } = req.body;
    
    if (!planId || !playerId) {
      return res.status(400).json({ error: 'Plan ID and Player ID are required' });
    }
    
    // Get the subscription plan
    const plans = await db.select().from(schema.subscriptionPlans).where(eq(schema.subscriptionPlans.id, planId));
    
    if (plans.length === 0) {
      return res.status(404).json({ error: 'Subscription plan not found' });
    }
    
    const plan = plans[0];
    
    // Free plan - no checkout needed
    if (plan.price === 0) {
      // Directly update player's subscription
      await db.insert(schema.playerSubscriptions).values({
        playerId,
        planId: plan.id,
        status: 'active',
      }).onConflictDoUpdate({
        target: schema.playerSubscriptions.playerId,
        set: { planId: plan.id, status: 'active', updatedAt: new Date() },
      });
      
      await db.update(schema.players)
        .set({ subscriptionTier: plan.tierLevel })
        .where(eq(schema.players.id, playerId));
      
      return res.json({ url: successUrl || '/profile', free: true });
    }
    
    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `H.E.R.S.365 - ${plan.name} Subscription`,
              description: `${plan.name} tier access to H.E.R.S.365 platform`,
            },
            unit_amount: plan.price,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${process.env.ALLOWED_ORIGINS?.split(',')[0] || 'http://localhost:5173'}/thank-you?plan=${encodeURIComponent(plan.name)}&amount=${plan.price}&interval=month`,
      cancel_url: cancelUrl || `${process.env.ALLOWED_ORIGINS?.split(',')[0] || 'http://localhost:5173'}/subscribe?subscription=cancelled`,
      metadata: {
        playerId: playerId.toString(),
        planId: planId.toString(),
        planName: plan.name,
        planPrice: plan.price.toString(),
      },
    });
    
    res.json({ url: session.url, sessionId: session.id });
  } catch (err: any) {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /webhook - Handle Stripe webhooks
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;
  
  try {
    if (sig && endpointSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else {
      event = JSON.parse(req.body.toString());
    }
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle subscription events
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const playerId = parseInt(session.metadata?.playerId || '0');
      const planId = parseInt(session.metadata?.planId || '0');
      
      console.log(`🔔 Webhook: Checkout session completed for player ${playerId}, plan ${planId}`);
      
      if (playerId && planId) {
        // Update player's subscription
        await db.insert(schema.playerSubscriptions).values({
          playerId,
          planId,
          stripeSubscriptionId: session.subscription as string,
          status: 'active',
        }).onConflictDoUpdate({
          target: schema.playerSubscriptions.playerId,
          set: { 
            planId, 
            stripeSubscriptionId: session.subscription as string,
            status: 'active', 
            updatedAt: new Date() 
          },
        });
        
        // Get plan and update player tier
        const plans = await db.select().from(schema.subscriptionPlans).where(eq(schema.subscriptionPlans.id, planId));
        if (plans.length > 0) {
          await db.update(schema.players)
            .set({ subscriptionTier: plans[0].tierLevel })
            .where(eq(schema.players.id, playerId));
        }
        
        // Record payment
        await db.insert(schema.payments).values({
          playerId,
          amount: session.amount_total || 0,
          currency: session.currency || 'usd',
          status: 'completed',
          paymentMethod: 'card',
          paymentType: 'subscription',
          description: `${plans[0]?.name || 'Subscription'} - Monthly`,
          stripePaymentIntentId: session.payment_intent as string,
          stripeCustomerId: session.customer as string,
          paidAt: new Date(),
        });
      }
      break;
    }
    
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      console.log(`🔔 Webhook: Subscription deleted: ${subscription.id}`);
      
      // Find and deactivate subscription
      const subs = await db.select().from(schema.playerSubscriptions)
        .where(eq(schema.playerSubscriptions.stripeSubscriptionId, subscription.id));
      
      if (subs.length > 0) {
        await db.update(schema.playerSubscriptions)
          .set({ status: 'cancelled', updatedAt: new Date() })
          .where(eq(schema.playerSubscriptions.id, subs[0].id));
        
        // Downgrade player to free
        await db.update(schema.players)
          .set({ subscriptionTier: 'free' })
          .where(eq(schema.players.id, subs[0].playerId));
      }
      break;
    }
    
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
  
  res.json({ received: true });
});

// GET /customer-portal - Create Stripe customer portal session
router.get('/customer-portal/:playerId', async (req, res) => {
  try {
    const playerId = parseInt(req.params.playerId);
    
    // Find player's subscription
    const subs = await db.select().from(schema.playerSubscriptions)
      .where(eq(schema.playerSubscriptions.playerId, playerId));
    
    if (subs.length === 0 || !subs[0].stripeSubscriptionId) {
      return res.status(404).json({ error: 'No active subscription found' });
    }
    
    // Get Stripe subscription to find customer ID
    const subscription = await stripe.subscriptions.retrieve(subs[0].stripeSubscriptionId);
    const customerId = subscription.customer as string;
    
    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.ALLOWED_ORIGINS?.split(',')[0] || 'http://localhost:5173'}/settings`,
    });
    
    res.json({ url: session.url });
  } catch (err: any) {
    console.error('Customer portal error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------
// PAYMENTS
// ----------------------

// GET /payments - Get all payments (with optional filters)
router.get('/payments', async (req, res) => {
    try {
        const { playerId, status, paymentType, startDate, endDate } = req.query;

        let filters = [];
        if (playerId) filters.push(eq(schema.payments.playerId, parseInt(playerId as string)));
        if (status) filters.push(eq(schema.payments.status, status as string));
        if (paymentType) filters.push(eq(schema.payments.paymentType, paymentType as string));

        let query = db.select().from(schema.payments);

        if (filters.length > 0) {
            query = query.where(and(...filters));
        }

        const payments = await query.orderBy(desc(schema.payments.createdAt));
        res.json(payments);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /payments/:id - Get a specific payment
router.get('/payments/:id', async (req, res) => {
    try {
        const paymentId = parseInt(req.params.id);
        const payment = await db.select().from(schema.payments).where(eq(schema.payments.id, paymentId));

        if (!payment[0]) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        res.json(payment[0]);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /payments/player/:playerId - Get payments for a specific kid/player
router.get('/payments/player/:playerId', async (req, res) => {
    try {
        const playerId = parseInt(req.params.playerId);
        const payments = await db.select({
            ...schema.payments,
            playerName: schema.players.name,
        })
            .from(schema.payments)
            .leftJoin(schema.players, eq(schema.payments.playerId, schema.players.id))
            .where(eq(schema.payments.playerId, playerId))
            .orderBy(desc(schema.payments.createdAt));

        res.json(payments);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /payments - Create a new payment record
router.post('/payments', async (req, res) => {
    try {
        const {
            playerId,
            amount,
            currency = 'usd',
            paymentMethod,
            paymentType,
            description,
            stripePaymentIntentId,
            stripeCustomerId,
            parentName,
            parentEmail,
            parentPhone,
            notes
        } = req.body;

        if (!amount) {
            return res.status(400).json({ error: 'Amount is required' });
        }

        const newPayment = await db.insert(schema.payments).values({
            playerId,
            amount,
            currency,
            paymentMethod,
            paymentType,
            description,
            stripePaymentIntentId,
            stripeCustomerId,
            parentName,
            parentEmail,
            parentPhone,
            notes,
            status: 'pending',
        }).returning();

        res.json(newPayment[0]);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /payments/:id - Update payment status
router.patch('/payments/:id', async (req, res) => {
    try {
        const paymentId = parseInt(req.params.id);
        const {
            status,
            paidAt,
            receiptUrl,
            notes,
            stripePaymentIntentId
        } = req.body;

        const updatedPayment = await db.update(schema.payments)
            .set({
                ...(status && { status }),
                ...(paidAt && { paidAt: new Date(paidAt) }),
                ...(receiptUrl && { receiptUrl }),
                ...(notes && { notes }),
                ...(stripePaymentIntentId && { stripePaymentIntentId }),
                updatedAt: new Date(),
            })
            .where(eq(schema.payments.id, paymentId))
            .returning();

        if (!updatedPayment[0]) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        res.json(updatedPayment[0]);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /payments/:id/complete - Mark payment as completed
router.post('/payments/:id/complete', async (req, res) => {
    try {
        const paymentId = parseInt(req.params.id);
        const { receiptUrl } = req.body;

        const updatedPayment = await db.update(schema.payments)
            .set({
                status: 'completed',
                paidAt: new Date(),
                ...(receiptUrl && { receiptUrl }),
                updatedAt: new Date(),
            })
            .where(eq(schema.payments.id, paymentId))
            .returning();

        if (!updatedPayment[0]) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        res.json(updatedPayment[0]);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /payments/:id/refund - Refund a payment
router.post('/payments/:id/refund', async (req, res) => {
    try {
        const paymentId = parseInt(req.params.id);
        const { reason, feedback } = req.body;

        // Get payment details
        const payment = await db.select().from(schema.payments).where(eq(schema.payments.id, paymentId));
        if (!payment[0]) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        // If payment was processed via Stripe, attempt to refund through Stripe
        if (payment[0].stripePaymentIntentId) {
            try {
                await stripe.refunds.create({
                    payment_intent: payment[0].stripePaymentIntentId,
                    reason: 'requested_by_customer',
                });
            } catch (stripeErr: any) {
                console.error('Stripe refund error:', stripeErr);
                // Continue with refund even if Stripe fails (manual processing)
            }
        }

        const updatedPayment = await db.update(schema.payments)
            .set({
                status: 'refunded',
                notes: reason ? `Refunded: ${reason}${feedback ? ` - ${feedback}` : ''}` : 'Refunded',
                updatedAt: new Date(),
            })
            .where(eq(schema.payments.id, paymentId))
            .returning();

        // Check if this was a subscription payment and update subscription status
        if (payment[0].paymentType === 'subscription') {
            await db.update(schema.playerSubscriptions)
                .set({ status: 'cancelled', updatedAt: new Date() })
                .where(eq(schema.playerSubscriptions.playerId, payment[0].playerId));

            // Downgrade player to free tier
            await db.update(schema.players)
                .set({ subscriptionTier: 'free' })
                .where(eq(schema.players.id, payment[0].playerId));
        }

        res.json(updatedPayment[0]);
    } catch (err: any) {
        console.error('Refund error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ----------------------
// PAYMENT METHODS
// ----------------------

// GET /payment-methods/player/:playerId - Get payment methods for a player
router.get('/payment-methods/player/:playerId', async (req, res) => {
    try {
        const playerId = parseInt(req.params.playerId);
        const methods = await db.select()
            .from(schema.paymentMethods)
            .where(eq(schema.paymentMethods.playerId, playerId))
            .orderBy(desc(schema.paymentMethods.isDefault), desc(schema.paymentMethods.createdAt));

        res.json(methods);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /payment-methods - Add a payment method
router.post('/payment-methods', async (req, res) => {
    try {
        const {
            playerId,
            type,
            last4,
            brand,
            expiryMonth,
            expiryYear,
            stripePaymentMethodId,
            isDefault = false
        } = req.body;

        if (!playerId || !type) {
            return res.status(400).json({ error: 'PlayerId and type are required' });
        }

        // If this is set as default, unset other defaults
        if (isDefault) {
            await db.update(schema.paymentMethods)
                .set({ isDefault: false })
                .where(eq(schema.paymentMethods.playerId, playerId));
        }

        const newMethod = await db.insert(schema.paymentMethods).values({
            playerId,
            type,
            last4,
            brand,
            expiryMonth,
            expiryYear,
            stripePaymentMethodId,
            isDefault,
        }).returning();

        res.json(newMethod[0]);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /payment-methods/:id - Remove a payment method
router.delete('/payment-methods/:id', async (req, res) => {
    try {
        const methodId = parseInt(req.params.id);

        await db.delete(schema.paymentMethods)
            .where(eq(schema.paymentMethods.id, methodId));

        res.json({ success: true, message: 'Payment method removed' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ----------------------
// INVOICES
// ----------------------

// GET /invoices - Get all invoices
router.get('/invoices', async (req, res) => {
    try {
        const { playerId, status } = req.query;

        let filters = [];
        if (playerId) filters.push(eq(schema.invoices.playerId, parseInt(playerId as string)));
        if (status) filters.push(eq(schema.invoices.status, status as string));

        let query = db.select({
            ...schema.invoices,
            playerName: schema.players.name,
        })
            .from(schema.invoices)
            .leftJoin(schema.players, eq(schema.invoices.playerId, schema.players.id));

        if (filters.length > 0) {
            query = query.where(and(...filters)) as any;
        }

        const invoices = await query.orderBy(desc(schema.invoices.createdAt));
        res.json(invoices);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /invoices - Create an invoice
router.post('/invoices', async (req, res) => {
    try {
        const {
            playerId,
            invoiceNumber,
            amount,
            tax = 0,
            description,
            lineItems,
            dueDate
        } = req.body;

        if (!playerId || !invoiceNumber || !amount) {
            return res.status(400).json({ error: 'PlayerId, invoiceNumber, and amount are required' });
        }

        const total = amount + tax;

        const newInvoice = await db.insert(schema.invoices).values({
            playerId,
            invoiceNumber,
            amount,
            tax,
            total,
            description,
            lineItems,
            dueDate: dueDate ? new Date(dueDate) : null,
            status: 'draft',
        }).returning();

        res.json(newInvoice[0]);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /invoices/:id - Update invoice (e.g., mark as paid)
router.patch('/invoices/:id', async (req, res) => {
    try {
        const invoiceId = parseInt(req.params.id);
        const { status, paidAt } = req.body;

        const updatedInvoice = await db.update(schema.invoices)
            .set({
                ...(status && { status }),
                ...(paidAt && { paidAt: new Date(paidAt) }),
            })
            .where(eq(schema.invoices.id, invoiceId))
            .returning();

        if (!updatedInvoice[0]) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        res.json(updatedInvoice[0]);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ----------------------
// DASHBOARD / ANALYTICS
// ----------------------

// GET /payments/summary - Get payment summary stats
router.get('/payments/summary', async (req, res) => {
    try {
        const { startDate, endDate, playerId } = req.query;

        let dateFilter = undefined;
        if (startDate || endDate) {
            // For now, just get all - can be enhanced with date filtering
        }

        // Total revenue
        const revenueResult = await db.select({
            total: sum(schema.payments.amount),
        })
            .from(schema.payments)
            .where(eq(schema.payments.status, 'completed'));

        // Pending payments
        const pendingResult = await db.select({
            total: sum(schema.payments.amount),
        })
            .from(schema.payments)
            .where(eq(schema.payments.status, 'pending'));

        // Payment count by status
        const statusCounts = await db.select({
            status: schema.payments.status,
            count: sql<number>`count(*)::int`,
        })
            .from(schema.payments)
            .groupBy(schema.payments.status);

        // Recent payments
        const recentPayments = await db.select({
            ...schema.payments,
            playerName: schema.players.name,
        })
            .from(schema.payments)
            .leftJoin(schema.players, eq(schema.payments.playerId, schema.players.id))
            .orderBy(desc(schema.payments.createdAt))
            .limit(10);

        // Payment types breakdown
        const typeBreakdown = await db.select({
            paymentType: schema.payments.paymentType,
            total: sum(schema.payments.amount),
            count: sql<number>`count(*)::int`,
        })
            .from(schema.payments)
            .where(eq(schema.payments.status, 'completed'))
            .groupBy(schema.payments.paymentType);

        res.json({
            totalRevenue: revenueResult[0]?.total || 0,
            pendingAmount: pendingResult[0]?.total || 0,
            statusCounts: statusCounts.reduce((acc, row) => {
                acc[row.status] = row.count;
                return acc;
            }, {}),
            recentPayments,
            typeBreakdown: typeBreakdown.map(t => ({
                type: t.paymentType || 'unknown',
                total: t.total || 0,
                count: t.count,
            })),
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /payments/player/:playerId/summary - Get payment summary for a specific kid
router.get('/payments/player/:playerId/summary', async (req, res) => {
    try {
        const playerId = parseInt(req.params.playerId);

        // Total paid
        const paidResult = await db.select({
            total: sum(schema.payments.amount),
        })
            .from(schema.payments)
            .where(and(
                eq(schema.payments.playerId, playerId),
                eq(schema.payments.status, 'completed')
            ));

        // Total pending
        const pendingResult = await db.select({
            total: sum(schema.payments.amount),
        })
            .from(schema.payments)
            .where(and(
                eq(schema.payments.playerId, playerId),
                eq(schema.payments.status, 'pending')
            ));

        // Payment history
        const history = await db.select()
            .from(schema.payments)
            .where(eq(schema.payments.playerId, playerId))
            .orderBy(desc(schema.payments.createdAt));

        res.json({
            totalPaid: paidResult[0]?.total || 0,
            totalPending: pendingResult[0]?.total || 0,
            paymentCount: history.length,
            history,
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
