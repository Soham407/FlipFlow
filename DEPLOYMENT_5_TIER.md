# 5-Tier Subscription Deployment Guide

## ✅ Implementation Complete

Your FlipFlow app has been successfully upgraded from 2 tiers (Free/Pro) to 5 tiers (Free, Starter, Hobby, Business, Pro).

## 📦 What Was Changed

### Frontend Changes
1. **`src/types/index.ts`** - Expanded `UserRole` to include all 5 tiers
2. **`src/config/constants.ts`** - Added complete PLANS object with pricing, limits, and features for all tiers
3. **`src/hooks/useSubscription.ts`** - Refactored `upgradeToPro` → `subscribeToPlan(planId)` 
4. **`src/hooks/useFileUpload.ts`** - Dynamic plan validation using `PLANS[role.toUpperCase()]`
5. **`src/pages/Dashboard.tsx`** - Dynamic tier display and upgrade button
6. **`src/components/dashboard/StatsCards.tsx`** - Dynamic usage stats for all tiers

### Backend Changes
7. **`supabase/functions/create-razorpay-order/index.ts`** - Accepts `planId`, maps to server-side prices
8. **`supabase/functions/verify-razorpay-payment/index.ts`** - Reads `planId` from subscription, activates correct tier

### Database Changes
9. **`supabase/migrations/20251125000000_five_tier_subscription.sql`** - Adds new enum values and `plan_id` column

---

## 🚀 Deployment Steps

### Step 1: Deploy Database Migration

Run the migration to add new tiers to your database:

```powershell
npx supabase db push
```

Or if using Supabase CLI:

```powershell
supabase db push
```

This will:
- Add `starter`, `hobby`, `business` to the `app_role` enum
- Add `plan_id` column to `subscriptions` table
- Update triggers to enforce limits for all 5 tiers

### Step 2: Deploy Edge Functions

Deploy the updated payment functions:

```powershell
npx supabase functions deploy create-razorpay-order
npx supabase functions deploy verify-razorpay-payment
```

### Step 3: Configure Razorpay Plans

**CRITICAL**: Go to your [Razorpay Dashboard](https://dashboard.razorpay.com) and create 4 new plans:

| Plan ID   | Amount (INR) | Billing Cycle |
|-----------|--------------|---------------|
| `starter` | ₹299         | Monthly       |
| `hobby`   | ₹599         | Monthly       |
| `business`| ₹999         | Monthly       |
| `pro`     | ₹1499        | Monthly       |

> **Note**: The plan IDs in Razorpay don't need to match exactly, but the amounts should match what's defined in `create-razorpay-order/index.ts`.

### Step 4: Build and Deploy Frontend

Build your app:

```powershell
npm run build
```

Deploy to your hosting platform (Vercel, Netlify, etc.):

```powershell
# If using Vercel
vercel --prod

# Or push to GitHub if auto-deploy is configured
git add .
git commit -m "Implement 5-tier subscription system"
git push origin main
```

---

## 🧪 Testing Checklist

Before going live, test each tier:

- [ ] **Free User** - Can create 1 flipbook, max 2MB file
- [ ] **Starter Purchase** - Payment flow charges ₹299, activates 5 flipbook limit
- [ ] **Hobby Purchase** - Payment flow charges ₹599, activates 10 flipbook limit
- [ ] **Business Purchase** - Payment flow charges ₹999, activates 20 flipbook limit
- [ ] **Pro Purchase** - Payment flow charges ₹1499, activates unlimited flipbooks
- [ ] Upload limits enforced (reject files over plan's MB limit)
- [ ] Flipbook count limits enforced (reject creation when quota exceeded)
- [ ] Dashboard displays correct tier badge and usage stats
- [ ] Success toast shows correct plan name after payment

---

## 🛡️ Security Notes

1. **Server-Side Price Validation**: Prices are defined in `create-razorpay-order/index.ts` (server), NOT in frontend constants. This prevents users from manipulating prices.

2. **Plan ID Storage**: The `plan_id` is stored in the `subscriptions` table when the order is created, then read during payment verification to ensure correct role activation.

3. **Signature Verification**: All payments are verified using HMAC signature before activating subscriptions.

---

## 📊 Plan Limits Reference

| Tier     | Max Flipbooks | Max File Size | Price (INR/month) |
|----------|---------------|---------------|-------------------|
| Free     | 1             | 2MB           | ₹0                |
| Starter  | 5             | 5MB           | ₹299              |
| Hobby    | 10            | 10MB          | ₹599              |
| Business | 20            | 25MB          | ₹999              |
| Pro      | Unlimited     | 50MB          | ₹1499             |

---

## 🔧 Troubleshooting

### Issue: "Invalid or missing Plan ID" error
**Solution**: Ensure frontend is passing `planId` in the request body to `create-razorpay-order`.

### Issue: Wrong tier activated after payment
**Solution**: Check that `plan_id` is being stored correctly in `subscriptions` table and read in `verify-razorpay-payment`.

### Issue: Database migration fails
**Solution**: Ensure you're on the latest version of Supabase CLI. Try `supabase db reset` in development.

### Issue: Upgrade button still shows "Pro"
**Solution**: Clear browser cache and rebuild frontend. Check that Dashboard.tsx is using `subscribeToPlan` instead of `upgradeToPro`.

---

## 📝 Next Steps (Optional Enhancements)

1. **Pricing Page**: Create a dedicated `/pricing` page with all 5 tiers displayed
2. **Plan Comparison Table**: Show feature comparison between tiers
3. **Annual Billing**: Add discounted annual plans
4. **Downgrade Flow**: Allow users to switch to lower tiers
5. **Usage Alerts**: Email users when approaching their limits
6. **Admin Dashboard**: View subscription analytics per tier

---

## 🎉 Success!

Your 5-tier subscription system is now live! Users can choose the plan that fits their needs, and your backend will correctly enforce limits and charge the right amount for each tier.

For support, check:
- Supabase Logs: `npx supabase functions logs`
- Razorpay Dashboard: Payment history
- Browser Console: Frontend errors
