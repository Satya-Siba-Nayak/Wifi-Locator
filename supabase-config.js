// Supabase Configuration
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm";

// Your Supabase project credentials
const SUPABASE_URL = "https://wpricnstuqteataicqus.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwcmljbnN0dXF0ZWF0YWljcXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MDE5OTcsImV4cCI6MjA3NzM3Nzk5N30.zYARB7PacLjcMQzX0QX6-FHa1XnlWxQ07AhghINf6cM";

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Current user state
let currentUser = null;

// Set up auth state observer
supabase.auth.onAuthStateChange((event, session) => {
  currentUser = session?.user || null;
  console.log(
    "🔐 Auth state changed:",
    event,
    currentUser?.email || "signed out",
  );
  updateUIForAuthState(currentUser);
});

// Update UI based on authentication state
async function updateUIForAuthState(user) {
  const userInfoDiv = document.getElementById("user-info");
  const authForm = document.getElementById("auth-form");
  const segmentedControl = document.getElementById("segmented-control");
  const googleSigninBtn = document.getElementById("google-signin-button");
  const divider = document.querySelector(".relative.flex.items-center.my-6");

  if (user) {
    // User is signed in
    // Hide auth form and show user info
    if (authForm) authForm.classList.add("hidden");
    if (segmentedControl) segmentedControl.classList.add("hidden");
    if (googleSigninBtn) googleSigninBtn.classList.add("hidden");
    if (divider) divider.classList.add("hidden");
    if (userInfoDiv) {
      userInfoDiv.classList.remove("hidden");

      // Update user info display
      const userAvatar = document.getElementById("user-avatar");
      const userAvatarImg = document.getElementById("user-avatar-img");
      const userName = document.getElementById("user-name");
      const userEmail = document.getElementById("user-email");
      const deleteAvatarBtn = document.getElementById("delete-avatar-button");

      if (userName) {
        userName.textContent =
          user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
      }
      if (userEmail) {
        userEmail.textContent = user.email;
      }

      // Load profile picture from database
      if (window.dbService && window.dbService.initialized) {
        try {
          const profileResult = await window.dbService.getUserProfile(user.id);
          if (profileResult.success && profileResult.data?.avatar_url) {
            // Show profile picture
            if (userAvatarImg) {
              userAvatarImg.src = profileResult.data.avatar_url;
              userAvatarImg.classList.remove("hidden");
            }
            if (userAvatar) {
              userAvatar.classList.add("hidden");
            }
            if (deleteAvatarBtn) {
              deleteAvatarBtn.classList.remove("hidden");
            }
          } else {
            // Show default avatar with initial
            if (userAvatar) {
              const initial = (user.user_metadata?.full_name || user.email)
                .charAt(0)
                .toUpperCase();
              userAvatar.textContent = initial;
              userAvatar.classList.remove("hidden");
            }
            if (userAvatarImg) {
              userAvatarImg.classList.add("hidden");
            }
            if (deleteAvatarBtn) {
              deleteAvatarBtn.classList.add("hidden");
            }
          }
        } catch (error) {
          console.error("Error loading profile picture:", error);
          // Fallback to initial
          if (userAvatar) {
            const initial = (user.user_metadata?.full_name || user.email)
              .charAt(0)
              .toUpperCase();
            userAvatar.textContent = initial;
            userAvatar.classList.remove("hidden");
          }
          if (userAvatarImg) {
            userAvatarImg.classList.add("hidden");
          }
        }
      } else {
        // DB service not ready, show initial
        if (userAvatar) {
          const initial = (user.user_metadata?.full_name || user.email)
            .charAt(0)
            .toUpperCase();
          userAvatar.textContent = initial;
          userAvatar.classList.remove("hidden");
        }
      }
    }
  } else {
    // User is signed out
    // Show auth form and hide user info
    if (authForm) authForm.classList.remove("hidden");
    if (segmentedControl) segmentedControl.classList.remove("hidden");
    if (googleSigninBtn) googleSigninBtn.classList.remove("hidden");
    if (divider) divider.classList.remove("hidden");
    if (userInfoDiv) userInfoDiv.classList.add("hidden");
  }
}

// Export Supabase client and helper functions
window.supabase = supabase;
window.supabaseHelpers = {
  getCurrentUser: () => currentUser,
  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) console.error("❌ Error getting session:", error);
    return data?.session;
  },
};

console.log("✅ Supabase initialized successfully");
