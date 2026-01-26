# Environment Setup for Resend

## Quick Setup Guide

### 1. Get Resend API Key

1. Go to https://resend.com and create an account
2. Navigate to https://resend.com/api-keys
3. Click "Create API Key"
4. Copy your API key (starts with `re_`)

### 2. Set Environment Variables

#### For Local Development:

Create or update your `.env` file in the backend root:

```bash
# Resend Email Configuration
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=onboarding@resend.dev
```

> **Note**: For testing, you can use `onboarding@resend.dev` which is Resend's test email.
> For production, verify your own domain.

#### For Production Deployment:

Add these environment variables to your deployment platform:

**Render:**
- Dashboard → Your Service → Environment → Add Environment Variable
- Add `RESEND_API_KEY` and `RESEND_FROM_EMAIL`

**Vercel:**
- Project Settings → Environment Variables
- Add both variables

**Docker:**
```bash
docker run -e RESEND_API_KEY=re_xxx -e RESEND_FROM_EMAIL=noreply@yourdomain.com ...
```

### 3. Verify Your Domain (Production Only)

For production use:
1. Go to https://resend.com/domains
2. Add your domain
3. Add the provided DNS records (TXT, MX, etc.)
4. Wait for verification
5. Use an email from that domain (e.g., `noreply@yourdomain.com`)

### 4. Old Variables to Remove

These are no longer needed and can be removed:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`

---

## Free Tier Limits

Resend's free tier includes:
- ✅ 100 emails per day
- ✅ 3,000 emails per month
- ✅ All features included
- ✅ No credit card required

Perfect for development and small production apps!
