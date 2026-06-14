import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const INK = '#0a0a0a';
const INK_2 = '#111111';
const FLAME = '#ff5a2d';
const LINE = 'rgba(255,255,255,0.07)';
const MUTED = '#8a8a86';
const WHITE = '#ffffff';

interface FAQItem {
  q: string;
  a: string;
}

interface FAQCategory {
  label: string;
  items: FAQItem[];
}

const FAQ_DATA: FAQCategory[] = [
  {
    label: 'Getting Started',
    items: [
      {
        q: 'What is HERS365?',
        a: 'The leading recruiting platform built exclusively for girls flag football athletes. Create a profile, log your performance stats, upload game film, and get in front of 380+ coaches actively scouting the platform.',
      },
      {
        q: 'Is it free to join?',
        a: 'Yes. Every athlete can create a free Rookie profile with basic ranking and community access. Pro ($9.99/mo) and Elite ($29.99/mo) plans unlock priority visibility, unlimited film uploads, and coach DM access.',
      },
      {
        q: 'How old do I need to be?',
        a: 'HERS365 is designed for high school athletes in grades 9–12. Athletes under 13 require parental consent to create an account.',
      },
    ],
  },
  {
    label: 'The HERS Rating',
    items: [
      {
        q: 'How is my HERS Rating calculated?',
        a: 'Your rating is built from verified combine data, game film stats, coach reviews, and competitive placement. It updates weekly as you log new performances.',
      },
      {
        q: 'Can I improve my rating?',
        a: 'Absolutely. Log every combine, upload game film consistently, and connect with coaches through the platform. Each verified activity adds to your score.',
      },
    ],
  },
  {
    label: 'Recruiting',
    items: [
      {
        q: 'How do coaches find my profile?',
        a: 'Coaches on the grid can filter athletes by position, state, graduating class, and HERS Rating. Pro and Elite profiles receive priority placement in search results.',
      },
      {
        q: 'How do I contact a coach?',
        a: 'Coach DM access is available on Pro and Elite plans. All coach-athlete communication on HERS365 is routed through the parent/guardian dashboard for safety.',
      },
    ],
  },
  {
    label: 'Parents',
    items: [
      {
        q: 'How does parental access work?',
        a: 'Parents create a linked account through the Parent Hub. They can review all coach communications, set privacy settings, and approve or block contacts.',
      },
      {
        q: "Is my daughter's data safe?",
        a: 'We comply with COPPA and never share personal data with third parties without consent. Parents can request full data deletion at any time.',
      },
    ],
  },
  {
    label: 'Technical',
    items: [
      {
        q: 'What devices is HERS365 available on?',
        a: 'HERS365 works in any modern web browser on desktop, tablet, or mobile.',
      },
      {
        q: 'How do I cancel my subscription?',
        a: 'You can cancel anytime from Profile → Settings → Subscription. Your access continues until the end of the billing period.',
      },
    ],
  },
];

const AccordionItem = ({
  item,
  isOpen,
  onToggle,
}: {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
}) => (
  <div
    style={{
      borderBottom: `1px solid ${LINE}`,
      overflow: 'hidden',
    }}
  >
    <button
      onClick={onToggle}
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 24px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        gap: 16,
      }}
    >
      <span
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 700,
          fontSize: 17,
          letterSpacing: '0.03em',
          textTransform: 'uppercase',
          color: isOpen ? FLAME : WHITE,
          lineHeight: 1.2,
          transition: 'color 0.2s ease',
        }}
      >
        {item.q}
      </span>
      <ChevronDown
        size={18}
        color={isOpen ? FLAME : MUTED}
        style={{
          flexShrink: 0,
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.25s ease, color 0.2s ease',
        }}
      />
    </button>
    <div
      style={{
        maxHeight: isOpen ? 400 : 0,
        overflow: 'hidden',
        transition: 'max-height 0.3s ease',
      }}
    >
      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 15,
          color: MUTED,
          lineHeight: 1.7,
          margin: 0,
          padding: '0 24px 20px',
        }}
      >
        {item.a}
      </p>
    </div>
  </div>
);

export const FAQ = () => {
  const [openKey, setOpenKey] = useState<string | null>(null);

  const toggle = (key: string) => {
    setOpenKey((prev) => (prev === key ? null : key));
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: INK,
        padding: '48px 24px 80px',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ marginBottom: 48 }}>
          <p
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: FLAME,
              margin: '0 0 10px',
            }}
          >
            Support
          </p>
          <h1
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 800,
              fontSize: 48,
              letterSpacing: '-0.01em',
              textTransform: 'uppercase',
              color: WHITE,
              margin: '0 0 14px',
              lineHeight: 1,
            }}
          >
            Frequently Asked Questions
          </h1>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 16,
              color: MUTED,
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Everything you need to know about HERS365, recruiting, and your
            account.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {FAQ_DATA.map((category) => (
            <div key={category.label}>
              <p
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: MUTED,
                  margin: '0 0 12px',
                }}
              >
                {category.label}
              </p>
              <div
                style={{
                  background: INK_2,
                  border: `1px solid ${LINE}`,
                  borderRadius: 12,
                  overflow: 'hidden',
                }}
              >
                {category.items.map((item, idx) => {
                  const key = `${category.label}-${idx}`;
                  return (
                    <AccordionItem
                      key={key}
                      item={item}
                      isOpen={openKey === key}
                      onToggle={() => toggle(key)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 56,
            padding: '28px 28px',
            background: INK_2,
            border: `1px solid ${LINE}`,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <p
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: 18,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: WHITE,
                margin: '0 0 4px',
              }}
            >
              Still have questions?
            </p>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                color: MUTED,
                margin: 0,
              }}
            >
              Our support team responds within 24 hours.
            </p>
          </div>
          <a
            href="/contact"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: WHITE,
              background: FLAME,
              border: 'none',
              borderRadius: 8,
              padding: '12px 24px',
              cursor: 'pointer',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              display: 'inline-block',
            }}
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
};
