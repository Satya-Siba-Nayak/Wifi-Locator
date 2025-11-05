// Supabase Database Service
// Handles all database operations for hotspots and reports

class SupabaseDBService {
  constructor() {
    this.supabase = null;
    this.initialized = false;
  }

  initialize() {
    if (window.supabase) {
      this.supabase = window.supabase;
      this.initialized = true;
      console.log('Supabase DB service initialized');
    } else {
      console.error('Supabase not initialized');
    }
  }

  // ==================== HOTSPOTS ====================

  /**
   * Get all live hotspots (from the view with 30-day decay timer)
   * Returns hotspots with their latest data from recent reports
   */
  async getLiveHotspots() {
    try {
      const { data, error } = await this.supabase
        .from('live_hotspot_data')
        .select('*');

      if (error) throw error;

      // Convert PostGIS geography to {lat, lng} format
      const hotspots = data.map(spot => ({
        ...spot,
        latitude: this.extractLatitude(spot.location),
        longitude: this.extractLongitude(spot.location)
      }));

      return { success: true, data: hotspots };
    } catch (error) {
      console.error('Error fetching live hotspots:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get hotspots within a bounding box (for map viewport)
   * @param {number} minLat - Minimum latitude
   * @param {number} maxLat - Maximum latitude
   * @param {number} minLng - Minimum longitude
   * @param {number} maxLng - Maximum longitude
   */
  async getHotspotsInBounds(minLat, maxLat, minLng, maxLng) {
    try {
      const { data, error } = await this.supabase.rpc('get_hotspots_in_bounds', {
        min_lat: minLat,
        max_lat: maxLat,
        min_lng: minLng,
        max_lng: maxLng
      });

      if (error) throw error;

      const hotspots = data.map(spot => ({
        ...spot,
        latitude: this.extractLatitude(spot.location),
        longitude: this.extractLongitude(spot.location)
      }));

      return { success: true, data: hotspots };
    } catch (error) {
      console.error('Error fetching hotspots in bounds:', error);
      // Fallback to getting all hotspots and filtering client-side
      return await this.getLiveHotspots();
    }
  }

  /**
   * Create a new hotspot
   * @param {string} name - Name of the location
   * @param {number} latitude - Latitude coordinate
   * @param {number} longitude - Longitude coordinate
   * @param {string} addressText - Human-readable address
   */
  async createHotspot(name, latitude, longitude, addressText = null) {
    try {
      const user = window.supabaseHelpers.getCurrentUser();
      if (!user) {
        return { success: false, error: 'You must be signed in to add a hotspot' };
      }

      // Create WKT (Well-Known Text) format for PostGIS
      const locationWKT = `POINT(${longitude} ${latitude})`;

      const { data, error } = await this.supabase
        .from('hotspots')
        .insert({
          name,
          location: locationWKT,
          address_text: addressText,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      console.log('Hotspot created:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error creating hotspot:', error);
      return { success: false, error: error.message };
    }
  }

  // ==================== REPORTS ====================

  /**
   * Submit a new report for a hotspot
   * @param {number} hotspotId - ID of the hotspot
   * @param {object} reportData - Report details
   */
  async submitReport(hotspotId, reportData) {
    try {
      const user = window.supabaseHelpers.getCurrentUser();
      if (!user) {
        return { success: false, error: 'You must be signed in to submit a report' };
      }

      const { data, error } = await this.supabase
        .from('reports')
        .insert({
          hotspot_id: hotspotId,
          user_id: user.id,
          speed_rating: reportData.speedRating,
          noise_level: reportData.noiseLevel,
          security_rating: reportData.securityRating,
          password_text: reportData.password || null,
          comment: reportData.comment || null
        })
        .select()
        .single();

      if (error) throw error;

      // Award points to user
      await this.awardPoints(user.id, 10); // 10 points per report

      console.log('Report submitted:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error submitting report:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's own reports
   */
  async getMyReports() {
    try {
      const user = window.supabaseHelpers.getCurrentUser();
      if (!user) {
        return { success: false, error: 'You must be signed in' };
      }

      const { data, error } = await this.supabase
        .from('reports')
        .select(`
          *,
          hotspots (
            name,
            address_text
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error fetching user reports:', error);
      return { success: false, error: error.message };
    }
  }

  // ==================== PROFILES ====================

  /**
   * Get user profile
   */
  async getUserProfile(userId = null) {
    try {
      const targetUserId = userId || window.supabaseHelpers.getCurrentUser()?.id;
      if (!targetUserId) {
        return { success: false, error: 'No user ID provided' };
      }

      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Award points to a user
   */
  async awardPoints(userId, points) {
    try {
      const { data, error } = await this.supabase.rpc('increment_user_points', {
        user_id: userId,
        points_to_add: points
      });

      if (error) {
        // Fallback: manual update if RPC doesn't exist
        const { error: updateError } = await this.supabase
          .from('profiles')
          .update({ points: this.supabase.raw(`points + ${points}`) })
          .eq('id', userId);

        if (updateError) throw updateError;
      }

      return { success: true };
    } catch (error) {
      console.error('Error awarding points:', error);
      return { success: false, error: error.message };
    }
  }

  // ==================== HELPER FUNCTIONS ====================

  /**
   * Extract latitude from PostGIS geography object
   * Handles both GeoJSON and WKT formats
   */
  extractLatitude(location) {
    if (!location) return null;

    // If it's already a GeoJSON object
    if (typeof location === 'object' && location.coordinates) {
      return location.coordinates[1];
    }

    // If it's a WKT string like "POINT(lng lat)"
    if (typeof location === 'string') {
      const match = location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
      if (match) {
        return parseFloat(match[2]);
      }
    }

    return null;
  }

  /**
   * Extract longitude from PostGIS geography object
   */
  extractLongitude(location) {
    if (!location) return null;

    if (typeof location === 'object' && location.coordinates) {
      return location.coordinates[0];
    }

    if (typeof location === 'string') {
      const match = location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
      if (match) {
        return parseFloat(match[1]);
      }
    }

    return null;
  }

  /**
   * Show error message to user
   */
  showError(message) {
    console.error(message);
    // You can implement a toast notification system here
    alert(message);
  }

  /**
   * Show success message to user
   */
  showSuccess(message) {
    console.log(message);
    // You can implement a toast notification system here
    alert(message);
  }
}

// Create and export a singleton instance
window.dbService = new SupabaseDBService();
