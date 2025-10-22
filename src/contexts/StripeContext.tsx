import React, { createContext, useContext, ReactNode } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import stripePromise, { STRIPE_CONFIG } from '@/lib/stripe';

interface StripeContextType {
  // Add any Stripe-related context values here if needed
}

const StripeContext = createContext<StripeContextType>({});

export const useStripeContext = () => {
  const context = useContext(StripeContext);
  if (!context) {
    throw new Error('useStripeContext must be used within a StripeProvider');
  }
  return context;
};

interface StripeProviderProps {
  children: ReactNode;
}

export const StripeProvider: React.FC<StripeProviderProps> = ({ children }) => {
  return (
    <StripeContext.Provider value={{}}>
      <Elements stripe={stripePromise} options={STRIPE_CONFIG}>
        {children}
      </Elements>
    </StripeContext.Provider>
  );
};


