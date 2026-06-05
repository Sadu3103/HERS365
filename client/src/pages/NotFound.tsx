import { useNavigate } from 'react-router-dom';

export const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0a',
      color: '#fff',
      gap: 16,
      padding: 24,
    }}>
      <div style={{
        fontFamily: 'Barlow Condensed, sans-serif',
        fontWeight: 900,
        fontSize: 'clamp(5rem, 20vw, 10rem)',
        color: '#ff5a2d',
        lineHeight: 1,
        textShadow: '0 0 60px rgba(255,90,45,0.3)',
        letterSpacing: '-0.02em',
      }}>
        404
      </div>
      <div style={{
        fontFamily: 'Barlow Condensed, sans-serif',
        fontWeight: 700,
        fontSize: '1.4rem',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: '#ccc',
      }}>
        Page not found
      </div>
      <p style={{ fontSize: '0.88rem', color: '#555', textAlign: 'center', maxWidth: 320, lineHeight: 1.6 }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <button
        onClick={() => navigate('/')}
        style={{
          marginTop: 8,
          background: '#ff5a2d',
          border: 'none',
          borderRadius: 9999,
          padding: '12px 32px',
          color: '#fff',
          fontWeight: 800,
          fontSize: '0.82rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        Back to Home
      </button>
    </div>
  );
};
