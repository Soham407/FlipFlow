# Edge Functions Deployment Guide

## ✅ Edge Functions Deployed Successfully!

All Edge Functions have been deployed to your Supabase project:

| Function                  | Status    | Purpose                                |
| ------------------------- | --------- | -------------------------------------- |
| `upload-to-r2`            | ✅ ACTIVE | Upload PDFs to Cloudflare R2 storage   |
| `delete-from-r2`          | ✅ ACTIVE | Delete PDFs from Cloudflare R2 storage |
| `create-razorpay-order`   | ✅ ACTIVE | Create Razorpay payment orders         |
| `verify-razorpay-payment` | ✅ ACTIVE | Verify Razorpay payment signatures     |
| `razorpay-preflight`      | ✅ ACTIVE | Handle CORS preflight for Razorpay     |

---

## ⚠️ Required: Set Environment Variables (Secrets)

The Edge Functions need **Cloudflare R2 credentials** to work. You must set these secrets in your Supabase project:

### How to Set Secrets:

1. **Go to Supabase Dashboard**:
   - Visit: https://supabase.com/dashboard/project/qqetlzgepolalrmtncik/settings/functions

2. **Add the following secrets**:

   | Secret Name            | Value                      | Where to Find                                                          |
   | ---------------------- | -------------------------- | ---------------------------------------------------------------------- |
   | `R2_ACCOUNT_ID`        | Your Cloudflare account ID | From `.env`: `VITE_R2_ACCOUNT_ID` = `f36389b9bd6a7da643fe64b66dbab7d0` |
   | `R2_ACCESS_KEY_ID`     | Your R2 access key ID      | From Cloudflare R2 dashboard                                           |
   | `R2_SECRET_ACCESS_KEY` | Your R2 secret access key  | From Cloudflare R2 dashboard                                           |
   | `R2_BUCKET_NAME`       | Your R2 bucket name        | Likely `flipflow-pdfs` or similar                                      |

### Getting R2 Credentials from Cloudflare:

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Go to **R2** → **Overview**
3. Click **Manage R2 API Tokens**
4. Create a new API token with:
   - **Permissions**: Object Read & Write
   - **Apply to specific buckets**: Select your FlipFlow bucket
5. Copy the **Access Key ID** and **Secret Access Key**
6. Get your **Bucket Name** from R2 → Buckets

### Setting Secrets via Supabase CLI (Alternative):

If you prefer using the CLI, you can set secrets with:

```bash
npx supabase secrets set R2_ACCOUNT_ID=f36389b9bd6a7da643fe64b66dbab7d0 --project-ref qqetlzgepolalrmtncik
npx supabase secrets set R2_ACCESS_KEY_ID=your_access_key_id --project-ref qqetlzgepolalrmtncik
npx supabase secrets set R2_SECRET_ACCESS_KEY=your_secret_key --project-ref qqetlzgepolalrmtncik
npx supabase secrets set R2_BUCKET_NAME=your_bucket_name --project-ref qqetlzgepolalrmtncik
```

---

## 🔍 Troubleshooting

### CORS Error Still Appearing?

If you still see CORS errors after setting secrets:

1. **Wait 1-2 minutes** for the Edge Functions to restart with new secrets
2. **Refresh your browser** (hard refresh: Ctrl+Shift+R)
3. **Check the Edge Function logs**:
   - Go to: https://supabase.com/dashboard/project/qqetlzgepolalrmtncik/logs/edge-functions
   - Look for errors related to missing environment variables

### Common Errors:

| Error                          | Cause               | Solution                             |
| ------------------------------ | ------------------- | ------------------------------------ |
| `R2_ACCOUNT_ID is not defined` | Missing secret      | Set the secret in Supabase dashboard |
| `Failed to upload to R2`       | Invalid credentials | Verify R2 API token permissions      |
| `Bucket not found`             | Wrong bucket name   | Check bucket name in Cloudflare R2   |

---

## 📊 Current Status

### Environment Variables in `.env`:

- ✅ `VITE_SUPABASE_PROJECT_ID` = `qqetlzgepolalrmtncik`
- ✅ `VITE_SUPABASE_URL` = `https://qqetlzgepolalrmtncik.supabase.co`
- ✅ `VITE_SUPABASE_PUBLISHABLE_KEY` = Set correctly
- ✅ `VITE_R2_ACCOUNT_ID` = `f36389b9bd6a7da643fe64b66dbab7d0`
- ✅ `VITE_R2_PUBLIC_URL` = `https://pub-6e017df3e0c34dea95ace01fa799fcb7.r2.dev`

### What's Missing:

- ⚠️ **Edge Function Secrets** (R2 credentials) - Must be set in Supabase dashboard

---

## 🚀 Next Steps

1. **Set R2 secrets** in Supabase dashboard (see instructions above)
2. **Wait 1-2 minutes** for Edge Functions to restart
3. **Try uploading a flipbook** again
4. **Check logs** if issues persist

---

## 📝 Additional Notes

### R2 Public URL Configuration:

Your R2 public URL is: `https://pub-6e017df3e0c34dea95ace01fa799fcb7.r2.dev`

Make sure this domain is configured in Cloudflare R2:

1. Go to R2 → Your Bucket → Settings
2. Enable **Public Access** (if needed for viewing flipbooks)
3. Verify the public URL matches your `.env` file

### Security:

- All Edge Functions have **JWT verification enabled** ✅
- Only authenticated users can upload/delete files ✅
- File paths include user ID for ownership verification ✅
- Database RLS policies enforce access control ✅

---

**Once you set the R2 secrets, your FlipFlow app will be fully functional! 🎉**
