import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductShell from './ProductShell';
import { PROVIDERS } from '@/lib/providers';

/**
 * Ask Vantoris — deterministic router. No language model required.
 * It routes known intents and refuses to claim actions it did not execute.
 */
const INTENTS = [
  { test: /balance|usd account|money/i, reply: 'Open Money to see account records returned for your session. I will not quote a balance I have not loaded.', to: '/money' },
  { test: /card/i, reply: 'Card controls are unavailable until an issuer is connected. Existing card records, if any, are on Cards.', to: '/cards' },
  { test: /flight|travel|hotel/i, reply: 'No flight, hotel, or tracking provider is connected. I will not invent a status or booking.', to: '/travel' },
  { test: /home|house|listing/i, reply: 'No licensed listing provider is connected. Saved homes will appear only after that feed exists.', to: '/homes' },
  { test: /herobox|package|ship/i, reply: 'HeroBox catalog and carrier quotes are not connected. I cannot price or ship a package.', to: '/herobox' },
  { test: /news|market/i, reply: 'No licensed news feed is connected. I will not summarize stories that were not ingested.', to: '/news' },
  { test: /send|transfer|pay/i, reply: 'I can open Pay. I will not say money moved unless a transaction record exists.', to: '/move-money' },
];

export default function Ask() {
  const [input, setInput] = useState('');
  const [log, setLog] = useState([]);

  const status = useMemo(
    () => Object.values(PROVIDERS).map((p) => `${p.label}: ${p.status}`),
    []
  );

  function ask() {
    const q = input.trim();
    if (!q) return;
    const hit = INTENTS.find((i) => i.test.test(q));
    setLog((prev) => [
      ...prev,
      { role: 'you', text: q },
      {
        role: 'vantoris',
        text: hit
          ? hit.reply
          : 'I can route to Money, Cards, Travel, Homes, HeroBox, News, and Pay. I do not execute payments, bookings, or donations from chat.',
        to: hit?.to,
      },
    ]);
    setInput('');
  }

  return (
    <ProductShell kicker="Ask Vantoris" title="Ask" subtitle="Private operating layer. Questions stay in the app and are not sent to a public language model. It cannot claim an action completed.">
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 text-[11px] text-slate-500 space-y-1">
        {status.map((s) => <p key={s}>{s}</p>)}
      </div>
      <div className="space-y-2 mb-4">
        {log.map((m, i) => (
          <div key={i} className={`rounded-2xl px-4 py-3 text-sm ${m.role === 'you' ? 'bg-navy text-white' : 'bg-white border border-slate-200'}`}>
            <p>{m.text}</p>
            {m.to && <Link to={m.to} className="mt-2 inline-block text-xs font-semibold underline">Open</Link>}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask()}
          placeholder="Ask about your account or a product"
          className="h-11 flex-1 rounded-xl border border-slate-200 px-3 text-sm"
        />
        <button type="button" onClick={ask} className="rounded-xl bg-navy px-4 text-sm font-semibold text-white">Ask</button>
      </div>
    </ProductShell>
  );
}
