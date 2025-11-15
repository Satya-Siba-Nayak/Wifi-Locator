// Supabase Authentication Service
// Handles all authentication operations

class SupabaseAuthService {
  constructor() {
    this.supabase = null;
    this.initialized = false;
  }

  initialize() {
    if (window.supabase) {
      this.supabase = window.supabase;
      this.initialized = true;
      console.log("Supabase Auth service initialized");
    } else {
      console.error("Supabase not initialized");
    }
  }

  // Sign up with email and password
  async signUp(email, password, fullName = null) {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      console.log("User signed up successfully:", data.user?.email);

      // Create profile in public.profiles table
      if (data.user) {
        await this.createUserProfile(
          data.user.id,
          fullName || email.split("@")[0],
        );
      }

      return { success: true, user: data.user };
    } catch (error) {
      console.error("Sign up error:", error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  // Create user profile in the database
  async createUserProfile(userId, username) {
    try {
      const { error } = await this.supabase.from("profiles").insert({
        id: userId,
        username: username,
        points: 0,
      });

      if (error && error.code !== "23505") {
        // Ignore duplicate key errors
        console.error("Error creating profile:", error);
      }
    } catch (error) {
      console.error("Error creating profile:", error);
    }
  }

  // Sign in with email and password
  async signIn(email, password) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      console.log("User signed in successfully:", data.user?.email);
      return { success: true, user: data.user };
    } catch (error) {
      console.error("Sign in error:", error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  // Sign in with Google
  async signInWithGoogle() {
    try {
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      console.log("Google sign-in initiated");
      return { success: true };
    } catch (error) {
      console.error("Google sign in error:", error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  // Sign out
  async signOut() {
    try {
      const { error } = await this.supabase.auth.signOut();

      if (error) throw error;

      console.log("User signed out successfully");
      return { success: true };
    } catch (error) {
      console.error("Sign out error:", error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  // Request password reset email
  async resetPassword(email) {
    try {
      if (!email || !email.trim()) {
        return { success: false, error: "📧 Please enter your email address." };
      }

      console.log("🔄 Requesting password reset for:", email);

      // Use the same origin as current page (handles localhost:8000, localhost:8080, etc.)
      const redirectUrl = `${window.location.protocol}//${window.location.host}/reset-password.html`;
      console.log("🔗 Reset redirect URL:", redirectUrl);

      const { data, error } = await this.supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: redirectUrl,
        },
      );

      if (error) throw error;

      console.log("✅ Password reset email sent");
      return {
        success: true,
        message: "📧 Password reset link sent! Please check your email.",
      };
    } catch (error) {
      console.error("❌ Password reset error:", error);

      // Handle specific reset errors
      if (
        error.message.includes("Email not found") ||
        error.message.includes("User not found")
      ) {
        return {
          success: false,
          error: "❌ No account found with this email address.",
        };
      }

      if (error.message.includes("rate limit")) {
        return {
          success: false,
          error:
            "⏸️ Too many reset attempts. Please wait a few minutes and try again.",
        };
      }

      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  // Update password (called after reset link is clicked)
  async updatePassword(newPassword) {
    try {
      if (!newPassword || newPassword.length < 6) {
        return {
          success: false,
          error: "🔒 Password must be at least 6 characters long.",
        };
      }

      const { data, error } = await this.supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      console.log("✅ Password updated successfully");
      return {
        success: true,
        message: "✅ Password updated successfully! You can now sign in.",
      };
    } catch (error) {
      console.error("❌ Password update error:", error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  // Get current user
  getCurrentUser() {
    return window.supabaseHelpers.getCurrentUser();
  }

  // Check if user is signed in
  isSignedIn() {
    return this.getCurrentUser() !== null;
  }

  // Get user-friendly error messages
  getErrorMessage(error) {
    const errorMessage = error.message || "";
    const errorCode = error.code || error.status || "";

    console.log("🔍 Auth Error Debug:", {
      message: errorMessage,
      code: errorCode,
      error,
    });

    // Network and connection errors
    if (
      errorMessage.includes("Failed to fetch") ||
      errorMessage.includes("NetworkError") ||
      errorMessage.includes("Network request failed") ||
      errorCode === "NETWORK_ERROR"
    ) {
      return "⚠️ Connection lost. Please check your internet connection and try again.";
    }

    if (errorMessage.includes("timeout") || errorCode === "TIMEOUT") {
      return "⏱️ Request timed out. Please check your connection and try again.";
    }

    // Authentication errors
    if (
      errorMessage.includes("Invalid login credentials") ||
      errorMessage.includes("Invalid email or password") ||
      errorMessage.includes("Email not confirmed")
    ) {
      return "❌ Invalid email or password. Please check your credentials and try again.";
    }

    if (errorMessage.includes("User not found")) {
      return "❌ No account found with this email. Please sign up first.";
    }

    if (errorMessage.includes("Email not confirmed")) {
      return "📧 Please check your email and confirm your account before signing in.";
    }

    // Sign up errors
    if (
      errorMessage.includes("User already registered") ||
      errorMessage.includes("already been registered")
    ) {
      return '⚠️ This email is already registered. Please sign in instead or use "Forgot Password" to reset.';
    }

    if (errorMessage.includes("Password should be at least")) {
      return "🔒 Password must be at least 6 characters long.";
    }

    if (errorMessage.includes("Password is too weak")) {
      return "🔒 Password is too weak. Use at least 6 characters with letters and numbers.";
    }

    // Email validation errors
    if (
      errorMessage.includes("Unable to validate email address") ||
      errorMessage.includes("Invalid email")
    ) {
      return "📧 Please enter a valid email address.";
    }

    if (errorMessage.includes("rate limit") || errorCode === "429") {
      return "⏸️ Too many attempts. Please wait a few minutes and try again.";
    }

    // Server errors
    if (errorCode >= 500 && errorCode < 600) {
      return "🔧 Server error. Please try again in a few moments.";
    }

    // OAuth errors
    if (errorMessage.includes("OAuth")) {
      return "🔐 Google sign-in failed. Please try again or use email/password.";
    }

    // Default to a more user-friendly message
    if (errorMessage) {
      return `❌ ${errorMessage}`;
    }

    return "❌ An unexpected error occurred. Please try again.";
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
window.authService = new SupabaseAuthService();
