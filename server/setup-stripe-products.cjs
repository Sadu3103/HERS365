const Stripe = require('stripe');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia',
});

async function setupProducts() {
  try {
    console.log('Setting up Stripe Products and Prices...');

    // Create PRO Product
    console.log('Creating Pro Tier Product...');
    const proProduct = await stripe.products.create({
      name: 'H.E.R.S.365 - Pro Subscription',
      description: 'Pro tier access to H.E.R.S.365 platform',
    });

    const proPrice = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 999, // $9.99
      currency: 'usd',
      recurring: { interval: 'month' },
    });
    console.log(`✅ Pro Price ID: ${proPrice.id}`);

    // Create ELITE Product
    console.log('Creating Elite Tier Product...');
    const eliteProduct = await stripe.products.create({
      name: 'H.E.R.S.365 - Elite Subscription',
      description: 'Elite tier access to H.E.R.S.365 platform',
    });

    const elitePrice = await stripe.prices.create({
      product: eliteProduct.id,
      unit_amount: 2999, // $29.99
      currency: 'usd',
      recurring: { interval: 'month' },
    });
    console.log(`✅ Elite Price ID: ${elitePrice.id}`);

    // Append to .env
    const envPath = path.join(__dirname, '../.env');
    const envAppend = `\nSTRIPE_PRO_PRICE_ID=${proPrice.id}\nSTRIPE_ELITE_PRICE_ID=${elitePrice.id}\n`;
    
    fs.appendFileSync(envPath, envAppend);
    console.log('\n🚀 Successfully added STRIPE_PRO_PRICE_ID and STRIPE_ELITE_PRICE_ID to .env!');

  } catch (error) {
    console.error('Error setting up Stripe:', error.message);
  }
}

setupProducts();
