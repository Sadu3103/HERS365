import React from 'react';
import { Link } from 'react-router-dom';

const FLAME = '#ff5a2d';
const INK = '#0a0a0a';
const INK_2 = '#111111';
const LINE = 'rgba(255,255,255,0.07)';
const MUTED = '#8a8a86';
const MUTED_2 = '#5a5a56';
const DISP = "'Barlow Condensed', sans-serif";

const EFFECTIVE_DATE = 'June 1, 2026';

interface Section {
  title: string;
  content: React.ReactNode;
}

const sections: Section[] = [
  {
    title: '1. Acceptance of Terms',
    content: 'By accessing or using the HERS365 platform ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the Service. Use by anyone under 18 requires a parent or guardian to accept these Terms on their behalf.',
  },
  {
    title: '2. Eligibility',
    content: 'The Service is intended for girls flag football athletes, their parents or guardians, and coaches or scouts registered through the platform. Athletes under 13 may only use the Service with verifiable parental consent in compliance with COPPA (Children\'s Online Privacy Protection Act). We reserve the right to terminate accounts that do not meet eligibility requirements.',
  },
  {
    title: '3. Accounts and Registration',
    content: 'You must provide accurate, current, and complete information during registration and keep it up to date. You are responsible for maintaining the confidentiality of your credentials. Notify us immediately at support@hers365.com if you suspect unauthorized account access. Each person may maintain only one account.',
  },
  {
    title: '4. Parent and Guardian Consent',
    content: 'For athletes under 18, a parent or guardian must register a Parent Hub account and grant consent before the athlete\'s profile becomes visible to coaches. Parents may review, modify, or remove their child\'s data at any time. All coach communications with minors are routed through the Parent Hub. HERS365 does not permit direct, unsupervised contact between coaches and athletes under 18.',
  },
  {
    title: '5. User Content',
    content: 'You retain ownership of content you upload (film, photos, stats). By uploading content, you grant HERS365 a non-exclusive, royalty-free, worldwide license to display, distribute, and promote that content within the platform and in marketing materials. You represent that you own or have the rights to all content you submit and that it does not violate any third-party rights. HERS365 reserves the right to remove content that violates these Terms.',
  },
  {
    title: '6. Prohibited Conduct',
    content: (
      <div>
        <p style={{ margin: '0 0 10px' }}>You agree not to:</p>
        <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
          <li>Harass, bully, or threaten any other user</li>
          <li>Attempt to contact a minor athlete outside of the Parent Hub approval flow</li>
          <li>Post false, misleading, or fraudulent performance data</li>
          <li>Use automated tools, scrapers, or bots to access the Service</li>
          <li>Attempt to circumvent any safety or access controls</li>
          <li>Share another user's personal information without consent</li>
          <li>Use the Service for any commercial purpose not expressly authorized by HERS365</li>
        </ul>
      </div>
    ),
  },
  {
    title: '7. Subscriptions and Payments',
    content: 'Paid subscriptions (Pro, Elite) are billed monthly. You may cancel at any time; access continues until the end of the current billing period. HERS365 does not offer refunds for partial billing periods. Prices may change with 30 days\' notice. All payments are processed by Stripe and subject to Stripe\'s terms. HERS365 does not store payment card data.',
  },
  {
    title: '8. Privacy',
    content: (
      <span>
        Your use of the Service is governed by our{' '}
        <Link to="/privacy" style={{ color: FLAME, textDecoration: 'none', fontWeight: 600 }}>Privacy Policy</Link>
        , which is incorporated into these Terms by reference. By using the Service, you consent to the data practices described in the Privacy Policy.
      </span>
    ),
  },
  {
    title: '9. Intellectual Property',
    content: 'HERS365 and its licensors own all rights to the Service\'s software, design, branding, and proprietary content. The HERS365 name, logo, and HERS Rating system are trademarks of HERS365, Inc. You may not copy, modify, or distribute any part of the Service without written permission.',
  },
  {
    title: '10. Disclaimers',
    content: 'THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. HERS365 DOES NOT GUARANTEE THAT USE OF THE PLATFORM WILL RESULT IN RECRUITING OFFERS, SCHOLARSHIPS, OR ANY SPECIFIC OUTCOME. ATHLETE PERFORMANCE DATA AND RATINGS ARE PROVIDED FOR INFORMATIONAL PURPOSES ONLY.',
  },
  {
    title: '11. Limitation of Liability',
    content: 'TO THE MAXIMUM EXTENT PERMITTED BY LAW, HERS365\'S TOTAL LIABILITY TO YOU FOR ANY CLAIM ARISING FROM USE OF THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID TO HERS365 IN THE 12 MONTHS PRECEDING THE CLAIM. HERS365 IS NOT LIABLE FOR ANY INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES.',
  },
  {
    title: '12. Termination',
    content: 'HERS365 may suspend or terminate your account for violation of these Terms, without notice or liability. You may delete your account at any time from Profile → Settings. Upon termination, your license to use the Service ends immediately. Sections 5, 9, 10, 11, and 13 survive termination.',
  },
  {
    title: '13. Governing Law',
    content: 'These Terms are governed by the laws of the State of California, without regard to conflict of law principles. Any disputes shall be resolved in the state or federal courts located in Los Angeles County, California. You waive any objection to jurisdiction or venue in those courts.',
  },
  {
    title: '14. Changes to Terms',
    content: 'We may update these Terms periodically. We will notify you of material changes via email or in-app notification at least 14 days before they take effect. Continued use of the Service after changes become effective constitutes acceptance of the updated Terms.',
  },
  {
    title: '15. Contact',
    content: (
      <span>
        Questions about these Terms? Contact us at{' '}
        <a href="mailto:legal@hers365.com" style={{ color: FLAME, textDecoration: 'none' }}>legal@hers365.com</a>
        {' '}or write to HERS365, Inc., Los Angeles, CA.
      </span>
    ),
  },
];

