import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from '@/App'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

// Automatically route relative API requests to the backend server in iOS Simulator / native mobile apps
const originalFetch = window.fetch;
window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
  let url = input;
  if (typeof url === 'string' && url.startsWith('/api')) {
    const isMobileOrCustom = window.location.protocol === 'capacitor:' || window.location.hostname === 'hers365.app' || (window.location.hostname === 'localhost' && window.location.port !== '5173' && window.location.port !== '4173');
    const baseUrl = import.meta.env.VITE_API_URL || (isMobileOrCustom ? 'https://srv1829607.hstgr.cloud' : '');
    url = `${baseUrl}${url}`;
  }
  return originalFetch(url, init);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)
