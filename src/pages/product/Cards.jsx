import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import ProductShell from './ProductShell';
import UnavailableState from '@/components/vantoris/UnavailableState';
import { PROVIDERS } from '@/lib/providers';

export default function Cards() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        const rows = await base44.entities.PaymentCard.filter({ user_id: me.id }, '-created_date').catch(() => []);
        setCards(Array.isArray(rows) ? rows : []);
      } catch (_) {
        setCards([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <ProductShell kicker="Cards" title="Cards" subtitle="Only card records returned by the backend are shown. Freeze, spend controls, and issuance stay off until a card issuer is connected.">
      {loading && <p className="text-sm text-slate-500">Loading card records…</p>}
      {!loading && !cards.length && (
        <UnavailableState title="No card product connected" detail={PROVIDERS.cards.note} />
      )}
      {cards.map((c) => (
        <div key={c.id} className="mb-3 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400">{c.card_type || c.brand || 'Card'}</p>
          <p className="mt-1 font-mono text-lg">•••• {String(c.last_four || c.last4 || '').slice(-4) || 'on file'}</p>
          <p className="mt-1 text-xs text-slate-500">{c.status || 'status not supplied'}</p>
        </div>
      ))}
    </ProductShell>
  );
}
