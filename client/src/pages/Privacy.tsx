
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const FLAME = '#ff5a2d';
const INK = '#0a0a0a';
const INK_2 = '#111111';
const LINE = 'rgba(255,255,255,0.07)';
const LINE_2 = 'rgba(255,255,255,0.12)';
const MUTED = '#8a8a86';
const MUTED_2 = '#5a5a56';
const DISP = "'Barlow Condensed', sans-serif";
const BODY = "'DM Sans', sans-serif";

const css = `
  *,*::before,*::after{box-sizing:border-box}

  .pp-nav-link{color:${MUTED};font-weight:600;font-size:.84rem;text-decoration:none;
    font-family:${DISP};text-transform:uppercase;letter-spacing:.08em;
    transition:color .22s}
  .pp-nav-link:hover{color:#f4f4f2}

  .pp-back{display:inline-flex;align-items:center;gap:7px;color:${MUTED};
    font-family:${DISP};font-weight:700;font-size:.82rem;text-transform:uppercase;
    letter-spacing:.1em;text-decoration:none;
    border:1px solid ${LINE_2};border-radius:9999px;padding:8px 16px;
    transition:border-color .22s,color .22s,background .22s;background:none}
  .pp-back:hover{color:${FLAME};border-color:rgba(255,90,45,.4);background:rgba(255,90,45,.05)}

  .pp-section + .pp-section{margin-top:52px;padding-top:52px;border-top:1px solid ${LINE}}

  .pp-link{color:${FLAME};text-decoration:none;transition:opacity .2s}
  .pp-link:hover{opacity:.75}

  @media(max-width:700px){
    .pp-content-grid{padding:0 20px !important}
    .pp-header-inner{padding:0 20px !important}
  }
`;

const wrap: React.CSSProperties = {
  maxWidth: 780,
  margin: '0 auto',
};

const disp: React.CSSProperties = {
  fontFamily: DISP,
  textTransform: 'uppercase' as const,
  letterSpacing: '.01em',
};

const sectionHeading: React.CSSProperties = {
  ...disp,
  fontWeight: 800,
  fontSize: '1.55rem',
  letterSpacing: '.04em',
  color: '#f4f4f2',
  margin: '0 0 16px',
  lineHeight: 1.1,
};

const body: React.CSSProperties = {
  fontFamily: BODY,
  color: MUTED,
  fontSize: '1rem',
  lineHeight: 1.75,
  margin: 0,
};

const bodyEmphasis: React.CSSProperties = {
  fontFamily: BODY,
  color: '#c8c8c4',
  fontSize: '1rem',
  lineHeight: 1.75,
  margin: 0,
};

const pill: React.CSSProperties = {
  display: 'inline-block',
  background: 'rgba(255,90,45,.1)',
  border: '1px solid rgba(255,90,45,.28)',
  borderRadius: 9999,
  padding: '4px 13px',
  fontFamily: DISP,
  fontWeight: 700,
  fontSize: '.72rem',
  letterSpacing: '.14em',
  textTransform: 'uppercase' as const,
  color: FLAME,
  marginBottom: 14,
};

const listStyle: React.CSSProperties = {
  fontFamily: BODY,
  color: MUTED,
  fontSize: '1rem',
  lineHeight: 1.75,
  margin: 0,
  paddingLeft: 20,
  marginTop: 12,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 8,
};

const coppaBox: React.CSSProperties = {
  background: 'rgba(255,90,45,.06)',
  border: '1px solid rgba(255,90,45,.22)',
  borderRadius: 16,
  padding: '24px 28px',
  marginTop: 20,
};

const LAST_UPDATED = 'June 11, 2026';

