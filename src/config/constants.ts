/**
 * Application-wide constants and configuration
 * Single source of truth for plan limits and constraints
 */

export const PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    maxFlipbooks: 1,
    maxFileSizeBytes: 2 * 1024 * 1024, // 2MB (rounded up from 1.5MB)
    maxFileSizeMB: 2,
    features: ['1 Flipbook', '2MB File Limit', 'Basic Sharing', 'Ad-supported']
  },
  STARTER: {
    name: 'Starter',
    price: 299,
    maxFlipbooks: 5,
    maxFileSizeBytes: 5 * 1024 * 1024, // 5MB
    maxFileSizeMB: 5,
    features: ['5 Flipbooks', '5MB File Limit', 'Standard Support', 'Remove Ads']
  },
  HOBBY: {
    name: 'Hobby',
    price: 599,
    maxFlipbooks: 10,
    maxFileSizeBytes: 10 * 1024 * 1024, // 10MB
    maxFileSizeMB: 10,
    features: ['10 Flipbooks', '10MB File Limit', 'Email Support', 'Analytics']
  },
  BUSINESS: {
    name: 'Business',
    price: 999,
    maxFlipbooks: 20,
    maxFileSizeBytes: 25 * 1024 * 1024, // 25MB
    maxFileSizeMB: 25,
    features: ['20 Flipbooks', '25MB File Limit', 'Priority Support', 'Custom Branding']
  },
  PRO: {
    name: 'Pro',
    price: 1499,
    maxFlipbooks: Infinity,
    maxFileSizeBytes: 50 * 1024 * 1024, // 50MB (rounded up from 49MB)
    maxFileSizeMB: 50,
    features: ['Unlimited Flipbooks', '50MB File Limit', '24/7 Support', 'White-labeling']
  },
} as const;

export const PAYMENT = {
  RAZORPAY_SCRIPT_URL: 'https://checkout.razorpay.com/v1/checkout.js',
  CURRENCY: 'INR',
} as const;
