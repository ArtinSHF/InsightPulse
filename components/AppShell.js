'use client';

import { useEffect, useRef, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * AppShell — mounts the preserved InsightPulse legacy app (markup, CSS and
 * JS served verbatim from /public/legacy) and wires in the new platform
 * layer via window.IPS:
 *   - mode: 'creator' (default) or 'respondent' (on /i/[slug])
 *   - Supabase auth session + sign-out
 *   - cross-device state sync (loadRemote / scheduleSave)
 *   - authenticated fetch helper for the new API routes
 *   - respondent interview fetch + answer submission
 */
export default function AppShell({ shareSlug = null }) {
  const rootRef = useRef(null);
  const [bodyHtml, setBodyHtml] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/legacy/body.html')
      .then((r) => r.text())
      .then((html) => { if (!cancelled) setBodyHtml(html); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!bodyHtml || !rootRef.current) return;

    const supabase = getSupabaseBrowserClient();
    const respondentMode = !!shareSlug;

    /* ---------------- window.IPS platform bridge ---------------- */
    const IPS = {
      mode: respondentMode ? 'respondent' : 'creator',
      user: null,
      share: null,
      getAccessToken: async () => {
        const { data } = await supabase.auth.getSession();
        return data?.session?.access_token || null;
      },
      api: async (path, opts = {}) => {
        const token = await IPS.getAccessToken();
        const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        return fetch(path, { ...opts, headers });
      },
      signOut: async () => {
        await supabase.auth.signOut();
        window.location.reload();
      },
      onAuthChange: (cb) => {
        supabase.auth.onAuthStateChange((_event, session) => {
          IPS.user = session?.user || null;
          cb(IPS.user);
        });
      },
      sync: {
        ready: false,
        _timer: null,
        _loaded: false,
        // Debounced server persistence — every legacy save() call funnels here.
        scheduleSave: (state) => {
          if (IPS.mode !== 'creator' || !IPS.user || !IPS.sync.ready) return;
          clearTimeout(IPS.sync._timer);
          IPS.sync._timer = setTimeout(() => IPS.sync._flush(state), 800);
        },
        _flush: async (state) => {
          try {
            await IPS.api('/api/state', {
              method: 'PUT',
              body: JSON.stringify({ state }),
            });
          } catch (e) { /* offline-safe: localStorage still holds the data */ }
        },
        loadRemote: async () => {
          if (IPS.mode !== 'creator' || !IPS.user) return null;
          try {
            const res = await IPS.api('/api/state');
            if (!res.ok) return null;
            const { state } = await res.json();
            IPS.sync._loaded = true;
            return state || null;
          } catch (e) {
            return null;
          }
        },
      },
    };

    // Respondent-only helpers, used by the appended features module.
    if (respondentMode) {
      IPS.respondent = {
        submitAnswers: (answers) => {
          if (typeof window.ipRespondentSubmit === 'function') {
            window.ipRespondentSubmit(answers);
          }
        },
      };
    }

    window.IPS = IPS;

    /* ---------------- boot sequence ---------------- */
    const script = document.createElement('script');
    script.src = '/legacy/app.js';
    script.defer = true;

    script.onload = () => {
      const featuresScript = document.createElement('script');
      featuresScript.src = '/legacy/features.js';
      featuresScript.onload = () => {
        // Respondent / creator initialization happens only after both scripts exist.
        initializeApp();
      };
      document.body.appendChild(featuresScript);
    };

    document.body.appendChild(script);

    async function initializeApp() {
      const { data } = await supabase.auth.getSession();
      IPS.user = data?.session?.user || null;

      if (respondentMode) {
        try {
          const res = await fetch(
            '/api/shares/slug/' + encodeURIComponent(shareSlug)
          );

          if (res.ok) {
            IPS.share = await res.json();
          } else if (res.status === 410) {
            IPS.share = await res.json().catch(() => ({}));
            IPS.share.closed = true;
          } else {
            IPS.share = null;
          }
        } catch (e) {
          IPS.share = null;
        }

        if (
          typeof window.ipRespondentInit === 'function' &&
          IPS.share &&
          !IPS.share.closed
        ) {
          window.ipRespondentInit(IPS.share);
        } else if (
          typeof window.ipShowClosed === 'function' &&
          (!IPS.share || IPS.share.closed)
        ) {
          window.ipShowClosed(IPS.share);
        }
      } else {
        if (typeof window.ipRenderAuthArea === 'function') {
          window.ipRenderAuthArea();
        }
      }
    }
  }, [bodyHtml, shareSlug]);

  if (!bodyHtml) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, system-ui, sans-serif',
          color: '#667085',
          background: '#f6f8fb',
        }}
      >
        Loading InsightPulse…
      </div>
    );
  }

  return (
    <>
      {/* Preserved legacy stylesheet (verbatim from the original index.html) */}
      <link rel="stylesheet" href="/legacy/app.css" />
      {/* Preserved legacy markup + new respondent screens / auth area */}
      <div ref={rootRef} dangerouslySetInnerHTML={{ __html: bodyHtml }} />
    </>
  );
}
