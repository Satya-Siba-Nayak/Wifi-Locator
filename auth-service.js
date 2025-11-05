// Authentication Service
// Handles all Firebase Authentication operations

class AuthService {
  constructor() {
    this.initialized = false;
  }

  initialize() {
    if (window.firebaseAuth) {
      this.initialized = true;
      console.log("Auth service initialized");
    } else {
      console.error("Firebase not initialized");
    }
  }

  // Sign up with email and password
  async signUp(email, password, displayName = null) {
    try {
      const userCredential =
        await window.firebaseAuth.createUserWithEmailAndPassword(
          email,
          password,
        );
      const user = userCredential.user;

      // Update display name if provided
      if (displayName && user) {
        await window.firebaseAuth.updateProfile(user, {
          displayName: displayName,
        });
      }

      console.log("User signed up successfully:", user.email);
      return { success: true, user };
    } catch (error) {
      console.error("Sign up error:", error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  // Sign in with email and password
  async signIn(email, password) {
    try {
      const userCredential =
        await window.firebaseAuth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;

      console.log("User signed in successfully:", user.email);
      return { success: true, user };
    } catch (error) {
      console.error("Sign in error:", error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  // Sign in with Google
  async signInWithGoogle() {
    try {
      const provider = new window.firebaseAuth.GoogleAuthProvider();

      // Optional: Add custom parameters
      provider.addScope("profile");
      provider.addScope("email");

      const result = await window.firebaseAuth.signInWithPopup(provider);
      const user = result.user;

      console.log("User signed in with Google:", user.email);
      return { success: true, user };
    } catch (error) {
      console.error("Google sign in error:", error);

      // Handle specific popup errors
      if (error.code === "auth/popup-closed-by-user") {
        return {
          success: false,
          error: "Sign-in popup was closed. Please try again.",
        };
      }

      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  // Sign out
  async signOut() {
    try {
      await window.firebaseAuth.signOut();
      console.log("User signed out successfully");
      return { success: true };
    } catch (error) {
      console.error("Sign out error:", error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  // Get current user
  getCurrentUser() {
    return window.firebaseAuth.currentUser();
  }

  // Check if user is signed in
  isSignedIn() {
    return window.firebaseAuth.currentUser() !== null;
  }

  // Get user-friendly error messages
  getErrorMessage(error) {
    const errorCode = error.code;

    switch (errorCode) {
      case "auth/email-already-in-use":
        return "This email is already registered. Please sign in instead.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/operation-not-allowed":
        return "This sign-in method is not enabled. Please contact support.";
      case "auth/weak-password":
        return "Password should be at least 6 characters long.";
      case "auth/user-disabled":
        return "This account has been disabled. Please contact support.";
      case "auth/user-not-found":
        return "No account found with this email. Please sign up first.";
      case "auth/wrong-password":
        return "Incorrect password. Please try again.";
      case "auth/invalid-credential":
        return "Invalid email or password. Please try again.";
      case "auth/too-many-requests":
        return "Too many failed attempts. Please try again later.";
      case "auth/network-request-failed":
        return "Network error. Please check your internet connection.";
      case "auth/popup-blocked":
        return "Sign-in popup was blocked by your browser. Please allow popups and try again.";
      case "auth/popup-closed-by-user":
        return "Sign-in was cancelled. Please try again.";
      case "auth/cancelled-popup-request":
        return "Only one popup request is allowed at a time.";
      default:
        return error.message || "An error occurred. Please try again.";
    }
  }

  // Display error message to user
  showError(message, elementId = "auth-error-message") {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.remove("hidden");

      // Auto-hide after 5 seconds
      setTimeout(() => {
        errorElement.classList.add("hidden");
      }, 5000);
    } else {
      // Fallback to console if error element doesn't exist
      console.error(message);
    }
  }

  // Display success message to user
  showSuccess(message, elementId = "auth-success-message") {
    const successElement = document.getElementById(elementId);
    if (successElement) {
      successElement.textContent = message;
      successElement.classList.remove("hidden");

      // Auto-hide after 3 seconds
      setTimeout(() => {
        successElement.classList.add("hidden");
      }, 3000);
    } else {
      console.log(message);
    }
  }
}

// Create and export a singleton instance
window.authService = new AuthService();
