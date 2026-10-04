import React from 'react';
import ProductShell from './ProductShell';
import UnavailableState from '@/components/vantoris/UnavailableState';
import { PROVIDERS } from '@/lib/providers';

export default function Travel() {
  return (
    <ProductShell
      kicker="Travel"
      title="Travel"
      subtitle="Flights, hotels, cars, and tracking appear here only after a licensed provider is connected. No sample itineraries."
    >
      <div className="space-y-3">
        {['flights', 'hotels', 'cars', 'flightTracking'].map((key) => (
          <UnavailableState key={key} title={PROVIDERS[key].label} detail={PROVIDERS[key].note} />
        ))}
      </div>
    </ProductShell>
  );
}