export const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div style={{ background: INK, color: '#f4f4f2', fontFamily: BODY, fontSize: 16, lineHeight: 1.7, minHeight: '100vh' }}>
      <style>{css}</style>

      {/* TOP BAR */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 28px',
        background: 'rgba(10,10,10,.92)', backdropFilter: 'blur(14px)',
        borderBottom: `1px solid ${LINE}`,
      }}>
        <Link
          to="/"
          style={{ ...disp, fontWeight: 900, fontSize: '1.4rem', letterSpacing: '.04em', textDecoration: 'none', color: '#f4f4f2' }}
        >
          HERS<b style={{ color: FLAME }}>365</b>
        </Link>

        <button
          onClick={() => navigate(-1)}
          className="pp-back"
          style={{ cursor: 'pointer' }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
            <path d="M8 1L3 6L8 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>
      </nav>

      {/* PAGE HEADER */}
      <header style={{
        position: 'relative',
        background: INK_2,
        borderBottom: `1px solid ${LINE}`,
        padding: '64px 28px 56px',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', width: 480, height: 480, borderRadius: '50%',
          filter: 'blur(96px)', opacity: 0.25,
          top: -200, right: -80,
          background: 'radial-gradient(circle,rgba(255,90,45,.6),transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.3, pointerEvents: 'none',
          backgroundImage: `linear-gradient(${LINE} 1px,transparent 1px),linear-gradient(90deg,${LINE} 1px,transparent 1px)`,
          backgroundSize: '52px 52px',
          maskImage: 'radial-gradient(ellipse 60% 100% at 90% 50%,#000 0%,transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 100% at 90% 50%,#000 0%,transparent 80%)',
        }} />

        <div className="pp-header-inner" style={{ ...wrap, position: 'relative', padding: '0 28px' }}>
          <div style={pill}>Legal</div>
          <h1 style={{
            ...disp,
            fontWeight: 900,
            fontSize: 'clamp(2.8rem,7vw,5rem)',
            lineHeight: 0.92,
            margin: '0 0 20px',
          }}>
            Privacy<br /><span style={{ color: FLAME }}>Policy</span>
          </h1>
          <p style={{ ...body, fontSize: '1.05rem', maxWidth: 520, color: MUTED }}>
            How HERS365 collects, uses, and protects information about athletes, parents, and coaches on our platform.
          </p>
          <div style={{ marginTop: 22, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: '.78rem', letterSpacing: '.12em', textTransform: 'uppercase', color: MUTED_2 }}>
              Last Updated: <span style={{ color: MUTED }}>{LAST_UPDATED}</span>
            </span>
            <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: '.78rem', letterSpacing: '.12em', textTransform: 'uppercase', color: MUTED_2 }}>
              Effective: <span style={{ color: MUTED }}>{LAST_UPDATED}</span>
            </span>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <main className="pp-content-grid" style={{ ...wrap, padding: '64px 28px 96px' }}>

        {/* 1. Introduction */}
        <section className="pp-section">
          <h2 style={sectionHeading}>Introduction</h2>
          <p style={body}>
            HERS365, Inc. ("HERS365," "we," "our," or "us") operates the HERS365 recruiting platform at hers365.com and its associated mobile applications (collectively, the "Service"). This Privacy Policy explains what personal information we collect, why we collect it, how we use and protect it, and the rights you have over your data.
          </p>
          <p style={{ ...body, marginTop: 14 }}>
            By accessing or using the Service you agree to this Privacy Policy. If you do not agree, please do not use the Service. This policy applies to all visitors, registered athletes, parents, guardians, and coaches who interact with our platform.
          </p>
          <p style={{ ...body, marginTop: 14 }}>
            Because HERS365 serves student-athletes — many of whom are minors — we take privacy and data protection especially seriously. Please read this policy in full, particularly the{' '}
            <a href="#coppa" className="pp-link">COPPA Compliance</a> section if you are a parent or guardian.
          </p>
        </section>

        {/* 2. Information We Collect */}
        <section className="pp-section" id="collect">
          <h2 style={sectionHeading}>Information We Collect</h2>
          <p style={body}>
            We collect information you provide directly and information generated through your use of the Service.
          </p>

          <p style={{ ...bodyEmphasis, marginTop: 22, fontWeight: 600 }}>Information You Provide</p>
          <ul style={listStyle}>
            <li><b style={{ color: '#f4f4f2' }}>Account registration:</b> name, email address, password, date of birth, graduation year, and role (athlete, parent/guardian, or coach).</li>
            <li><b style={{ color: '#f4f4f2' }}>Athlete profile:</b> position, school, team, height, weight, GPA, highlight video links, combine and drill results, and a profile photo.</li>
            <li><b style={{ color: '#f4f4f2' }}>Contact information:</b> phone number and mailing address, provided optionally for recruiting correspondence.</li>
            <li><b style={{ color: '#f4f4f2' }}>Parent/guardian information:</b> name, email address, and relationship to the athlete, required for accounts of athletes under 13.</li>
            <li><b style={{ color: '#f4f4f2' }}>Coach/recruiter details:</b> institution name, sport, and coaching credentials for verified coach accounts.</li>
            <li><b style={{ color: '#f4f4f2' }}>Communications:</b> messages sent through our in-platform messaging system, support requests, and feedback submissions.</li>
          </ul>

          <p style={{ ...bodyEmphasis, marginTop: 22, fontWeight: 600 }}>Information Collected Automatically</p>
          <ul style={listStyle}>
            <li><b style={{ color: '#f4f4f2' }}>Usage data:</b> pages visited, features used, search queries, profile views, and interaction timestamps.</li>
            <li><b style={{ color: '#f4f4f2' }}>Device data:</b> IP address, browser type and version, operating system, device identifiers, and screen resolution.</li>
            <li><b style={{ color: '#f4f4f2' }}>Log data:</b> server logs including access times, referring URLs, and error reports.</li>
            <li><b style={{ color: '#f4f4f2' }}>Cookies and tracking technologies:</b> see the <a href="#cookies" className="pp-link">Cookies</a> section for full details.</li>
          </ul>
        </section>

        {/* 3. How We Use Your Information */}
        <section className="pp-section" id="use">
          <h2 style={sectionHeading}>How We Use Your Information</h2>
          <p style={body}>
            We use collected information only for legitimate purposes directly related to operating and improving the Service:
          </p>
          <ul style={{ ...listStyle, marginTop: 16 }}>
            <li>Create and manage user accounts and authenticate identity.</li>
            <li>Generate and maintain athlete HERS Ratings and leaderboard rankings.</li>
            <li>Make athlete profiles visible to verified college coaches and recruiters on the platform.</li>
            <li>Facilitate communication between athletes, parents, and coaches within the platform's messaging system.</li>
            <li>Send transactional emails such as account confirmations, password resets, and recruiting activity notifications.</li>
            <li>Send optional platform updates and recruiting insights (you may opt out at any time).</li>
            <li>Improve platform features, fix bugs, and conduct internal analytics to understand usage patterns.</li>
            <li>Detect and prevent fraud, abuse, and unauthorized access.</li>
            <li>Comply with legal obligations, including COPPA, FERPA, and applicable state privacy laws.</li>
          </ul>
          <p style={{ ...body, marginTop: 16 }}>
            We do not sell your personal information. We do not use athlete data for behavioral advertising or data brokerage.
          </p>
        </section>

        {/* 4. COPPA */}
        <section className="pp-section" id="coppa">
          <h2 style={sectionHeading}>COPPA Compliance — Children's Privacy</h2>
          <p style={body}>
            HERS365 serves a platform where many registered athletes are under 18 years of age, including those under 13. We take our obligations under the Children's Online Privacy Protection Act (COPPA) seriously.
          </p>

          <div style={coppaBox}>
            <p style={{ fontFamily: DISP, fontWeight: 800, fontSize: '1.05rem', letterSpacing: '.06em', textTransform: 'uppercase', color: FLAME, margin: '0 0 12px' }}>
              Important — Users Under 13
            </p>
            <p style={{ fontFamily: BODY, color: '#c8c8c4', fontSize: '1rem', lineHeight: 1.75, margin: 0 }}>
              Users under 13 require verifiable parental consent. We do not knowingly collect personal data from children under 13 without parental approval. Parents may request deletion of their child's data by contacting us at{' '}
              <a href="mailto:privacy@hers365.com" className="pp-link">privacy@hers365.com</a>.
            </p>
          </div>

          <p style={{ ...body, marginTop: 20 }}>
            During registration, we collect date of birth to identify users who are under 13. If an athlete indicates they are under 13, account creation is paused and a parental consent flow is triggered before any personal information is stored. A parent or guardian must provide verifiable consent — via a signed consent form or a verified payment method — before the account is activated.
          </p>
          <p style={{ ...body, marginTop: 14 }}>
            Parents and guardians of users under 13 have the following rights at any time:
          </p>
          <ul style={{ ...listStyle, marginTop: 10 }}>
            <li>Review all personal information we have collected about their child.</li>
            <li>Correct or update their child's personal information.</li>
            <li>Request complete deletion of their child's account and all associated data.</li>
            <li>Revoke consent and prevent further collection or use of their child's data.</li>
            <li>Refuse to allow further contact from coaches through the platform.</li>
          </ul>
          <p style={{ ...body, marginTop: 16 }}>
            To exercise these rights, contact us at <a href="mailto:privacy@hers365.com" className="pp-link">privacy@hers365.com</a> with your child's registered email address. We will respond within 5 business days.
          </p>
          <p style={{ ...body, marginTop: 14 }}>
            For athletes between 13 and 17, we collect only the minimum information necessary to provide the recruiting service and require a parent or guardian email on file. Profile visibility to coaches is enabled by default at age 13, but a parent or guardian may restrict it at any time from account settings or by contacting us.
          </p>
        </section>

        {/* 5. Data Sharing */}
        <section className="pp-section" id="sharing">
          <h2 style={sectionHeading}>Data Sharing</h2>
          <p style={body}>
            We share personal information only in the following circumstances:
          </p>
          <ul style={{ ...listStyle, marginTop: 16 }}>
            <li>
              <b style={{ color: '#f4f4f2' }}>Verified coaches and recruiters:</b> Athlete profiles (name, position, school, recruiting class, stats, and highlight videos) are visible to verified college and university coaches who have registered on the platform. Personal contact information is shared only if an athlete or parent explicitly enables that setting.
            </li>
            <li>
              <b style={{ color: '#f4f4f2' }}>Service providers:</b> We use trusted third-party vendors to operate the Service — cloud hosting, email delivery, payment processing, and analytics. These vendors access only the data necessary to perform their services and are contractually required to keep it confidential.
            </li>
            <li>
              <b style={{ color: '#f4f4f2' }}>Legal requirements:</b> We may disclose information if required to do so by law, court order, or valid government request, or to protect the rights, property, or safety of HERS365, our users, or the public.
            </li>
            <li>
              <b style={{ color: '#f4f4f2' }}>Business transfers:</b> In the event of a merger, acquisition, or sale of all or a portion of our assets, user data may be transferred as part of that transaction. We will notify affected users before data is transferred and becomes subject to a different privacy policy.
            </li>
          </ul>
          <p style={{ ...body, marginTop: 16 }}>
            We never sell, rent, or trade personal information with third parties for marketing or advertising purposes.
          </p>
        </section>

        {/* 6. Cookies */}
        <section className="pp-section" id="cookies">
          <h2 style={sectionHeading}>Cookies &amp; Tracking Technologies</h2>
          <p style={body}>
            HERS365 uses cookies and similar technologies to operate the Service and understand how users interact with it.
          </p>
          <ul style={{ ...listStyle, marginTop: 16 }}>
            <li>
              <b style={{ color: '#f4f4f2' }}>Strictly necessary cookies:</b> Required for the Service to function — authentication sessions, CSRF protection, and user preferences. These cannot be disabled without breaking the platform.
            </li>
            <li>
              <b style={{ color: '#f4f4f2' }}>Functional cookies:</b> Remember settings and preferences such as language, display mode, and notification choices.
            </li>
            <li>
              <b style={{ color: '#f4f4f2' }}>Analytics cookies:</b> First-party analytics to understand aggregate usage patterns, feature adoption, and performance. We do not use third-party advertising networks or retargeting pixels.
            </li>
          </ul>
          <p style={{ ...body, marginTop: 16 }}>
            You can control cookie preferences through your browser settings. Disabling strictly necessary cookies will prevent you from logging in. We do not honor "Do Not Track" signals at this time because there is no consistent industry standard for handling them, but we do not engage in cross-site behavioral tracking regardless.
          </p>
        </section>

        {/* 7. Your Rights */}
        <section className="pp-section" id="rights">
          <h2 style={sectionHeading}>Your Rights</h2>
          <p style={body}>
            Depending on your location, you may have the following rights with respect to your personal information:
          </p>
          <ul style={{ ...listStyle, marginTop: 16 }}>
            <li><b style={{ color: '#f4f4f2' }}>Access:</b> Request a copy of the personal information we hold about you.</li>
            <li><b style={{ color: '#f4f4f2' }}>Correction:</b> Request that we correct inaccurate or incomplete information.</li>
            <li><b style={{ color: '#f4f4f2' }}>Deletion:</b> Request deletion of your account and personal information, subject to legal retention obligations.</li>
            <li><b style={{ color: '#f4f4f2' }}>Portability:</b> Request your data in a structured, machine-readable format.</li>
            <li><b style={{ color: '#f4f4f2' }}>Restriction:</b> Request that we limit how we process your information in certain circumstances.</li>
            <li><b style={{ color: '#f4f4f2' }}>Objection:</b> Object to processing based on legitimate interests.</li>
            <li><b style={{ color: '#f4f4f2' }}>Opt-out of marketing:</b> Unsubscribe from non-transactional emails at any time using the unsubscribe link in any email or by updating account settings.</li>
          </ul>
          <p style={{ ...body, marginTop: 16 }}>
            Residents of California have additional rights under the California Consumer Privacy Act (CCPA), including the right to know what personal information is sold or disclosed (we do neither) and the right to non-discrimination for exercising your privacy rights.
          </p>
          <p style={{ ...body, marginTop: 14 }}>
            To exercise any of these rights, email <a href="mailto:privacy@hers365.com" className="pp-link">privacy@hers365.com</a>. We will respond within 30 days. We may need to verify your identity before fulfilling a request.
          </p>
        </section>

        {/* 8. Data Security & Retention */}
        <section className="pp-section" id="security">
          <h2 style={sectionHeading}>Data Security &amp; Retention</h2>
          <p style={body}>
            We use industry-standard technical and organizational measures to protect personal information — including TLS encryption in transit, encrypted storage at rest, access controls, and regular security audits. Despite these precautions, no internet service can guarantee absolute security.
          </p>
          <p style={{ ...body, marginTop: 14 }}>
            We retain personal information for as long as your account is active or as needed to provide the Service. If you delete your account, we will remove your personal data within 30 days, except where we are required by law to retain records longer or where data has already been anonymized and aggregated.
          </p>
        </section>

        {/* 9. Contact */}
        <section className="pp-section" id="contact">
          <h2 style={sectionHeading}>Contact Us</h2>
          <p style={body}>
            If you have questions about this Privacy Policy, wish to exercise a data right, or need to report a privacy concern — especially one involving a minor — contact us at:
          </p>
          <div style={{
            marginTop: 24,
            background: INK_2,
            border: `1px solid ${LINE_2}`,
            borderRadius: 16,
            padding: '28px 32px',
            display: 'flex',
            flexDirection: 'column' as const,
            gap: 12,
          }}>
            <div style={{ fontFamily: DISP, fontWeight: 900, fontSize: '1.2rem', letterSpacing: '.04em', textTransform: 'uppercase', color: '#f4f4f2' }}>
              HERS<span style={{ color: FLAME }}>365</span> Privacy Team
            </div>
            <div style={{ fontFamily: BODY, color: '#c8c8c4', fontSize: '1rem', lineHeight: 1.75 }}>
              <b style={{ color: '#f4f4f2', fontFamily: DISP, letterSpacing: '.06em', textTransform: 'uppercase', fontSize: '.82rem' }}>Email&nbsp;&nbsp;</b>
              <a href="mailto:privacy@hers365.com" className="pp-link">privacy@hers365.com</a>
            </div>
            <div style={{ fontFamily: BODY, color: MUTED, fontSize: '.9rem', lineHeight: 1.7 }}>
              Response time: within 5 business days for COPPA requests, within 30 days for all other requests.
            </div>
          </div>
          <p style={{ ...body, marginTop: 20, fontSize: '.9rem', color: MUTED_2 }}>
            We may update this Privacy Policy from time to time. When we make material changes we will notify registered users by email and post the updated policy with a new effective date. Continued use of the Service after changes are posted constitutes acceptance of the updated policy.
          </p>
        </section>

      </main>

      {/* FOOTER */}
      <footer style={{ borderTop: `1px solid ${LINE}`, padding: '36px 28px' }}>
        <div style={{ ...wrap, padding: '0 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ fontFamily: DISP, fontWeight: 900, fontSize: '1.3rem', letterSpacing: '.04em', textTransform: 'uppercase' }}>
            HERS<b style={{ color: FLAME }}>365</b>
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <Link to="/" className="pp-nav-link">Home</Link>
            <Link to="/contact" className="pp-nav-link">Contact</Link>
            <Link to="/privacy" className="pp-nav-link" style={{ color: FLAME }}>Privacy</Link>
          </div>
          <div style={{ color: MUTED_2, fontSize: '.78rem', fontFamily: BODY }}>
            © 2026 HERS365 · Girls Flag Football Recruiting
          </div>
        </div>
      </footer>
    </div>
  );
};
