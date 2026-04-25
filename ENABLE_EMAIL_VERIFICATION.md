# ✉️ Enable Email Verification in Supabase

## Why This Matters
- ✅ Ensures only real Bennett students can register
- ✅ Verifies @bennett.edu.in email addresses
- ✅ Prevents fake accounts
- ✅ One account per email

---

## Step 1: Enable Email Confirmation in Supabase

1. Go to your **Supabase Dashboard**
2. Navigate to **Authentication** → **Settings**
3. Scroll to **Email Auth** section
4. Find **"Confirm email"** setting
5. **Enable** the toggle
6. Click **Save**

---

## Step 2: Configure Email Templates (Optional)

1. In **Authentication** → **Email Templates**
2. Customize the **Confirm signup** template:

```html
<h2>Confirm your email</h2>
<p>Follow this link to confirm your email:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
```

---

## Step 3: Update Your App Code

The email verification is already built into your app! The `EmailVerification.tsx` component handles it.

But you can add a check to prevent unverified users from accessing features:

### Option A: Block at Login (Recommended)

Update `src/context/AuthContext.tsx`:

```typescript
// In signIn function, after successful login:
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

if (data.user && !data.user.email_confirmed_at) {
  await supabase.auth.signOut();
  return { 
    error: "Please verify your email before logging in. Check your inbox." 
  };
}
```

### Option B: Show Banner (Current Implementation)

Your app already shows the `EmailVerification` banner for unverified users. This is good!

---

## Step 4: Test Email Verification

### Test Flow:
1. **Register** with a new email (e.g., `test@bennett.edu.in`)
2. **Check email** for verification link
3. **Click link** to verify
4. **Login** to your app
5. ✅ Should work without banner

### If Email Doesn't Arrive:
1. Check **Spam folder**
2. Check Supabase **Authentication** → **Users** → User should show "Unconfirmed"
3. Click **Send verification email** manually
4. Or use the **Resend** button in your app

---

## Step 5: Enforce One Account Per Email

This is **already enforced** by Supabase Auth! 

If someone tries to register with an existing email:
- ❌ Supabase will reject it
- ✅ Error: "User already registered"

---

## Step 6: Verify It's Working

### Check in Supabase Dashboard:
1. Go to **Authentication** → **Users**
2. Look at **Email Confirmed** column
3. ✅ Should show checkmark for verified users
4. ❌ Should be empty for unverified users

### Check in Your App:
```typescript
// Get current user
const { data: { user } } = await supabase.auth.getUser();

// Check if verified
if (user?.email_confirmed_at) {
  console.log("✅ Email verified");
} else {
  console.log("❌ Email not verified");
}
```

---

## Common Issues

### Issue: "Email already registered"
**Solution**: User already exists. They should use "Forgot password" to reset.

### Issue: Verification email not sending
**Solution**: 
1. Check Supabase **Settings** → **Auth** → Email provider is configured
2. For development, Supabase uses their SMTP (works out of the box)
3. For production, configure your own SMTP

### Issue: Verification link doesn't work
**Solution**: 
1. Check **Site URL** in Supabase settings
2. Should be: `http://localhost:5173` (dev) or your production URL
3. Check **Redirect URLs** includes your domain

---

## Production Checklist

Before launching:
- [ ] Email confirmation is **enabled**
- [ ] Email templates are **customized**
- [ ] SMTP is **configured** (optional, Supabase SMTP works)
- [ ] Site URL is set to **production domain**
- [ ] Redirect URLs include **production domain**
- [ ] Test registration flow **end-to-end**

---

## Summary

After enabling email verification:
1. ✅ Users must verify email to access features
2. ✅ Only @bennett.edu.in emails can register for Bennett
3. ✅ One account per email (enforced by Supabase)
4. ✅ Fake accounts prevented

**Your app is now secure!** 🔒
