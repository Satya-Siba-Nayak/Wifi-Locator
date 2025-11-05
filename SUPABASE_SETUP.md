# Supabase Setup Guide - Wi-Fi Locator

This guide explains how to use Supabase with the Wi-Fi Locator application for authentication and database operations.

## Overview

Your application is now connected to Supabase with:
- **Project URL**: `https://wpricnstuqteataicqus.supabase.co`
- **Project ID**: `wpricnstuqteataicqus`

## Features Implemented

✅ **Authentication**
- Email/Password sign up and sign in
- Google OAuth authentication
- Automatic profile creation
- Session management

✅ **Database Operations**
- Hotspot creation and retrieval
- Report submission with decay timer (30-day validity)
- User profiles with gamification points
- Geospatial queries for map viewport

✅ **Security**
- Row Level Security (RLS) enabled
- Anonymous submissions through views
- User-specific data access

## Database Schema

Your database includes:

### Tables

1. **profiles** - User data and gamification
   - `id` (UUID) - Links to auth.users
   - `username` (TEXT) - Unique username
   - `points` (INT) - Gamification points
   - `created_at` (TIMESTAMPTZ)

2. **hotspots** - Wi-Fi location pins
   - `id` (BIGSERIAL) - Primary key
   - `name` (TEXT) - Location name
   - `location` (GEOGRAPHY) - PostGIS point
   - `address_text` (TEXT) - Human-readable address
   - `created_by` (UUID) - User who created it

3. **reports** - Time-series data submissions
   - `id` (BIGSERIAL)
   - `hotspot_id` (BIGINT)
   - `user_id` (UUID)
   - `speed_rating` (ENUM) - no_signal, email_only, browsing, streaming, gaming_high
   - `noise_level` (ENUM) - silent, quiet, moderate, loud
   - `security_rating` (ENUM) - open_unsecured, captive_portal, wpa2_wpa3, enterprise, unknown
   - `password_text` (TEXT) - Wi-Fi password
   - `comment` (TEXT)
   - `created_at` (TIMESTAMPTZ)

### Views

- **live_hotspot_data** - Aggregated hotspot data with 30-day decay timer
  - Automatically shows only recent reports
  - Calculates average speed ratings
  - Shows latest password/security info
  - Hides stale hotspots

## Setup Instructions

### 1. Enable Email Authentication

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/wpricnstuqteataicqus)
2. Click **Authentication** → **Providers**
3. Find **Email** provider
4. Toggle **Enable Email provider** to ON
5. Configure settings:
   - ✅ Enable email confirmations (recommended for production)
   - ✅ Enable secure password recovery
6. Click **Save**

### 2. Enable Google OAuth

1. In **Authentication** → **Providers**
2. Find **Google** provider and click to expand
3. Toggle **Enable Sign in with Google** to ON
4. You need to configure Google OAuth credentials:

#### Get Google OAuth Credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google+ API**
4. Go to **APIs & Services** → **Credentials**
5. Click **Create Credentials** → **OAuth 2.0 Client ID**
6. Choose **Web application**
7. Add authorized redirect URIs:
   ```
   https://wpricnstuqteataicqus.supabase.co/auth/v1/callback
   ```
8. Copy the **Client ID** and **Client Secret**

#### Add to Supabase:

1. Back in Supabase Dashboard → **Authentication** → **Providers** → **Google**
2. Paste your **Client ID**
3. Paste your **Client Secret**
4. Click **Save**

### 3. Configure Email Templates (Optional)

1. Go to **Authentication** → **Email Templates**
2. Customize:
   - Confirmation email
   - Password recovery email
   - Magic link email

### 4. Set Redirect URLs

1. Go to **Authentication** → **URL Configuration**
2. Add your **Site URL**:
   - For local dev: `http://localhost:8000`
   - For production: `https://yourdomain.com`
3. Add **Redirect URLs**:
   - Same as site URL
4. Click **Save**

## File Structure

```
Wifi-Locator/
├── index.html              # Main HTML
├── index.js                # Main JavaScript with UI logic
├── supabase-config.js      # Supabase initialization
├── supabase-auth.js        # Authentication service
├── supabase-db.js          # Database operations service
├── styles.css              # Custom styles
├── SUPABASE_SETUP.md       # This file
└── package.json            # (optional)
```

## How It Works

### Authentication Flow

```
User Signs Up
    ↓
Supabase creates auth.users entry
    ↓
App creates profiles table entry
    ↓
User is logged in
    ↓
Session persists in browser
```

### Data Submission Flow

```
User adds Wi-Fi hotspot
    ↓
Create entry in hotspots table
    ↓
User submits report (speed, noise, security)
    ↓
Create entry in reports table
    ↓
Award points to user
    ↓
live_hotspot_data view updates automatically
```

### Decay Timer

```
Report submitted today → Shows in live_hotspot_data
After 15 days → Still shows (weighted average)
After 30 days → Report excluded from view
After 31+ days → Hotspot hidden if no recent reports
```

## Testing Locally

### 1. Start Local Server

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server -p 8000

# Using PHP
php -S localhost:8000
```

### 2. Open Browser

Navigate to: `http://localhost:8000`

