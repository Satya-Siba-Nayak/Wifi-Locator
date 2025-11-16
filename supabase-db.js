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
      // Fetch ALL hotspots with creator profile info and photos in one query
      // Use PostGIS ST_X and ST_Y to extract coordinates from geography type
      const { data: hotspotData, error: hotspotError } =
        await this.supabase.rpc("get_all_hotspots_with_coords");

      if (hotspotError) {
        console.error("❌ Error fetching hotspots:", hotspotError);
        throw hotspotError;
      }

      console.log("📦 Fetched hotspots from database:", hotspotData);

      // Group rows by hotspot ID (since LEFT JOIN with photos creates multiple rows)
      const hotspotsMap = new Map();

      hotspotData.forEach((row) => {
        if (!hotspotsMap.has(row.id)) {
          hotspotsMap.set(row.id, {
            id: row.id,
            name: row.name,
            address_text: row.address_text,
            created_by: row.created_by,
            created_at: row.created_at,
            latitude: row.latitude,
            longitude: row.longitude,
            created_by_username: row.username || null,
            created_by_avatar_url: row.avatar_url || null,
            created_by_id: row.created_by,
            photos: [],
            first_photo_path: null,
          });
        }

        // Add photo if it exists in this row
        if (row.photo_id) {
          const hotspot = hotspotsMap.get(row.id);
          hotspot.photos.push({
            id: row.photo_id,
            storage_path: row.storage_path,
            display_order: row.display_order,
          });
        }
      });

      // Convert map to array and set first photo
      const hotspots = Array.from(hotspotsMap.values()).map((spot) => {
        // Sort photos by display_order and get first photo
        spot.photos.sort((a, b) => a.display_order - b.display_order);
        spot.first_photo_path = spot.photos[0]?.storage_path || null;

        console.log(`🔍 Debug hotspot ${spot.id}:`, {
          username: spot.created_by_username,
          photoCount: spot.photos.length,
          latitude: spot.latitude,
          longitude: spot.longitude,
        });

        return spot;
      });

      console.log("✅ Processed hotspots:", hotspots);
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
   * Upload or update user's profile picture
   * @param {File} file - The image file to upload
   * @param {string} userId - User ID (optional, defaults to current user)
   */
  async uploadProfilePicture(file, userId = null) {
    try {
      const user = userId
        ? { id: userId }
        : window.supabaseHelpers.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: "You must be signed in to upload a profile picture",
        };
      }

      // Validate file type
      const validTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!validTypes.includes(file.type)) {
        return {
          success: false,
          error:
            "Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.",
        };
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        return {
          success: false,
          error: "File size too large. Maximum size is 5MB.",
        };
      }

      // Get current profile to check for existing avatar
      const { data: profile } = await this.supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .single();

      // Delete old avatar if exists
      if (profile?.avatar_url) {
        await this.deleteProfilePicture(user.id);
      }

      // Create unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar_${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } =
        await this.supabase.storage
          .from("profile-pictures")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: true,
          });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from("profile-pictures")
        .getPublicUrl(uploadData.path);

      const avatarUrl = urlData.publicUrl;

      // Update profile with new avatar URL
      const { error: updateError } = await this.supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      console.log("Profile picture uploaded:", avatarUrl);
      return { success: true, avatarUrl, path: uploadData.path };
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete user's profile picture
   * @param {string} userId - User ID (optional, defaults to current user)
   */
  async deleteProfilePicture(userId = null) {
    try {
      const user = userId
        ? { id: userId }
        : window.supabaseHelpers.getCurrentUser();
      if (!user) {
        return { success: false, error: "You must be signed in" };
      }

      // Get current avatar URL
      const { data: profile } = await this.supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .single();

      if (!profile?.avatar_url) {
        return { success: true, message: "No profile picture to delete" };
      }

      // Extract storage path from URL
      // URL format: https://.../storage/v1/object/public/profile-pictures/{path}
      const urlParts = profile.avatar_url.split("/profile-pictures/");
      if (urlParts.length > 1) {
        const storagePath = urlParts[1];

        // Delete from storage
        const { error: deleteError } = await this.supabase.storage
          .from("profile-pictures")
          .remove([storagePath]);

        if (deleteError) {
          console.warn("Error deleting from storage:", deleteError);
        }
      }

      // Update profile to remove avatar URL
      const { error: updateError } = await this.supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);

      if (updateError) throw updateError;

      console.log("Profile picture deleted");
      return { success: true };
    } catch (error) {
      console.error("Error deleting profile picture:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get public URL for a profile picture
   * @param {string} avatarUrl - Avatar URL from database
   */
  getProfilePictureUrl(avatarUrl) {
    return avatarUrl || null;
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
   * Handles GeoJSON, WKT, and hex-encoded EWKB formats
   */
  extractLatitude(location) {
    if (!location) {
      console.warn("⚠️ Location is null/undefined");
      return null;
    }

    console.log(
      "📍 Extracting latitude from:",
      location,
      "Type:",
      typeof location,
    );

    // If it's already a GeoJSON object with coordinates
    if (typeof location === "object" && location.coordinates) {
      console.log("✅ Found GeoJSON coordinates");
      return location.coordinates[1];
    }

    // If location has a type property (GeoJSON format)
    if (
      typeof location === "object" &&
      location.type === "Point" &&
      Array.isArray(location.coordinates)
    ) {
      console.log("✅ Found GeoJSON Point format");
      return location.coordinates[1];
    }

    // If it's a WKT string like "POINT(lng lat)" or "POINT (lng lat)"
    if (typeof location === "string") {
      const match = location.match(/POINT\s*\(([^\s]+)\s+([^\s)]+)\)/i);
      if (match) {
        console.log("✅ Found WKT format");
        return parseFloat(match[2]);
      }
    }

    console.error("❌ Could not extract latitude from location:", location);
    return null;
  }

  /**
   * Extract longitude from PostGIS geography object
   * Handles GeoJSON, WKT, and hex-encoded EWKB formats
   */
  extractLongitude(location) {
    if (!location) {
      console.warn("⚠️ Location is null/undefined");
      return null;
    }

    console.log(
      "📍 Extracting longitude from:",
      location,
      "Type:",
      typeof location,
    );

    // If it's already a GeoJSON object with coordinates
    if (typeof location === "object" && location.coordinates) {
      console.log("✅ Found GeoJSON coordinates");
      return location.coordinates[0];
    }

    // If location has a type property (GeoJSON format)
    if (
      typeof location === "object" &&
      location.type === "Point" &&
      Array.isArray(location.coordinates)
    ) {
      console.log("✅ Found GeoJSON Point format");
      return location.coordinates[0];
    }

    // If it's a WKT string like "POINT(lng lat)" or "POINT (lng lat)"
    if (typeof location === "string") {
      const match = location.match(/POINT\s*\(([^\s]+)\s+([^\s)]+)\)/i);
      if (match) {
        console.log("✅ Found WKT format");
        return parseFloat(match[1]);
      }
    }

    console.error("❌ Could not extract longitude from location:", location);
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
