import { loadStripe, Stripe } from '@stripe/stripe-js';

// Initialize Stripe with your publishable key
// Using the same key as configured in the backend
const stripePromise: Promise<Stripe | null> = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51S56nlC4JPnk6JAKZDUUh8Hxx22eZKZJef90LQtSRBYlj0OYHYSfgsxxF7LieM0fcozghPw12N7LlnyjmEtMw4nv005l17hvwr'
);

export default stripePromise;

// Stripe configuration
export const STRIPE_CONFIG = {
  // Currency for Zimbabwe - you might want to use USD or ZWL
  currency: 'usd',
  // Payment methods to enable
  paymentMethods: ['card'],
  // Appearance customization
  appearance: {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#2563eb',
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      colorDanger: '#dc2626',
      fontFamily: 'Inter, system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px',
    },
  },
};
