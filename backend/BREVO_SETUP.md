# Brevo (Sendinblue) Email Setup Guide

## Why Brevo?

Brevo (formerly Sendinblue) has a much better free tier than Resend:
- ✅ **300 emails per day** for FREE (vs Resend's paid-only for non-sandbox)
- ✅ Send to **any email address** (no sandbox restrictions)
- ✅ No credit card required
- ✅ Reliable transactional email delivery

---

## Quick Setup (5 minutes)

### Step 1: Create Brevo Account

1. Go to **https://app.brevo.com/account/register**
2. Sign up with your email
3. Verify your email address

### Step 2: Get Your API Key

1. After logging in, go to **https://app.brevo.com/settings/keys/api**
2. Click **"Generate a new API key"**
3. Give it a name (e.g., "Qpoint OTP Service")
4. Copy the API key (starts with `xkeysib-`)

> ⚠️ **Important**: Save this key immediately! You won't be able to see it again.

### Step 3: Set Environment Variables

You need to set these two environment variables:

#### For Local Development (.env file):

Create or update your `.env` file:

```bash
# Brevo Email Configuration
BREVO_API_KEY=xkeysib-your-api-key-here
BREVO_FROM_EMAIL=your-email@example.com
```

#### For Production Deployment:

**Render:**
```
Dashboard → Your Service → Environment
Add:
- BREVO_API_KEY = xkeysib-...
- BREVO_FROM_EMAIL = your-email@example.com
```

**Vercel:**
```
Project Settings → Environment Variables
Add both variables
```

**Docker:**
```bash
docker run -e BREVO_API_KEY=xkeysib-... -e BREVO_FROM_EMAIL=your@email.com ...
```

---

## Sender Email Setup

### Option 1: Use Your Email (Recommended for Testing)

You can use **any valid email address** as the sender, even if you don't own the domain! Brevo will send the email on your behalf.

Example:
```bash
BREVO_FROM_EMAIL=noreply@yourdomain.com
```

### Option 2: Verify a Domain (Recommended for Production)

For better deliverability in production:

1. Go to **https://app.brevo.com/settings/senders**
2. Click **"Add a new domain"**
3. Add your domain (e.g., `yourdomain.com`)
4. Follow the DNS configuration steps
5. Use an email from that domain (e.g., `noreply@yourdomain.com`)

---

## Testing Your Setup

1. **Set the environment variables** (see above)

2. **Restart your application:**
   ```bash
   .\mvnw.cmd spring-boot:run
   ```

3. **Test OTP sending:**
   - Make a request to your OTP endpoint
   - Check the recipient's inbox
   - You can send to **any email address** - no restrictions!

4. **Check the console:**
   - If successful: "Email sent successfully via Brevo to: [email]"
   - If failed: Check the error message

---

## Free Tier Limits

| Feature | Free Tier |
|---------|-----------|
| Emails per day | **300** |
| Emails per month | **9,000** |
| Sender addresses | Unlimited |
| Recipients | Any email address |
| API access | Full access |
| Support | Community |

Perfect for production apps with moderate traffic!

---

## Troubleshooting

### "Unauthorized" Error
- ✅ Check that `BREVO_API_KEY` is set correctly
- ✅ Make sure the API key starts with `xkeysib-`
- ✅ Restart your application after setting environment variables

### Email Not Received
- ✅ Check spam folder
- ✅ Verify the recipient email is correct
- ✅ Check Brevo dashboard for delivery stats: https://app.brevo.com/statistics

### "Invalid Sender" Error
- ✅ Make sure `BREVO_FROM_EMAIL` is a valid email format
- ✅ You can use any email, no verification needed for testing
- ✅ For production, verify your domain for better deliverability

---

## Migration Notes

### Old Variables to Remove:
- ❌ `RESEND_API_KEY`
- ❌ `RESEND_FROM_EMAIL`

### New Variables Required:
- ✅ `BREVO_API_KEY` (starts with `xkeysib-`)
- ✅ `BREVO_FROM_EMAIL` (any valid email address)

---

## API Dashboard

Monitor your emails at: **https://app.brevo.com/statistics**

You can see:
- Emails sent
- Delivery rate
- Bounce rate
- Opens and clicks (if enabled)
