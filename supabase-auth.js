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
      console.log('Supabase Auth service initialized');
    } else {
      console.error('Supabase not initialized');
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
            full_name: fullName
          }
        }
      });

      if (error) throw error;

      console.log('User signed up successfully:', data.user?.email);

      // Create profile in public.profiles table
      if (data.user) {
        await this.createUserProfile(data.user.id, fullName || email.split('@')[0]);
      }

      return { success: true, user: data.user };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  // Create user profile in the database
  async createUserProfile(userId, username) {
    try {
      const { error } = await this.supabase
        .from('profiles')
        .insert({
          id: userId,
          username: username,
          points: 0
        });

      if (error && error.code !== '23505') { // Ignore duplicate key errors
        console.error('Error creating profile:', error);
      }
    } catch (error) {
      console.error('Error creating profile:', error);
    }
  }

  // Sign in with email and password
  async signIn(email, password) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      console.log('User signed in successfully:', data.user?.email);
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  // Sign in with Google
  async signInWithGoogle() {
    try {
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error) throw error;

      console.log('Google sign-in initiated');
      return { success: true };
    } catch (error) {
      console.error('Google sign in error:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  // Sign out
  async signOut() {
    try {
      const { error } = await this.supabase.auth.signOut();

      if (error) throw error;

      console.log('User signed out successfully');
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
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
    const errorMessage = error.message || '';

    // Check for specific Supabase error messages
    if (errorMessage.includes('Invalid login credentials')) {
      return 'Invalid email or password. Please try again.';
    }
    if (errorMessage.includes('User already registered')) {
      return 'This email is already registered. Please sign in instead.';
    }
    if (errorMessage.includes('Email not confirmed')) {
      return 'Please check your email and confirm your account before signing in.';
    }
    if (errorMessage.includes('Password should be at least')) {
      return 'Password should be at least 6 characters long.';
    }
    if (errorMessage.includes('Unable to validate email address')) {
      return 'Please enter a valid email address.';
    }
    if (errorMessage.includes('Network request failed')) {
      return 'Network error. Please check your internet connection.';
    }

    // Default to the original error message
    return error.message || 'An error occurred. Please try again.';
  }

  // Display error message to user
  showError(message, elementId = 'auth-error-message') {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.remove('hidden');

      // Auto-hide after 5 seconds
      setTimeout(() => {
        errorElement.classList.add('hidden');
      }, 5000);
    } else {
      console.error(message);
    }
  }

  // Display success message to user
  showSuccess(message, elementId = 'auth-success-message') {
    const successElement = document.getElementById(elementId);
    if (successElement) {
      successElement.textContent = message;
      successElement.classList.remove('hidden');

      // Auto-hide after 3 seconds
      setTimeout(() => {
        successElement.classList.add('hidden');
      }, 3000);
    } else {
      console.log(message);
    }
  }
}

// Create and export a singleton instance
window.authService = new SupabaseAuthService();
