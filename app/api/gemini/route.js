import { NextResponse } from 'next/server';

// POST /api/gemini  { prompt, systemHint?, key?, model? }
// Server-side proxy so the Gemini key never has to ship in client code.
// Priority: the caller's own key (saved in the app's Settings modal) >
// the server-wide GEMINI_API_KEY env var (fallback).

export async function POST(req) {
  const { prompt, systemHint = '', key = '', model = '' } = await req.json().catch(() => ({}));
  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
  }

  const apiKey = key || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Please add your Gemini API key in Settings (⚙), or set GEMINI_API_KEY on the server.' },
      { status: 400 }
    );
  }
  const useModel = model || 'gemini-2.5-flash';

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${useModel}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    contents: [
      { role: 'user', parts: [{ text: (systemHint ? systemHint + '\n\n' : '') + prompt }] },
    ],
    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    return NextResponse.json(
      { error: `Gemini error ${res.status}: ${txt.slice(0, 200)}` },
      { status: 502 }
    );
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  return NextResponse.json({ text: text.trim() });
}
