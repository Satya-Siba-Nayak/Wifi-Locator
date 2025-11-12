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
      console.log("Supabase DB service initialized");
    } else {
      console.error("Supabase not initialized");
    }
  }

  // ==================== HOTSPOTS ====================

  /**
   * Get all live hotspots (from the view with 30-day decay timer)
   * Returns hotspots with their latest data from recent reports
   */
  async getLiveHotspots() {
    try {
      // Get ALL hotspots from base table (not just those with reports in last 30 days)
      // This ensures newly added hotspots show up immediately without needing a report
      const { data: hotspotData, error: hotspotError } = await this.supabase
        .from("hotspots")
        .select("*")
        .order("created_at", { ascending: false });

      if (hotspotError) throw hotspotError;

      console.log("📦 Fetched hotspots from database:", hotspotData);

      // Get hotspot IDs to fetch creator info
      const hotspotIds = hotspotData.map((h) => h.id);

      // Fetch hotspots with creator info and photos from the base table
      const { data: hotspotsWithCreators, error: creatorError } =
        await this.supabase
          .from("hotspots")
          .select(
            `
          id,
          created_by,
          profiles:created_by (
            username,
            id
          ),
          hotspot_photos (
            id,
            storage_path,
            display_order
          )
        `,
          )
          .in("id", hotspotIds);

      if (creatorError) {
        console.warn("Could not fetch creator info:", creatorError);
      }

      // Merge creator info and photos with hotspot data
      const hotspots = hotspotData.map((spot) => {
        const creatorInfo = hotspotsWithCreators?.find((h) => h.id === spot.id);
        const profile = creatorInfo?.profiles;
        const photos = creatorInfo?.hotspot_photos || [];

        // Sort photos by display_order and get first photo
        const sortedPhotos = photos.sort(
          (a, b) => a.display_order - b.display_order,
        );
        const firstPhoto = sortedPhotos[0];

        return {
          ...spot,
          latitude: this.extractLatitude(spot.location),
          longitude: this.extractLongitude(spot.location),
          created_by_username: profile?.username || null,
          created_by_id: creatorInfo?.created_by || null,
          photos: sortedPhotos,
          first_photo_path: firstPhoto?.storage_path || null,
        };
      });

      return { success: true, data: hotspots };
    } catch (error) {
      console.error("Error fetching live hotspots:", error);
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
      const { data, error } = await this.supabase.rpc(
        "get_hotspots_in_bounds",
        {
          min_lat: minLat,
          max_lat: maxLat,
          min_lng: minLng,
          max_lng: maxLng,
        },
      );

      if (error) throw error;

      const hotspots = data.map((spot) => ({
        ...spot,
        latitude: this.extractLatitude(spot.location),
        longitude: this.extractLongitude(spot.location),
      }));

      return { success: true, data: hotspots };
    } catch (error) {
      console.error("Error fetching hotspots in bounds:", error);
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
  async createHotspot(
    name,
    latitude,
    longitude,
    addressText = null,
    photos = [],
  ) {
    try {
      const user = window.supabaseHelpers.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: "You must be signed in to add a hotspot",
        };
      }

      // Ensure profile exists before creating hotspot
      await this.ensureProfileExists(user);

      // Create WKT (Well-Known Text) format for PostGIS
      const locationWKT = `POINT(${longitude} ${latitude})`;

      const { data, error } = await this.supabase
        .from("hotspots")
        .insert({
          name,
          location: locationWKT,
          address_text: addressText,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      console.log("Hotspot created:", data);

      // Upload photos if provided
      if (photos && photos.length > 0) {
        const uploadResult = await this.uploadHotspotPhotos(
          data.id,
          photos,
          user.id,
        );
        if (!uploadResult.success) {
          console.warn("Photo upload warning:", uploadResult.error);
        }
      }

      return { success: true, data };
    } catch (error) {
      console.error("Error creating hotspot:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Upload photos for a hotspot to Supabase Storage
   * @param {number} hotspotId - ID of the hotspot
   * @param {File[]} photos - Array of File objects
   * @param {string} userId - ID of the user uploading
   */
  async uploadHotspotPhotos(hotspotId, photos, userId) {
    try {
      const uploadedPaths = [];

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const fileExt = photo.name.split(".").pop();
        const fileName = `${hotspotId}/${Date.now()}_${i}.${fileExt}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } =
          await this.supabase.storage
            .from("hotspot-photos")
            .upload(fileName, photo, {
              cacheControl: "3600",
              upsert: false,
            });

        if (uploadError) {
          console.error(`Error uploading photo ${i}:`, uploadError);
          continue; // Skip this photo but continue with others
        }

        uploadedPaths.push(uploadData.path);

        // Save photo reference in database
        const { error: dbError } = await this.supabase
          .from("hotspot_photos")
          .insert({
            hotspot_id: hotspotId,
            uploaded_by: userId,
            storage_path: uploadData.path,
            display_order: i,
          });

        if (dbError) {
          console.error(`Error saving photo reference ${i}:`, dbError);
        }
      }

      return {
        success: true,
        uploadedCount: uploadedPaths.length,
        paths: uploadedPaths,
      };
    } catch (error) {
      console.error("Error uploading photos:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Ensure user profile exists in profiles table
   * @param {object} user - User object from Supabase auth
   */
  async ensureProfileExists(user) {
    try {
      // Check if profile exists
      const { data: existing } = await this.supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!existing) {
        // Create profile if it doesn't exist
        const username =
          user.user_metadata?.full_name ||
          user.email?.split("@")[0] ||
          `user_${user.id.substring(0, 8)}`;

        const { error } = await this.supabase.from("profiles").insert({
          id: user.id,
          username: username,
          points: 0,
        });

        if (error && error.code !== "23505") {
          // Ignore duplicate key errors
          console.error("Error creating profile:", error);
        } else {
          console.log("Profile created for user:", username);
        }
      }
    } catch (error) {
      console.warn("Profile check/creation warning:", error);
      // Don't fail the whole operation if profile creation fails
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
        return {
          success: false,
          error: "You must be signed in to submit a report",
        };
      }

      const { data, error } = await this.supabase
        .from("reports")
        .insert({
          hotspot_id: hotspotId,
          user_id: user.id,
          speed_rating: reportData.speedRating,
          noise_level: reportData.noiseLevel,
          security_rating: reportData.securityRating,
          password_text: reportData.password || null,
          comment: reportData.comment || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Award points to user
      await this.awardPoints(user.id, 10); // 10 points per report

      console.log("Report submitted:", data);
      return { success: true, data };
    } catch (error) {
      console.error("Error submitting report:", error);
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
        return { success: false, error: "You must be signed in" };
      }

      const { data, error } = await this.supabase
        .from("reports")
        .select(
          `
          *,
          hotspots (
            name,
            address_text
          )
        `,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error("Error fetching user reports:", error);
      return { success: false, error: error.message };
    }
  }

  // ==================== PROFILES ====================

  /**
   * Get user profile
   */
  async getUserProfile(userId = null) {
    try {
      const targetUserId =
        userId || window.supabaseHelpers.getCurrentUser()?.id;
      if (!targetUserId) {
        return { success: false, error: "No user ID provided" };
      }

      const { data, error } = await this.supabase
        .from("profiles")
        .select("*")
        .eq("id", targetUserId)
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Award points to a user
   */
  async awardPoints(userId, points) {
    try {
      const { data, error } = await this.supabase.rpc("increment_user_points", {
        user_id: userId,
        points_to_add: points,
      });

      if (error) {
        // Fallback: manual update if RPC doesn't exist
        const { error: updateError } = await this.supabase
          .from("profiles")
          .update({ points: this.supabase.raw(`points + ${points}`) })
          .eq("id", userId);

        if (updateError) throw updateError;
      }

      return { success: true };
    } catch (error) {
      console.error("Error awarding points:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get public URL for a photo in Supabase Storage
   * @param {string} storagePath - Path in the storage bucket
   */
  getPhotoUrl(storagePath) {
    if (!storagePath) return null;

    const { data } = this.supabase.storage
      .from("hotspot-photos")
      .getPublicUrl(storagePath);

    return data?.publicUrl || null;
  }

  // ==================== HELPER FUNCTIONS ====================

  /**
   * Extract latitude from PostGIS geography object
   * Handles both GeoJSON and WKT formats
   */
  extractLatitude(location) {
    if (!location) return null;

    // If it's already a GeoJSON object
    if (typeof location === "object" && location.coordinates) {
      return location.coordinates[1];
    }

    // If it's a WKT string like "POINT(lng lat)"
    if (typeof location === "string") {
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

    if (typeof location === "object" && location.coordinates) {
      return location.coordinates[0];
    }

    if (typeof location === "string") {
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
