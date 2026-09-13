import Stripe from 'stripe';

const stripe = new Stripe('sk_test_51Px9z2P90fWjP0X7mZ2Y5hZ4Q8', {
  apiVersion: '2023-10-16',
});

async function main() {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Test Plan',
            description: 'Test Description',
          },
          unit_amount: 2999,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: 'http://localhost/success',
      cancel_url: 'http://localhost/cancel',
    });
    console.log('Success:', session.url);
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}
main();