### 3. Test Features

#### Sign Up:
1. Click profile button
2. Switch to "Sign Up" tab
3. Enter name, email, password
4. Click "Create Account"
5. Check console for profile creation

#### Sign In:
1. Click profile button
2. Enter email and password
3. Click "Sign In"

#### Google Sign-In:
1. Click profile button
2. Click "Continue with Google"
3. Select Google account
4. Authorize application

## API Usage Examples

### Get Live Hotspots

```javascript
const result = await window.dbService.getLiveHotspots();
if (result.success) {
  console.log('Hotspots:', result.data);
  // Each hotspot has: id, name, latitude, longitude,
  // avg_speed_score, noise_level, security_rating, etc.
}
```

### Create Hotspot

```javascript
const result = await window.dbService.createHotspot(
  'Central Coffee House',  // name
  40.7128,                 // latitude
  -74.0060,                // longitude
  '123 Main St, NYC'       // address
);
if (result.success) {
  console.log('Hotspot created:', result.data);
}
```

### Submit Report

```javascript
const result = await window.dbService.submitReport(
  hotspotId,
  {
    speedRating: 'streaming',      // or: no_signal, email_only, browsing, gaming_high
    noiseLevel: 'moderate',        // or: silent, quiet, loud
    securityRating: 'wpa2_wpa3',   // or: open_unsecured, captive_portal, enterprise
    password: 'wifi-password-123',
    comment: 'Great for working!'
  }
);
if (result.success) {
  console.log('Report submitted!');
  // User automatically awarded 10 points
}
```

### Get User Profile

```javascript
const result = await window.dbService.getUserProfile();
if (result.success) {
  console.log('User points:', result.data.points);
  console.log('Username:', result.data.username);
}
```

## Security Considerations

### Row Level Security (RLS)

All tables have RLS enabled:

**profiles**
- Anyone can read (for leaderboards)
- Users can only edit their own profile

**hotspots**
- Anyone can read
- Authenticated users can create

**reports**
- Users can only see their own reports
- Authenticated users can create
- Public queries use `live_hotspot_data` view (anonymized)

### Password Storage

Wi-Fi passwords are stored in plain text in the `reports` table. For production:

1. Consider using Supabase Vault for encryption
2. Or use `pgsodium` extension:

```sql
-- Example encrypted password storage
ALTER TABLE reports ADD COLUMN encrypted_password BYTEA;

-- Encrypt before insert
INSERT INTO reports (password_text)
VALUES (pgsodium.crypto_secretbox_new('my-password', key));
```

## Troubleshooting

### "Failed to fetch" or CORS errors

**Problem**: Cannot connect to Supabase
- **Solution**: Check your internet connection
- **Solution**: Verify Supabase URL and API key in `supabase-config.js`
- **Solution**: Make sure you're using a web server (not `file://`)

### "Invalid API key"

**Problem**: Authentication fails
- **Solution**: Copy the correct Anon/Public key from Supabase Dashboard → Settings → API

### "User already registered"

**Problem**: Cannot sign up with same email
- **Solution**: Use sign in instead, or reset password
- **Solution**: Check Supabase Dashboard → Authentication → Users

### Google Sign-In not working

**Problem**: OAuth popup fails or redirects incorrectly
- **Solution**: Check Google OAuth credentials are correct
- **Solution**: Verify redirect URL matches exactly
- **Solution**: Make sure Google provider is enabled in Supabase

### Hotspots not appearing on map

**Problem**: `getLiveHotspots()` returns empty array
- **Solution**: Check if any reports exist less than 30 days old
- **Solution**: Submit a test report to see if it appears
- **Solution**: Check browser console for errors

## Advanced Features

### Custom SQL Functions

You can add helper functions to your database:

```sql
-- Increment user points atomically
CREATE OR REPLACE FUNCTION increment_user_points(
  user_id UUID,
  points_to_add INT
) RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET points = points + points_to_add
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Realtime Subscriptions

Listen for new hotspots in real-time:

```javascript
const channel = supabase
  .channel('hotspots_channel')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'hotspots' },
    (payload) => {
      console.log('New hotspot added!', payload.new);
      // Add marker to map
    }
  )
  .subscribe();
```

### Geospatial Queries

Find hotspots near a point:

```sql
-- Add this as a stored function
CREATE OR REPLACE FUNCTION get_nearby_hotspots(
  lat FLOAT,
  lng FLOAT,
  radius_meters INT DEFAULT 1000
) RETURNS SETOF live_hotspot_data AS $$
BEGIN
  RETURN QUERY
  SELECT l.*
  FROM live_hotspot_data l
  JOIN hotspots h ON l.id = h.id
  WHERE ST_DWithin(
    h.location::geography,
    ST_MakePoint(lng, lat)::geography,
    radius_meters
  );
END;
$$ LANGUAGE plpgsql;
```

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

## Next Steps

1. **Test Authentication**: Sign up, sign in, sign out
2. **Add Your First Hotspot**: Use the contribute button
3. **Submit a Report**: Rate the Wi-Fi quality
4. **Check the Map**: See the live data appear
5. **Enable Realtime**: Add subscriptions for live updates

---

**Built with Supabase 🚀**
