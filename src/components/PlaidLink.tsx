'use client';

import { usePlaidLink } from 'react-plaid-link';
import { useState } from 'react';

interface PlaidLinkProps {
  onSuccess: (publicToken: string) => void;
  onExit?: () => void;
  className?: string;
}

export default function PlaidLink({ onSuccess, onExit, className = '' }: PlaidLinkProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const createLinkToken = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/plaid/create-link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user' }),
      });
      
      const data = await response.json();
      setLinkToken(data.link_token);
    } catch (error) {
      console.error('Error creating link token:', error);
    } finally {
      setLoading(false);
    }
  };

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (public_token, metadata) => {
      onSuccess(public_token);
    },
    onExit: (err, metadata) => {
      console.log('Plaid Link exit:', err, metadata);
      onExit?.();
    },
  });

  const handleConnect = async () => {
    if (!linkToken) {
      await createLinkToken();
    } else {
      open();
    }
  };

  return (
    <button
      onClick={handleConnect}
      disabled={loading || !ready}
      className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? 'Connecting...' : 'Connect Bank Account'}
    </button>
  );
}
