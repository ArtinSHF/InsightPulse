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
        // Block any pending debounced save from writing under the old account.
        try { IPS.sync.ready = false; clearTimeout(IPS.sync._timer); } catch (e) {}
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
        _remoteState: null,   // preloaded by the boot sequence BEFORE app.js runs
        _ownerUid: null,      // account id the current in-memory state belongs to
        // Debounced server persistence — every legacy save() call funnels here.
        scheduleSave: (state) => {
          if (IPS.mode !== 'creator' || !IPS.user || !IPS.sync.ready) return;
          // Stale-account guard: never save state owned by a previous account.
          if (IPS.sync._ownerUid && IPS.sync._ownerUid !== IPS.user.id) return;
          clearTimeout(IPS.sync._timer);
          IPS.sync._timer = setTimeout(() => IPS.sync._flush(state), 800);
        },
        _flush: async (state) => {
          if (!IPS.user) return;
          try {
            await IPS.api('/api/state', {
              method: 'PUT',
              body: JSON.stringify({ state }),
            });
          } catch (e) { /* offline-safe: localStorage cache still holds the data */ }
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

    /* ---------------- boot sequence ----------------
       ORDER IS LOAD-BEARING — do not reorder:
       1) Resolve the Supabase session FIRST so window.IPS.user is final
          before the legacy app executes (fixes the loadRemote race where
          local state overwrote the cloud workspace).
       2) Preload the account's cloud workspace into IPS.sync._remoteState
          so app.js hydrates from the account, not the browser.
       3) (Respondent mode only) fetch the share before features.js.
       4) Only then inject app.js, then features.js. */
    (async () => {
      // 1) Auth first.
      try {
        const { data } = await supabase.auth.getSession();
        IPS.user = data?.session?.user || null;
      } catch (e) {
        IPS.user = null;
      }
      IPS._bootUid = IPS.user ? IPS.user.id : null; // used to detect mid-session account switches

      // 2) Cloud workspace preload (creators only). Awaited, so app.js's
      //    bootstrap can treat the cloud as the source of truth.
      if (!respondentMode && IPS.user) {
        try { IPS.sync._remoteState = await IPS.sync.loadRemote(); }
        catch (e) { IPS.sync._remoteState = null; }
      }

      // 3) Respondent share fetch (unchanged logic, moved earlier).
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
      }

      // 4) Boot the legacy app, then features.js.
      const script = document.createElement('script');
      script.src = '/legacy/app.js';
      script.defer = true;

      script.onload = () => {
        // Now load features.js. Its startup code can safely see IPS.share.
        const featuresScript = document.createElement('script');
        featuresScript.src = '/legacy/features.js';

        featuresScript.onload = () => {
          if (respondentMode) {
            if (
              IPS.share &&
              !IPS.share.closed &&
              typeof window.ipRespondentInit === 'function'
            ) {
              window.ipRespondentInit(IPS.share);
            } else if (typeof window.ipShowClosed === 'function') {
              window.ipShowClosed(
                IPS.share,
                IPS.share?.closed
                  ? undefined
                  : 'Unable to load this interview.'
              );
            }
          } else {
            if (typeof window.ipRenderAuthArea === 'function') {
              window.ipRenderAuthArea();
            }
          }
        };

        document.body.appendChild(featuresScript);
      };

      document.body.appendChild(script);
    })();
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
