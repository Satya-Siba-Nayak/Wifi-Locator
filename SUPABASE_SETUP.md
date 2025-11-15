# Supabase Configuration for Password Reset

## ⚠️ IMPORTANT: Configure Redirect URLs

For password reset to work properly, you **MUST** add the redirect URL to your Supabase project settings.

---

## Step-by-Step Setup

### 1. Go to Supabase Dashboard

1. Open your browser and go to: https://supabase.com/dashboard
2. Select your project: **wpricnstuqteataicqus**

### 2. Navigate to Authentication Settings

1. In the left sidebar, click **Authentication**
2. Click **URL Configuration** tab

### 3. Add Redirect URLs

In the **Redirect URLs** section, add these URLs:

```
http://localhost:8000/reset-password.html
http://127.0.0.1:8000/reset-password.html
```

If you're deploying to production, also add:
```
https://yourdomain.com/reset-password.html
```

**Click "Save" after adding!**

---

## 4. Test Password Reset

### Test Locally:

1. Open http://localhost:8000/
2. Click profile icon → Login
3. Click "Forgot Password?"
4. Enter your email
5. Click "Send Reset Link"
6. Check your email
7. Click the reset link
8. Should open: http://localhost:8000/reset-password.html
9. Enter new password
10. Should redirect back to login

---

## Common Issues & Fixes

### Issue: "Unable to verify reset link"

**Cause:** Redirect URL not configured in Supabase

**Fix:**
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add `http://localhost:8000/reset-password.html`
3. Click Save
4. Try again

### Issue: "Invalid or expired reset link"

**Cause:** Link was already used or expired (1 hour)

**Fix:** Request a new password reset link

### Issue: Email not received

**Possible causes:**
1. Check spam/junk folder
2. Email service not configured in Supabase
3. Rate limit exceeded

**Fix:**
1. Check Supabase Dashboard → Authentication → Email Templates
2. Verify SMTP settings (or use default Supabase email)
3. Wait a few minutes and try again

### Issue: "Cannot read properties of null (reading 'auth')"

**Cause:** Supabase not initialized properly

**Fix:**
1. Hard refresh the page (Ctrl+Shift+R)
2. Check browser console for initialization errors
3. Verify `supabase-config.js` is loading correctly

---

## Email Template Customization (Optional)

### 1. Go to Email Templates

Supabase Dashboard → Authentication → Email Templates → **Reset Password**

### 2. Customize the Template

Default template includes:
```html
<h2>Reset Password</h2>
<p>Follow this link to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
```

You can customize:
- Subject line
- Email body
- Logo/branding
- Button styles

### 3. Test the Email

1. Click "Send test email"
2. Enter your email
3. Check inbox
4. Verify link works

---

## Verify Configuration

### Quick Check:

Open browser console (F12) and run:

```javascript
// Check if Supabase is loaded
console.log('Supabase:', window.supabase);

// Check if auth service is loaded  
console.log('Auth Service:', window.authService);

// Test redirect URL
const redirectUrl = `${window.location.protocol}//${window.location.host}/reset-password.html`;
console.log('Reset URL:', redirectUrl);
```

**Expected output:**
```
Supabase: SupabaseClient {...}
Auth Service: SupabaseAuthService {...}
Reset URL: http://localhost:8000/reset-password.html
```

---

## Production Deployment Checklist

When deploying to production:

- [ ] Update redirect URLs in Supabase to include production domain
- [ ] Configure custom SMTP (optional, for branded emails)
- [ ] Test password reset flow end-to-end
- [ ] Set up email monitoring/logging
- [ ] Configure rate limits for reset requests
- [ ] Add analytics tracking (optional)
- [ ] Test on different devices/browsers

---

## Current Configuration

**Your Supabase Project:**
- URL: `https://wpricnstuqteataicqus.supabase.co`
- Project: wpricnstuqteataicqus

**Local Development:**
- Main app: http://localhost:8000/
- Reset page: http://localhost:8000/reset-password.html

**Files:**
- `supabase-config.js` - Supabase client initialization
- `supabase-auth.js` - Auth service with reset functions
- `reset-password.html` - Password reset page
- `index.html` - Main app with forgot password link

---

## Need Help?

1. **Supabase Docs:** https://supabase.com/docs/guides/auth/passwords
2. **Console Errors:** Check browser console (F12) for detailed errors
3. **Network Tab:** Check Network tab to see API calls
4. **Email Logs:** Supabase Dashboard → Logs → Auth

---

## Summary

✅ **What You Need to Do:**

1. Go to: https://supabase.com/dashboard/project/wpricnstuqteataicqus/auth/url-configuration
2. Add redirect URL: `http://localhost:8000/reset-password.html`
3. Click "Save"
4. Test password reset flow

That's it! 🎉
