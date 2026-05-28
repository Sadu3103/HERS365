/**
 * Mock Webhook Test Utility
 * Use this to simulate a successful Stripe payment without a real Stripe account.
 * 
 * Usage: node mock_webhook_test.js <playerId> <planId>
 */

const http = require('http');

const playerId = process.argv[2] || '1';
const planId = process.argv[3] || '2'; // 2 = Pro, 3 = Elite

const mockEvent = {
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_mock_session',
      customer: 'cus_mock_customer',
      subscription: 'sub_mock_subscription',
      amount_total: 999,
      currency: 'usd',
      payment_intent: 'pi_mock_intent',
      metadata: {
        playerId: playerId,
        planId: planId
      }
    }
  }
};

const data = JSON.stringify(mockEvent);

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/payments/webhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    // Note: Signature is skipped because we're sending JSON directly 
    // and we'll temporarily disable verification in paymentRoutes for this test
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.write(data);
req.end();

console.log(`🚀 Sending mock webhook for Player ${playerId}, Plan ${planId}...`);
