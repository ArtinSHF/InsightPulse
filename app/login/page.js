'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Turnstile } from '@marsidev/react-turnstile';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Login / sign-up — CREATORS ONLY. Respondents never see this page.
 * Bot protection: Cloudflare Turnstile. The captcha token is passed to
 * Supabase Auth, which verifies it server-side against your Turnstile
 * secret (configured once in the Supabase dashboard).
 */
let _supabase = null;
function sb() {
  if (!_supabase) _supabase = getSupabaseBrowserClient();
  return _supabase;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  async function handleGoogle() {
    setError('');
    setBusy(true);
    const { error } = await sb().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: siteUrl + '/auth/callback' },
    });
    if (error) { setError(error.message); setBusy(false); }
  }

  async function handleEmail(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!captchaToken) {
      setError('Please complete the bot check below.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await sb().auth.signUp({
          email,
          password,
          options: { captchaToken, emailRedirectTo: siteUrl + '/auth/callback' },
        });
        if (error) throw error;
        if (data.session) {
          router.push('/');
        } else {
          setNotice('Account created — check your inbox to confirm your email, then sign in.');
        }
      } else {
        const { error } = await sb().auth.signInWithPassword({
          email,
          password,
          options: { captchaToken },
        });
        if (error) throw error;
        router.push('/');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      setCaptchaToken(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={S.page}>
      <link rel="stylesheet" href="/legacy/app.css" />
      <div style={S.card}>
        <div style={S.brandRow}>
          <div className="brand-logo">IP</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>InsightPulse</div>
            <div className="muted" style={{ fontSize: 12 }}>Creator sign-in</div>
          </div>
        </div>

        <p className="muted" style={{ fontSize: 13, marginTop: 16 }}>
          Only interview <strong>creators</strong> need an account. If you were
          sent a link to <em>answer</em> an interview, you don't need to sign
          in — just open the link.
        </p>

        <button className="btn" style={S.googleBtn} onClick={handleGoogle} disabled={busy}>
          <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 18.9 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/>
          </svg>
          Continue with Google
        </button>

        <div style={S.divider}><span>or with email</span></div>

        <form onSubmit={handleEmail}>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </div>

          {/* Bot detection — login page only, nowhere else in the app */}
          <div style={{ margin: '12px 0' }}>
            <Turnstile
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
              onSuccess={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken(null)}
              onError={() => setCaptchaToken(null)}
            />
          </div>

          {error && <div style={S.error}>⚠ {error}</div>}
          {notice && <div style={S.notice}>✅ {notice}</div>}

          <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="muted" style={{ fontSize: 13, textAlign: 'center', marginTop: 14 }}>
          {mode === 'signin' ? (
            <>New here?{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); setMode('signup'); setError(''); }}>Create an account</a>
            </>
          ) : (
            <>Already have an account?{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); setMode('signin'); setError(''); }}>Sign in</a>
            </>
          )}
          {' · '}
          <a href="/">Back to home</a>
        </div>
      </div>
    </div>
  );
}

const S = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, rgba(37,99,235,.08), rgba(124,58,237,.08)), #f6f8fb',
    padding: 20,
    fontFamily: 'Inter, "Segoe UI", system-ui, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: '#fff',
    borderRadius: 20,
    padding: '32px 28px',
    boxShadow: '0 20px 50px rgba(16,24,40,.14)',
    border: '1px solid #e3e8ef',
  },
  brandRow: { display: 'flex', alignItems: 'center', gap: 12 },
  googleBtn: {
    width: '100%',
    justifyContent: 'center',
    gap: 10,
    marginTop: 18,
    fontWeight: 600,
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    color: '#667085',
    fontSize: 12,
    margin: '18px 0 6px',
  },
  error: {
    background: 'rgba(239,68,68,.08)',
    border: '1px solid rgba(239,68,68,.3)',
    color: '#ef4444',
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 13,
    marginBottom: 12,
  },
  notice: {
    background: 'rgba(16,185,129,.08)',
    border: '1px solid rgba(16,185,129,.3)',
    color: '#059669',
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 13,
    marginBottom: 12,
  },
};
