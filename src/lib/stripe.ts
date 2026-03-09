import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';

export const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16' as any, // use latest compatible version, this assumes 2023-10-16 for widespread compat, or dynamic
});
