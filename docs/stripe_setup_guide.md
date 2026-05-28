# Stripe Setup Guide for H.E.R.S.365

Follow these steps to connect your Stripe account to the H.E.R.S.365 platform.

## 1. Get API Keys
1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com/).
2. Navigate to **Developers** > **API keys**.
3. Copy your **Publishable key** and **Secret key**.
   - Use the **Test mode** keys for development.
   - Update `client/.env` with the `VITE_STRIPE_PUBLISHABLE_KEY`.
   - Update `server/.env` with the `STRIPE_SECRET_KEY`.

## 2. Configure Webhooks
1. In the Stripe Dashboard, go to **Developers** > **Webhooks**.
2. Click **Add endpoint**.
3. Set the **Endpoint URL** to your server's webhook address:
   - For production: `https://your-api-domain.com/payments/webhook`
   - For local testing: Use the [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward events: `stripe listen --forward-to localhost:5000/payments/webhook`
4. Select the following events:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
5. After creating the endpoint, copy the **Signing secret** (starts with `whsec_`) and add it to `server/.env` as `STRIPE_WEBHOOK_SECRET`.

## 3. Create Products and Prices
The current implementation uses dynamic price creation (`price_data`), so you don't *need* to pre-create products in Stripe. However, ensure your `subscription_plans` table in the database matches the tiers you want to offer:
- **Rookie**: $0 (Free)
- **Pro**: $9.99/mo
- **Elite**: $29.99/mo

## 4. Verification
Once configured, test the flow by:
1. Registering a new athlete.
2. Navigating to the **Subscription** page.
3. Choosing a plan and completing the Stripe Checkout (use test card `4242...`).
4. Verifying that the athlete's profile now shows the correct tier and unlocks the **Scholarship Tracker**.
