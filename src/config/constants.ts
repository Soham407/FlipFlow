/**
 * Application-wide constants and configuration
 * Single source of truth for plan limits and constraints
 */

export const PLANS = {
  FREE: {
    name: 'Free',
    maxFlipbooks: 3,
    maxFileSizeBytes: 10 * 1024 * 1024, // 10MB
    maxFileSizeMB: 10,
  },
  PRO: {
    name: 'Pro',
    maxFlipbooks: Infinity,
    maxFileSizeBytes: 50 * 1024 * 1024, // 50MB
    maxFileSizeMB: 50,
  },
} as const;

export const PAYMENT = {
  RAZORPAY_SCRIPT_URL: 'https://checkout.razorpay.com/v1/checkout.js',
  PRO_PLAN_PRICE_INR: 100,
  CURRENCY: 'INR',
} as const;
