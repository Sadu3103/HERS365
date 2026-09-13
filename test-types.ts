import Stripe from 'stripe';

const session: Stripe.Checkout.SessionCreateParams = {
  line_items: [],
  mode: 'subscription',
  success_url: 'http',
  payment_method_types: ['card'],
  // @ts-ignore
  managed_payments: { enabled: false },
};
