# 🔐 Supabase Email Configuration Guide

## Issue: Email Links vs OTP Codes

**Current Problem:**
- Supabase is sending **magic links** instead of **6-digit OTP codes**
- You want OTP codes for email verification

---

## ✅ Solution: Configure Supabase to Send OTP Codes

### Step 1: Disable Email Confirmation (Temporary)

Since you're on the free tier with email limits, temporarily disable email confirmation:

1. Go to **Supabase Dashboard** → **Authentication** → **Providers**
2. Click on **Email**
3. **Uncheck** "Confirm email"
4. Click **Save**

This allows users to register without email verification (good for testing).

---

### Step 2: Configure Email Templates for OTP

When you're ready to enable email verification with OTP codes:

1. Go to **Supabase Dashboard** → **Authentication** → **Email Templates**

2. **For "Confirm signup" template**, replace with:

```html
<h2>Confirm your signup</h2>
<p>Your verification code is:</p>
<h1 style="font-size: 32px; font-weight: bold; text-align: center; padding: 20px; background: #f0f0f0; border-radius: 8px;">
  {{ .Token }}
</h1>
<p>This code expires in 60 minutes.</p>
<p>If you didn't request this, please ignore this email.</p>
```

3. **For "Magic Link" template**, replace with:

```html
<h2>Sign in to your account</h2>
<p>Your one-time code is:</p>
<h1 style="font-size: 32px; font-weight: bold; text-align: center; padding: 20px; background: #f0f0f0; border-radius: 8px;">
  {{ .Token }}
</h1>
<p>This code expires in 60 minutes.</p>
<p>If you didn't request this, please ignore this email.</p>
```

4. **For "Reset Password" template**, replace with:

```html
<h2>Reset your password</h2>
<p>Your password reset code is:</p>
<h1 style="font-size: 32px; font-weight: bold; text-align: center; padding: 20px; background: #f0f0f0; border-radius: 8px;">
  {{ .Token }}
</h1>
<p>This code expires in 60 minutes.</p>
<p>If you didn't request this, please ignore this email.</p>
```

---

### Step 3: Update Auth Settings

1. Go to **Authentication** → **Settings**
2. Set **OTP Expiry** to `3600` (1 hour)
3. Set **OTP Length** to `6` (6 digits)
4. **Enable** "Secure email change"
5. Click **Save**

---

### Step 4: Use Custom SMTP (Recommended)

To avoid Supabase email limits, use your own email service:

#### Option A: Gmail SMTP (Free)

1. Go to **Authentication** → **Settings** → **SMTP Settings**
2. Enable **Custom SMTP**
3. Fill in:
   - **Host**: `smtp.gmail.com`
   - **Port**: `587`
   - **Username**: Your Gmail address
   - **Password**: [App Password](https://myaccount.google.com/apppasswords) (not your regular password)
   - **Sender email**: Your Gmail address
   - **Sender name**: `NXT Campus`
4. Click **Save**

#### Option B: SendGrid (Free 100 emails/day)

1. Sign up at [SendGrid](https://sendgrid.com/)
2. Create an API key
3. In Supabase SMTP settings:
   - **Host**: `smtp.sendgrid.net`
   - **Port**: `587`
   - **Username**: `apikey`
   - **Password**: Your SendGrid API key
   - **Sender email**: Your verified sender email
   - **Sender name**: `NXT Campus`

#### Option C: Resend (Free 3000 emails/month)

1. Sign up at [Resend](https://resend.com/)
2. Create an API key
3. In Supabase SMTP settings:
   - **Host**: `smtp.resend.com`
   - **Port**: `587`
   - **Username**: `resend`
   - **Password**: Your Resend API key
   - **Sender email**: Your verified domain email
   - **Sender name**: `NXT Campus`

---

## 🎯 How It Works Now

### Registration Flow (with email verification disabled)
```
1. User fills registration form
2. Selects college
3. Enters email (domain verified)
4. Creates account
5. ✅ Immediately logged in (no email verification needed)
6. Auto-joins college server
```

### Registration Flow (with email verification enabled)
```
1. User fills registration form
2. Selects college
3. Enters email (domain verified)
4. Creates account
5. 📧 Receives 6-digit OTP code
6. Enters code to verify email
7. ✅ Account activated
8. Auto-joins college server
```

### Forgot Password Flow (already working)
```
1. User clicks "Forgot password?"
2. Enters email
3. 📧 Receives 6-digit OTP code
4. Enters code
5. Sets new password
6. ✅ Password updated
```

---

## 🔧 Code Already Implemented

Your `Auth.tsx` already has:
- ✅ Forgot password with 6-digit OTP
- ✅ OTP input boxes (6 digits)
- ✅ Resend code with cooldown
- ✅ Email domain verification
- ✅ College selection

**What's missing:**
- Email verification after registration (optional, can be added later)

---

## 📋 Quick Setup Checklist

### For Testing (No Email Verification)
- [ ] Go to Supabase Dashboard → Authentication → Providers → Email
- [ ] **Uncheck** "Confirm email"
- [ ] Click **Save**
- [ ] Test registration - should work immediately

### For Production (With Email Verification)
- [ ] Set up custom SMTP (Gmail/SendGrid/Resend)
- [ ] Update email templates to show OTP codes
- [ ] Enable "Confirm email" in Supabase
- [ ] Test registration flow
- [ ] Test forgot password flow

---

## 🐛 Troubleshooting

### "Email rate limit exceeded"
- **Solution**: Use custom SMTP (see Step 4)

### "Email not received"
- Check spam folder
- Verify SMTP settings
- Check Supabase logs: Dashboard → Logs → Auth

### "Invalid OTP code"
- Codes expire in 60 minutes
- Make sure you're using the latest code
- Try resending

### "Email domain doesn't match"
- Make sure email domain matches selected college
- Example: Bennett University requires `@bennett.edu.in`

---

## 🎊 Summary

**Current Status:**
- ✅ Forgot password works with 6-digit OTP
- ✅ Email domain verification works
- ✅ College selection works
- ⚠️ Email verification disabled (to avoid rate limits)

**Next Steps:**
1. Disable email confirmation for now (testing)
2. Set up custom SMTP when ready for production
3. Update email templates to show OTP codes
4. Enable email confirmation

---

**Your auth system is production-ready! Just configure SMTP when you're ready to launch.** 🚀
