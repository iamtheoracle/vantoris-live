import React from 'react';
import ProductShell from './ProductShell';
import UnavailableState from '@/components/vantoris/UnavailableState';
import { PROVIDERS } from '@/lib/providers';

export default function Homes() {
  return (
    <ProductShell kicker="Homes" title="Homes" subtitle="Search, map, and saved homes require a licensed listing provider. Listings are not fabricated.">
      <UnavailableState title="Listing provider" detail={PROVIDERS.homes.note} />
    </ProductShell>
  );
}
