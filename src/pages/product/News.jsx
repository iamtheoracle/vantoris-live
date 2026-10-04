import React from 'react';
import ProductShell from './ProductShell';
import UnavailableState from '@/components/vantoris/UnavailableState';
import { PROVIDERS } from '@/lib/providers';

export default function News() {
  return (
    <ProductShell kicker="News" title="News" subtitle="Daily briefings will attribute licensed sources. No in-house stories are published as news.">
      <UnavailableState title="News feed" detail={PROVIDERS.news.note} />
    </ProductShell>
  );
}
