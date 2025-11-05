// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-analytics.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBQCbl1yCML5nZbRUCoijnk6TZniir-QwU",
  authDomain: "wifi-map-d2e6b.firebaseapp.com",
  projectId: "wifi-map-d2e6b",
  storageBucket: "wifi-map-d2e6b.firebasestorage.app",
  messagingSenderId: "70360956599",
  appId: "1:70360956599:web:6c40710d4b154630bd9732",
  measurementId: "G-0GX0TV0X8L",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

// Current user state
let currentUser = null;

// Set up auth state observer
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  updateUIForAuthState(user);
});

// Update UI based on authentication state
function updateUIForAuthState(user) {
  const userInfoDiv = document.getElementById("user-info");
  const authForm = document.getElementById("auth-form");
  const segmentedControl = document.getElementById("segmented-control");
  const googleSigninBtn = document.getElementById("google-signin-button");
  const divider = document.querySelector(".relative.flex.items-center.my-6");

  if (user) {
    // User is signed in
    console.log("User signed in:", user.email);

    // Hide auth form and show user info
    if (authForm) authForm.classList.add("hidden");
    if (segmentedControl) segmentedControl.classList.add("hidden");
    if (googleSigninBtn) googleSigninBtn.classList.add("hidden");
    if (divider) divider.classList.add("hidden");
    if (userInfoDiv) {
      userInfoDiv.classList.remove("hidden");

      // Update user info display
      const userAvatar = document.getElementById("user-avatar");
      const userName = document.getElementById("user-name");
      const userEmail = document.getElementById("user-email");

      if (userAvatar) {
        const initial = (user.displayName || user.email)
          .charAt(0)
          .toUpperCase();
        userAvatar.textContent = initial;
      }
      if (userName) {
        userName.textContent = user.displayName || "User";
      }
      if (userEmail) {
        userEmail.textContent = user.email;
      }
    }
  } else {
    // User is signed out
    console.log("User signed out");

    // Show auth form and hide user info
    if (authForm) authForm.classList.remove("hidden");
    if (segmentedControl) segmentedControl.classList.remove("hidden");
    if (googleSigninBtn) googleSigninBtn.classList.remove("hidden");
    if (divider) divider.classList.remove("hidden");
    if (userInfoDiv) userInfoDiv.classList.add("hidden");
  }
}

// Export Firebase functions and instances
window.firebaseAuth = {
  auth,
  app,
  analytics,
  currentUser: () => currentUser,

  // Auth functions
  createUserWithEmailAndPassword: (email, password) =>
    createUserWithEmailAndPassword(auth, email, password),
  signInWithEmailAndPassword: (email, password) =>
    signInWithEmailAndPassword(auth, email, password),
  signOut: () => signOut(auth),
  signInWithPopup: (provider) => signInWithPopup(auth, provider),
  GoogleAuthProvider,
  updateProfile: (user, profile) => updateProfile(user, profile),
  onAuthStateChanged: (callback) => onAuthStateChanged(auth, callback),
};

console.log("Firebase initialized successfully");
