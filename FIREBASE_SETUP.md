# Firebase Authentication Setup Guide

This guide will help you set up and use Firebase Authentication in the Wi-Fi Locator application.

## Features Implemented

✅ **Email/Password Authentication**
- Sign up with email and password
- Sign in with email and password
- Display name support for new users

✅ **Google Sign-In**
- One-click authentication with Google account
- Automatic profile information retrieval

✅ **User Session Management**
- Persistent login across browser sessions
- Automatic UI updates based on auth state
- Secure sign-out functionality

✅ **User Experience**
- Real-time error messages with user-friendly descriptions
- Success notifications
- Loading states during authentication
- Responsive profile overlay UI

## Firebase Configuration

Your Firebase project has already been configured with the following details:

- **Project ID**: wifi-map-d2e6b
- **Auth Domain**: wifi-map-d2e6b.firebaseapp.com
- **App ID**: 1:70360956599:web:6c40710d4b154630bd9732

## Enable Authentication Methods

To use the authentication features, you need to enable them in your Firebase Console:

### 1. Enable Email/Password Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **wifi-map-d2e6b**
3. Click on **Authentication** in the left sidebar
4. Click on the **Sign-in method** tab
5. Click on **Email/Password**
6. Toggle **Enable** to ON
7. Click **Save**

### 2. Enable Google Sign-In

1. In the same **Sign-in method** tab
2. Click on **Google**
3. Toggle **Enable** to ON
4. Select a **Project support email** from the dropdown
5. Click **Save**

### 3. Configure Authorized Domains

For production use, you need to add your domain to authorized domains:

1. In the **Sign-in method** tab, scroll down to **Authorized domains**
2. Click **Add domain**
3. Enter your domain (e.g., `yourdomain.com`)
4. Click **Add**

**Note**: `localhost` is already authorized by default for development.

## Testing the Application

### Local Development

1. Open the project folder in a terminal
2. Start a local web server:
   ```bash
   # Using Python 3
   python -m http.server 8000

   # Using Python 2
   python -m SimpleHTTPServer 8000

   # Using Node.js (if you have http-server installed)
   npx http-server -p 8000

   # Using PHP
   php -S localhost:8000
   ```

3. Open your browser and navigate to: `http://localhost:8000`

### Testing Authentication

#### Email/Password Sign-Up:
1. Click the **Profile** button (user icon in the top-right)
2. Click the **Sign Up** tab
3. Enter your name, email, and password (min 6 characters)
4. Click **Create Account**

#### Email/Password Sign-In:
1. Click the **Profile** button
2. Click the **Sign In** tab (default)
3. Enter your email and password
4. Click **Sign In**

#### Google Sign-In:
1. Click the **Profile** button
2. Click **Continue with Google**
3. Select your Google account
4. Grant permissions
5. You'll be automatically signed in

#### Sign Out:
1. Click the **Profile** button
2. Your user info will be displayed
3. Click **Sign Out**

## File Structure

```
Wifi-Locator/
├── index.html              # Main HTML with auth UI
├── index.js                # Main JavaScript with auth handlers
├── firebase-config.js      # Firebase initialization & configuration
├── auth-service.js         # Authentication service class
├── styles.css              # Custom styles
└── FIREBASE_SETUP.md       # This file
```

## How It Works

### 1. Firebase Initialization (`firebase-config.js`)
- Imports Firebase SDK modules (app, auth, analytics)
- Initializes Firebase with your project credentials
- Sets up auth state observer
- Manages UI updates based on authentication state

### 2. Authentication Service (`auth-service.js`)
- Provides methods for sign-up, sign-in, sign-out
- Handles Google authentication
- Provides user-friendly error messages
- Shows success/error notifications

### 3. Main Application (`index.js`)
- Integrates Firebase auth with the UI
- Handles form submissions
- Manages button states and loading indicators
- Closes overlays after successful authentication

### 4. UI Components (`index.html`)
- Profile overlay with login/signup forms
- Google Sign-In button
- User info display when logged in
- Error and success message containers

## Authentication State Flow

```
User Opens App
    ↓
Firebase Initializes
    ↓
onAuthStateChanged listener activates
    ↓
    ├─→ User Logged In
    │   ├─→ Show user info
    │   ├─→ Hide auth forms
    │   └─→ Update profile button
    │
    └─→ User Logged Out
        ├─→ Show auth forms
        ├─→ Hide user info
        └─→ Reset profile button
```

## Security Considerations

1. **Never commit sensitive credentials** - Your Firebase config is already in the code, which is fine for client-side apps, but make sure to set up proper security rules in Firebase.

2. **Set up Firestore/Database Security Rules**:
   ```javascript
   // Example Firestore rules
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

3. **Enable App Check** (recommended for production):
   - Protects your Firebase resources from abuse
   - Go to Firebase Console > App Check
   - Register your app and enable reCAPTCHA v3

## Troubleshooting

### Authentication Not Working

**Problem**: Firebase is not defined
- **Solution**: Make sure you're running the app through a web server (not opening HTML directly)
- **Reason**: ES6 modules require HTTP/HTTPS protocol

**Problem**: "Firebase: Error (auth/unauthorized-domain)"
- **Solution**: Add your domain to authorized domains in Firebase Console
- **Location**: Authentication > Sign-in method > Authorized domains

**Problem**: Google Sign-In popup blocked
- **Solution**: Allow popups for your domain in browser settings
- **Alternative**: User will see an error message prompting them to allow popups

**Problem**: "Auth service not initialized"
- **Solution**: Check browser console for Firebase initialization errors
- **Check**: Make sure all Firebase scripts are loaded correctly

### CORS Issues

If you see CORS errors:
1. Use a proper web server (see Local Development section)
2. Don't open the HTML file directly (`file://` protocol won't work)

## Next Steps

### Extend Functionality

1. **Password Reset**:
   - Add a "Forgot Password?" link
   - Use `auth.sendPasswordResetEmail(email)`

2. **Email Verification**:
   ```javascript
   // After sign-up
   await user.sendEmailVerification();
   ```

3. **Update Profile**:
   ```javascript
   await updateProfile(user, {
     displayName: "New Name",
     photoURL: "https://example.com/photo.jpg"
   });
   ```

4. **Delete Account**:
   ```javascript
   await user.delete();
   ```

### Store User Data

Once authenticated, you can store user-specific data in Firestore:

```javascript
import { getFirestore, doc, setDoc } from "firebase/firestore";

const db = getFirestore();
const user = auth.currentUser;

await setDoc(doc(db, "users", user.uid), {
  name: user.displayName,
  email: user.email,
  createdAt: new Date()
});
```

## Resources

- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
- [Firebase Console](https://console.firebase.google.com/)
- [Firebase JavaScript SDK](https://firebase.google.com/docs/web/setup)
- [Authentication Best Practices](https://firebase.google.com/docs/auth/web/start)

## Support

If you encounter any issues:
1. Check the browser console for error messages
2. Verify Firebase configuration in `firebase-config.js`
3. Ensure authentication methods are enabled in Firebase Console
4. Check that you're running the app through a web server

---

**Made with ❤️ for Wi-Fi Locator**
