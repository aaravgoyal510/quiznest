'use client';
import { useEffect } from 'react';

/** Dev-only: connect Reticle + install the React adapter, after hydration. */
export function ReticleDev() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    void import('@reticlehq/react').then(({ reticle, install }) => {
      install();
      reticle.connect({ url: 'ws://localhost:3000/reticle', projectId: 'next-app-ca84805e' });
    });
  }, []);
  return null;
}
