# ⚡ Quick Start - Launch in 30 Minutes

## Step 1: Create OG Image (10 min)
```
1. Go to Canva.com
2. Search "Open Graph" template (1200x630px)
3. Add your logo + text: "Transform PDFs into Interactive Flipbooks"
4. Download as PNG
5. Save to: public/Images/og-preview.png
```

## Step 2: Update Contact Info (5 min)
**Edit these files:**

`src/pages/Contact.tsx`:
```tsx
// Line ~60
[Your Business Name]
[Your Street Address]
[City, State, PIN]
India
```

`src/pages/Terms.tsx`:
```tsx
// Line ~340
the courts of [Your City/State]
```

## Step 3: Switch to Live Payments (5 min)
**Update environment variables:**
```bash
# Change from test to live
VITE_RAZORPAY_KEY_ID=rzp_live_xxxxx  # NOT rzp_test_xxxxx
```

**In Razorpay Dashboard:**
1. Settings → Webhooks
2. Update URL to: `https://YOUR-PROJECT.supabase.co/functions/v1/verify-razorpay-payment`
3. Enable events: payment.captured, payment.failed

## Step 4: Deploy (5 min)
```bash
# Build locally first
npm run build

# Deploy to Vercel
vercel --prod

# Add environment variables in Vercel dashboard:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY  
# - VITE_R2_PUBLIC_URL
# - VITE_RAZORPAY_KEY_ID (LIVE key)
# - VITE_GA_MEASUREMENT_ID
```

## Step 5: Test Everything (5 min)
```
✓ Visit your live URL
✓ Create test account
✓ Upload a PDF
✓ View flipbook
✓ Share link on WhatsApp (check preview)
✓ Make test payment with REAL card
✓ Verify subscription activates
✓ Refund yourself (optional)
```

---

## 🎉 You're Live!

### Announce on:
- [ ] Twitter/X
- [ ] LinkedIn  
- [ ] Product Hunt
- [ ] Reddit (r/SideProject)
- [ ] IndieHackers

### Monitor:
- Vercel Analytics (traffic)
- Supabase Dashboard (signups)
- Razorpay Dashboard (payments)
- Gmail (support emails)

---

## 🆘 Emergency Commands

**Build fails?**
```bash
rm -rf node_modules dist
npm install
npm run build
```

**Deployment issues?**
```bash
vercel --prod --debug
```

**Check logs:**
```bash
# Vercel
vercel logs

# Supabase Edge Functions
# Go to: Dashboard → Edge Functions → Logs
```

---

## 📞 Quick Links

- **Your Site:** https://flipflow.vercel.app (update after deploy)
- **Razorpay:** https://dashboard.razorpay.com
- **Supabase:** https://supabase.com/dashboard
- **Vercel:** https://vercel.com/dashboard
- **Analytics:** https://analytics.google.com

---

**Total Time:** 30 minutes
**Difficulty:** Easy ✅
**Launch Readiness:** 98% → 100%

Go ship it! 🚀
