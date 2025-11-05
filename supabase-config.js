// Supabase Configuration
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm';

// Your Supabase project credentials
const SUPABASE_URL = 'https://wpricnstuqteataicqus.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwcmljbnN0dXF0ZWF0YWljcXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MDE5OTcsImV4cCI6MjA3NzM3Nzk5N30.zYARB7PacLjcMQzX0QX6-FHa1XnlWxQ07AhghINf6cM';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Current user state
let currentUser = null;

// Set up auth state observer
supabase.auth.onAuthStateChange((event, session) => {
  currentUser = session?.user || null;
  console.log('Auth state changed:', event, currentUser?.email);
  updateUIForAuthState(currentUser);
});

// Update UI based on authentication state
function updateUIForAuthState(user) {
  const userInfoDiv = document.getElementById('user-info');
  const authForm = document.getElementById('auth-form');
  const segmentedControl = document.getElementById('segmented-control');
  const googleSigninBtn = document.getElementById('google-signin-button');
  const divider = document.querySelector('.relative.flex.items-center.my-6');

  if (user) {
    // User is signed in
    console.log('User signed in:', user.email);

    // Hide auth form and show user info
    if (authForm) authForm.classList.add('hidden');
    if (segmentedControl) segmentedControl.classList.add('hidden');
    if (googleSigninBtn) googleSigninBtn.classList.add('hidden');
    if (divider) divider.classList.add('hidden');
    if (userInfoDiv) {
      userInfoDiv.classList.remove('hidden');

      // Update user info display
      const userAvatar = document.getElementById('user-avatar');
      const userName = document.getElementById('user-name');
      const userEmail = document.getElementById('user-email');

      if (userAvatar) {
        const initial = (user.user_metadata?.full_name || user.email).charAt(0).toUpperCase();
        userAvatar.textContent = initial;
      }
      if (userName) {
        userName.textContent = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
      }
      if (userEmail) {
        userEmail.textContent = user.email;
      }
    }
  } else {
    // User is signed out
    console.log('User signed out');

    // Show auth form and hide user info
    if (authForm) authForm.classList.remove('hidden');
    if (segmentedControl) segmentedControl.classList.remove('hidden');
    if (googleSigninBtn) googleSigninBtn.classList.remove('hidden');
    if (divider) divider.classList.remove('hidden');
    if (userInfoDiv) userInfoDiv.classList.add('hidden');
  }
}

// Export Supabase client and helper functions
window.supabase = supabase;
window.supabaseHelpers = {
  getCurrentUser: () => currentUser,
  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) console.error('Error getting session:', error);
    return data?.session;
  }
};

console.log('Supabase initialized successfully');