export const Terms = () => (
  <div style={{ background: INK, minHeight: '100vh', color: '#f4f4f2', fontFamily: "'DM Sans', sans-serif" }}>
    {/* Top bar */}
    <div style={{ borderBottom: `1px solid ${LINE}`, padding: '18px 28px', background: INK_2, position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(12px)' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ fontFamily: DISP, fontWeight: 900, fontSize: '1.3rem', letterSpacing: '.04em', textDecoration: 'none', color: '#f4f4f2', textTransform: 'uppercase' }}>
          HERS<b style={{ color: FLAME }}>365</b>
        </Link>
        <div style={{ color: MUTED, fontSize: '.8rem' }}>Effective {EFFECTIVE_DATE}</div>
      </div>
    </div>

    <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 28px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ fontFamily: DISP, fontWeight: 700, letterSpacing: '.2em', fontSize: '.78rem', color: FLAME, textTransform: 'uppercase', marginBottom: 12 }}>
          Legal
        </div>
        <h1 style={{ fontFamily: DISP, fontWeight: 900, textTransform: 'uppercase', fontSize: 'clamp(2.4rem,5vw,3.4rem)', lineHeight: 0.92, margin: '0 0 18px' }}>
          Terms of Service
        </h1>
        <p style={{ color: MUTED, fontSize: '1rem', lineHeight: 1.7, margin: 0 }}>
          These Terms of Service govern your use of the HERS365 platform. Please read them carefully. For athletes under 18, a parent or guardian must review and accept these terms.
        </p>
        <div style={{ display: 'flex', gap: 16, marginTop: 20, flexWrap: 'wrap', fontSize: '.8rem', color: MUTED_2 }}>
          <Link to="/privacy" style={{ color: FLAME, textDecoration: 'none', fontWeight: 600 }}>Privacy Policy →</Link>
          <a href="mailto:legal@hers365.com" style={{ color: MUTED, textDecoration: 'none' }}>legal@hers365.com</a>
        </div>
      </div>

      {/* Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {sections.map((s) => (
          <div
            key={s.title}
            style={{
              borderTop: `1px solid ${LINE}`,
              paddingTop: 28, paddingBottom: 28,
            }}
          >
            <h2 style={{
              fontFamily: DISP, fontWeight: 800, textTransform: 'uppercase',
              fontSize: '1.22rem', letterSpacing: '.04em', margin: '0 0 12px', color: '#f4f4f2',
              lineHeight: 1.1,
            }}>
              {s.title}
            </h2>
            <div style={{ color: MUTED, fontSize: '.95rem', lineHeight: 1.75 }}>
              {s.content}
            </div>
          </div>
        ))}
        <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 28, color: MUTED_2, fontSize: '.82rem' }}>
          Last updated: {EFFECTIVE_DATE} · HERS365, Inc. · All rights reserved.
        </div>
      </div>
    </div>
  </div>
);
