import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface Plan {
  id: number;
  name: string;
  price: number; // cents
  tierLevel: string;
}

const TIER_FEATURES: Record<string, string[]> = {
  free: [
    'Basic athlete profile',
    'Up to 3 highlight videos',
    'College program search',
    'Basic stats display',
  ],
  pro: [
    'Everything in Free',
    'Unlimited highlight videos',
    'Recruiting contact list',
    'Coach outreach tools',
    'Performance analytics',
  ],
  elite: [
    'Everything in Pro',
    'Priority recruiting matching',
    'Direct coach messaging',
    'NIL deal tracker',
    'Dedicated advisor access',
  ],
};

const FALLBACK_PLANS: Plan[] = [
  { id: 0, name: 'Free', price: 0, tierLevel: 'free' },
  { id: 1, name: 'Pro', price: 999, tierLevel: 'pro' },
  { id: 2, name: 'Elite', price: 1999, tierLevel: 'elite' },
];

export const Subscription = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const cancelledMsg = searchParams.get('subscription') === 'cancelled'
    ? 'Checkout was cancelled. No charge was made.'
    : '';

  useEffect(() => {
    fetch('/api/subscription-plans')
      .then(r => r.json())
      .then(data => {
        setPlans(Array.isArray(data) && data.length > 0 ? data : FALLBACK_PLANS);
      })
      .catch(() => setPlans(FALLBACK_PLANS))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = async (plan: Plan) => {
    const raw = localStorage.getItem('user');
    if (!raw) {
      navigate('/auth?redirect=/subscribe');
      return;
    }

    const user = JSON.parse(raw);
    const playerId = user.id;
    const token = localStorage.getItem('token');

    setCheckingOut(plan.id);
    setError('');

    try {
      const res = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          planId: plan.id,
          playerId,
          successUrl: plan.price === 0
            ? `${window.location.origin}/profile`
            : `${window.location.origin}/thank-you?plan=${encodeURIComponent(plan.name)}&amount=${plan.price}&interval=month`,
          cancelUrl: `${window.location.origin}/subscribe?subscription=cancelled`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Checkout failed. Try again.');
        return;
      }

      if (data.free || !data.url) {
        navigate('/profile');
      } else {
        window.location.href = data.url;
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setCheckingOut(null);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading plans...</div>;
  }

  return (
    <div style={{ padding: '40px 24px', maxWidth: '960px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px' }}>
        Choose Your Plan
      </h1>
      <p style={{ color: '#666', marginBottom: '32px' }}>
        Unlock your recruiting potential with H.E.R.S.365
      </p>

      {cancelledMsg && (
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '12px 16px', marginBottom: '24px', color: '#856404' }}>
          {cancelledMsg}
        </div>
      )}

      {error && (
        <div style={{ background: '#f8d7da', border: '1px solid #f5c2c7', borderRadius: '8px', padding: '12px 16px', marginBottom: '24px', color: '#842029' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
        {plans.map(plan => {
          const features = TIER_FEATURES[plan.tierLevel] || [];
          const isPopular = plan.tierLevel === 'pro';
          const isBusy = checkingOut === plan.id;

          return (
            <div
              key={plan.id}
              style={{
                border: isPopular ? '2px solid #7c3aed' : '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '28px 24px',
                position: 'relative',
                background: '#fff',
              }}
            >
              {isPopular && (
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#7c3aed',
                  color: '#fff',
                  padding: '4px 14px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}>
                  Most Popular
                </div>
              )}

              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
                {plan.name}
              </h2>

              <div style={{ marginBottom: '20px' }}>
                {plan.price === 0 ? (
                  <span style={{ fontSize: '2rem', fontWeight: 700 }}>Free</span>
                ) : (
                  <>
                    <span style={{ fontSize: '2rem', fontWeight: 700 }}>
                      ${(plan.price / 100).toFixed(2)}
                    </span>
                    <span style={{ color: '#666', marginLeft: '4px' }}>/month</span>
                  </>
                )}
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', minHeight: '140px' }}>
                {features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '14px' }}>
                    <span style={{ color: '#7c3aed', fontWeight: 700 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelect(plan)}
                disabled={isBusy}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: isBusy ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '15px',
                  background: isPopular ? '#7c3aed' : '#111',
                  color: '#fff',
                  opacity: isBusy ? 0.6 : 1,
                }}
              >
                {isBusy ? 'Redirecting...' : plan.price === 0 ? 'Get Started Free' : `Get ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>

      <p style={{ color: '#999', fontSize: '13px', marginTop: '32px', textAlign: 'center' }}>
        Payments processed securely via Stripe. Cancel anytime.
      </p>
    </div>
  );
};
