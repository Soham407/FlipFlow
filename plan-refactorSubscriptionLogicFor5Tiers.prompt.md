## Plan: Refactor Subscription Logic for 5 Tiers

Upgrade your subscription logic to support 5 distinct tiers (Free, Starter, Hobby, Business, Pro) instead of just Free/Pro. This ensures all plan-specific limits and features are enforced throughout your app.

### Steps
1. Update the `PLANS` object in `src/config/constants.ts` to match the new 5-tier structure.
2. Refactor `src/hooks/useSubscription.ts` to return the user's current plan as one of the 5 roles (e.g., `'free'`, `'starter'`, `'hobby'`, `'business'`, `'pro'`).
3. Ensure all logic that checks for plan limits (e.g., in `src/hooks/useFileUpload.ts`) uses the dynamic plan from `useSubscription` and references the correct limits from `PLANS`.
4. Update any hardcoded plan checks (e.g., `userRole === 'pro'`) to use the new dynamic plan logic.
5. Confirm that your Supabase `products` and `prices` tables, and Razorpay dashboard, have all 5 plans set up, with correct IDs mapped in your database or `.env`.

### Further Considerations
1. Should plan names in code match database values exactly (e.g., `'starter'` vs `'Starter'`) for consistency?
2. Do you want to enforce plan limits on both frontend and backend for security?
3. Would you like to display the user's current plan and upgrade options in the dashboard UI?
