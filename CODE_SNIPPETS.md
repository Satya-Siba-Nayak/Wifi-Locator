# WiFi Locator - Code Snippets & Examples

## Featured Places Code

### Featured Places State Variable (index.js, line ~105)
```javascript
let featuredPlaces = []; // Populated dynamically from database
```

### Load Featured Places Function (index.js, lines 488-527)
```javascript
// Load featured places (diverse selection based on location and recency)
const loadFeaturedPlaces = async () => {
  try {
    const result = await window.dbService.getLiveHotspots();

    if (result.success && result.data && result.data.length > 0) {
      let candidates = [...result.data];

      // If user location is available, prioritize nearby places
      if (currentUserLocation) {
        candidates = candidates.map((hotspot) => ({
          ...hotspot,
          distance: calculateDistance(
            currentUserLocation.lat,
            currentUserLocation.lng,
            hotspot.latitude,
            hotspot.longitude,
          ),
        }));

        // Mix of nearby and recent places
        const nearbyPlaces = [...candidates]
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 2);
        const recentPlaces = [...candidates]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 2);

        // Combine and remove duplicates
        const combined = [...nearbyPlaces, ...recentPlaces];
        const uniqueMap = new Map();
        combined.forEach((place) => uniqueMap.set(place.id, place));
        featuredPlaces = Array.from(uniqueMap.values()).slice(0, 3);
      } else {
        // No location: show most recent hotspots
        featuredPlaces = candidates
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 3);
      }

      console.log("✅ Loaded featured places:", featuredPlaces);
    } else {
      console.warn("⚠️ No hotspots available for featured places");
      featuredPlaces = [];
    }
  } catch (error) {
    console.error("❌ Error loading featured places:", error);
    featuredPlaces = [];
  }
};
```

### Rendering Featured Places (index.js, lines 235-265)
```javascript
// Generate featured HTML - check if array is populated
let featuredHTML = "";
if (featuredPlaces && featuredPlaces.length > 0) {
  featuredHTML = featuredPlaces
    .map((hotspot) => {
      const photoUrl = hotspot.first_photo_path
        ? window.dbService.getPhotoUrl(hotspot.first_photo_path)
        : "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=500&auto=format&fit=crop";

      return `
        <button data-lat="${hotspot.latitude}" data-lng="${hotspot.longitude}" class="featured-place w-full text-left rounded-lg overflow-hidden bg-zinc-800 hover:bg-zinc-700/70 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 group">
            <div class="relative h-24">
                <img src="${photoUrl}" alt="${hotspot.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onerror="this.src='https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=500&auto=format&fit=crop'" />
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <span class="absolute top-2 right-2 bg-blue-600/90 text-white text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-15.355 21.213 0"/>
                    </svg>
                    Wi-Fi
                </span>
            </div>
            <div class="p-3">
                <p class="font-semibold text-zinc-100">${hotspot.name}</p>
                ${hotspot.address_text ? `<p class="text-xs text-zinc-400 mt-1 line-clamp-1">${hotspot.address_text}</p>` : ""}
            </div>
        </button>
      `;
    })
    .join("");
}

sidebarContent.innerHTML = `
  <div class="space-y-8">
    ...
    <div>
      <h3 class="text-sm font-semibold text-zinc-400 px-1 mb-3">Featured Places</h3>
      <div id="featured-places-list" class="space-y-3">
        ${featuredHTML || '<p class="text-zinc-500 text-sm px-1">Loading featured places...</p>'}
      </div>
    </div>
  </div>`;

// Add click handlers
document.querySelectorAll(".featured-place").forEach((el) => {
  el.addEventListener("click", (e) => {
    const lat = parseFloat(e.currentTarget.dataset.lat);
    const lng = parseFloat(e.currentTarget.dataset.lng);
    if (map && !isNaN(lat) && !isNaN(lng)) {
      map.setView([lat, lng], 16);
    }
  });
});
```

### Initialization Sequence (index.js, lines 1014-1085)
```javascript
// Load featured places first, then handle geolocation
loadFeaturedPlaces().then(() => {
  console.log("📍 Featured places loaded:", featuredPlaces.length, "places");
  
  // Render initial view immediately with featured places
  renderInitialView();

  // Geolocation
  if (navigator.geolocation) {
    console.log("📍 Requesting geolocation...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        currentUserLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        // Update nearby hotspots and map
        updateNearbyHotspots();
        updateMap(currentUserLocation);

        // Re-load featured places with user location for better results
        loadFeaturedPlaces().then(() => {
          console.log("📍 Featured places reloaded with location:", featuredPlaces.length, "places");
          // Re-render initial view with location-aware featured places
          renderInitialView();
        });
      },
      (error) => {
        console.error("Geolocation error:", error);
        // Use default location
        updateMap({ latitude: 18.5204, longitude: 73.8567 });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  } else {
    console.error("Geolocation not supported");
    updateMap({ latitude: 18.5204, longitude: 73.8567 });
  }
});
```

---

## Search Functionality Code

### Execute Search (index.js, lines 849-856)
```javascript
const executeSearch = (query) => {
  // Show search input value
  if (searchInput) {
    searchInput.value = query;
  }

  // Close overlays and sidebar
  if (window.innerWidth < 768) {
    // Tailwind's 'md' breakpoint
    toggleSidebar(false);
  }
  toggleOverlay(searchOverlay, false);

  // Add a small delay for sidebar animation to complete before starting search
  setTimeout(() => handleSearch(query), 300);
};
```

### Handle Search (index.js, lines 828-847)
```javascript
const handleSearch = (query) => {
  if (!currentUserLocation) {
    sidebarContent.innerHTML = renderError(
      "Could not get your location. Please enable location services and try again.",
    );
    return;
  }
  isLoading = true;
  sidebarContent.innerHTML = renderSpinner();

  // Simulate a network request with a timeout
  setTimeout(() => {
    const mockResult = {
      summary: `Showing results for "${query}". This is mock data for demonstration.`,
      places: MOCK_PLACES,
    };
    renderResults(mockResult);
    isLoading = false;
  }, 1000);
};
```

### Render Search Results (index.js, lines 223-242)
```javascript
const renderResults = (result) => {
  isShowingResults = true;
  backButton.classList.remove("hidden");

  let html = '<div class="space-y-4">';
  if (result.summary) {
    html += `<div class="bg-zinc-800 p-4 rounded-xl"><p class="text-zinc-300">${result.summary}</p></div>`;
  }
  if (result.places.length > 0) {
    html += result.places
      .map((place) => renderLocationCard(place.maps))
      .join("");
  } else {
    html += `<div class="text-center text-zinc-400 p-4"><p>No specific places found. Try a different search.</p></div>`;
  }
  html += "</div>";
  sidebarContent.innerHTML = html;
};
```

### Implement Database Search (FUTURE)
```javascript
// Replace the mock data section in handleSearch with:
const handleSearch = async (query) => {
  if (!currentUserLocation) {
    sidebarContent.innerHTML = renderError("Could not get your location...");
    return;
  }
  
  isLoading = true;
  sidebarContent.innerHTML = renderSpinner();

  try {
    // Query database for hotspots matching search
    const result = await window.dbService.searchHotspots(
      query,
      currentUserLocation.lat,
      currentUserLocation.lng
    );

    if (result.success && result.data.length > 0) {
      // Transform database results to match MOCK_PLACES format
      const formattedResults = {
        summary: `Found ${result.data.length} Wi-Fi spots matching "${query}"`,
        places: result.data.map((hotspot) => ({
          maps: {
            title: hotspot.name,
            uri: `https://www.openstreetmap.org/?mlat=${hotspot.latitude}&mlon=${hotspot.longitude}&zoom=17`,
            placeAnswerSources: {
              reviewSnippets: [
                { text: `Distance: ${hotspot.distance} km`, author: "Location Info" },
              ],
            },
          },
        })),
      };
      renderResults(formattedResults);
    } else {
      renderResults({ summary: `No results found for "${query}"`, places: [] });
    }
  } catch (error) {
    console.error("Search error:", error);
    sidebarContent.innerHTML = renderError("Error searching. Please try again.");
  } finally {
    isLoading = false;
  }
};
```

---

## Database Fetching Code

### Get All Live Hotspots (supabase-db.js, lines 17-107)
```javascript
async getLiveHotspots() {
  try {
    // Fetch ALL hotspots with creator profile info and photos in one query
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

      return spot;
    });

    console.log("✅ Processed hotspots:", hotspots);
    return { success: true, data: hotspots };
  } catch (error) {
    console.error("Error fetching live hotspots:", error);
    return { success: false, error: error.message };
  }
}
```

### Create a New Hotspot (supabase-db.js, lines 140-185)
```javascript
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
```

### Upload Hotspot Photos (supabase-db.js, lines 192-240)
```javascript
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
        continue;
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
```

---

## Map & Markers Code

### Initialize Map (index.js, lines 320-350)
```javascript
const initMap = () => {
  map = L.map("map", {
    zoomControl: false, // We'll add custom controls
    attributionControl: true,
  }).setView([18.5204, 73.8567], 13); // Default to Pune, India

  // Add OpenStreetMap tiles
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);

  // Add zoom control to bottom left
  L.control
    .zoom({
      position: "bottomleft",
    })
    .addTo(map);

  // Update marker and popup sizes on zoom
  map.on("zoomend", () => {
    const scale = getZoomScale();
    console.log(
      `🔍 Zoom changed to ${map.getZoom()}, scale: ${scale.toFixed(2)}`,
    );

    // Update all marker icons and popups
    window.hotspotsMarkers.forEach((marker) => {
      marker.setIcon(createMarkerIcon(scale));

      // Update popup content with new scale
      const popup = marker.getPopup();
      if (popup && marker.hotspotData) {
        const newContent = generatePopupContent(marker.hotspotData);
        popup.setContent(newContent);

        const baseMaxWidth = 320;
        const scaledMaxWidth = Math.floor(baseMaxWidth * scale);
        popup.options.maxWidth = scaledMaxWidth;
        popup.options.minWidth = Math.floor(280 * scale);

        // If popup is open, update its scale
        if (popup.isOpen()) {
          const popupElement = popup.getElement();
          if (popupElement) {
            const scaleWrapper = popupElement.querySelector(
              ".popup-scale-wrapper",
            );
            if (scaleWrapper) {
              scaleWrapper.style.transform = `scale(${scale})`;
              scaleWrapper.style.transformOrigin = "center top";
            }
          }
          popup.update();
        }
      }
    });
  });

  // Load existing hotspots from database
  loadHotspots();
};
```

### Create Marker Icon (index.js, lines 390-430)
```javascript
const createMarkerIcon = (scale = 1) => {
  const baseSize = 48;
  const baseHeight = 56;
  const scaledSize = baseSize * scale;
  const scaledHeight = baseHeight * scale;
  const svgSize = 28 * scale;
  const borderWidth = Math.max(2, 3 * scale);
  const borderRadius = 12 * scale;

  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="position: relative; width: ${scaledSize}px; height: ${scaledHeight}px;">
        <div style="
          width: ${scaledSize}px;
          height: ${scaledSize}px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          border-radius: ${borderRadius}px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
          border: ${borderWidth}px solid white;
          cursor: pointer;
          transition: all 0.3s ease;
        " class="wifi-marker">
          <svg style="width: ${svgSize}px; height: ${svgSize}px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-15.355 21.213 0"/>
          </svg>
        </div>
        <div style="
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: ${8 * scale}px solid transparent;
          border-right: ${8 * scale}px solid transparent;
          border-top: ${8 * scale}px solid #2563eb;
        "></div>
      </div>
    `,
    iconSize: [scaledSize, scaledHeight],
    iconAnchor: [scaledSize / 2, scaledHeight],
  });
};
```

### Load Hotspots onto Map (index.js, lines 440-510)
```javascript
const loadHotspots = async () => {
  try {
    console.log("🔍 Loading hotspots from database...");
    const result = await window.dbService.getLiveHotspots();

    if (result.success && result.data) {
      console.log(`✅ Loaded ${result.data.length} hotspots from database`);

      if (result.data.length === 0) {
        console.warn("⚠️ No hotspots in database! Add one first.");
        return;
      }

      result.data.forEach((hotspot, index) => {
        if (hotspot.latitude && hotspot.longitude) {
          // Create custom marker for hotspot with improved design
          const scale = getZoomScale();
          const marker = L.marker([hotspot.latitude, hotspot.longitude], {
            icon: createMarkerIcon(scale),
          }).addTo(map);

          // Store marker with hotspot data for zoom updates
          marker.hotspotData = hotspot;
          window.hotspotsMarkers.push(marker);

          // Get creator info (username only, no email)
          const creatorName = hotspot.created_by_username || "Anonymous";

          // Get photo URL if available
          const photoUrl = hotspot.first_photo_path
            ? window.dbService.getPhotoUrl(hotspot.first_photo_path)
            : null;

          // Create popup with improved design using CSS classes
          const popupScale = getZoomScale();
          const popupContent = generatePopupContent(hotspot);

          // Calculate popup width based on zoom
          const baseMaxWidth = 320;
          const scaledMaxWidth = Math.floor(baseMaxWidth * popupScale);

          const popup = L.popup({
            maxWidth: scaledMaxWidth,
            minWidth: Math.floor(280 * popupScale),
            className: "custom-popup-leaflet",
            closeButton: true,
          }).setContent(popupContent);

          marker.bindPopup(popup);

          // Apply scale transform when popup opens
          marker.on("popupopen", function (e) {
            const scale = getZoomScale();
            const popupElement = e.popup.getElement();
            if (popupElement) {
              const scaleWrapper = popupElement.querySelector(
                ".popup-scale-wrapper",
              );
              if (scaleWrapper) {
                scaleWrapper.style.transform = `scale(${scale})`;
                scaleWrapper.style.transformOrigin = "center top";
              }
            }
          });
        }
      });

      // Update nearby hotspots list after markers are loaded
      updateNearbyHotspots();
    }
  } catch (error) {
    console.error("Error loading hotspots:", error);
  }
};
```

---

## Nearby Hotspots Calculation

### Calculate Distance (index.js, lines 540-553)
```javascript
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};
```

### Update Nearby Hotspots (index.js, lines 556-650)
```javascript
const updateNearbyHotspots = async () => {
  const nearbyList = document.getElementById("nearby-hotspots-list");

  if (!currentUserLocation) {
    nearbyList.innerHTML = `
      <p class="text-zinc-500 text-sm px-1">Enable location to see nearby hotspots</p>
    `;
    return;
  }

  try {
    const result = await window.dbService.getLiveHotspots();

    if (!result.success || !result.data || result.data.length === 0) {
      nearbyList.innerHTML = `
        <p class="text-zinc-500 text-sm px-1">No hotspots found nearby</p>
      `;
      return;
    }

    // Calculate distances and sort
    const hotspotsWithDistance = result.data
      .filter((h) => h.latitude && h.longitude)
      .map((hotspot) => ({
        ...hotspot,
        distance: calculateDistance(
          currentUserLocation.lat,
          currentUserLocation.lng,
          hotspot.latitude,
          hotspot.longitude,
        ),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5); // Show top 5 nearest

    if (hotspotsWithDistance.length === 0) {
      nearbyList.innerHTML = `
        <p class="text-zinc-500 text-sm px-1">No hotspots found nearby</p>
      `;
      return;
    }

    // Generate HTML for nearby hotspots
    const nearbyHTML = hotspotsWithDistance
      .map((hotspot) => {
        const distanceText =
          hotspot.distance < 1
            ? `${Math.round(hotspot.distance * 1000)}m`
            : `${hotspot.distance.toFixed(1)}km`;

        const photoUrl = hotspot.first_photo_path
          ? window.dbService.getPhotoUrl(hotspot.first_photo_path)
          : null;

        return `
        <div class="nearby-hotspot bg-zinc-800 hover:bg-zinc-700 rounded-lg overflow-hidden cursor-pointer transition-colors" data-lat="${hotspot.latitude}" data-lng="${hotspot.longitude}">
          <div class="flex">
            ${
              photoUrl
                ? `
              <div class="w-20 h-20 flex-shrink-0">
                <img src="${photoUrl}" alt="${hotspot.name}" class="w-full h-full object-cover" onerror="this.parentElement.style.display='none'"/>
              </div>
            `
                : `
              <div class="w-20 h-20 flex-shrink-0 bg-zinc-900 flex items-center justify-center">
                <svg class="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-15.355 21.213 0"/>
                </svg>
              </div>
            `
            }
            <div class="flex-1 p-3 min-w-0">
              <div class="flex items-start justify-between mb-1">
                <h4 class="text-white font-medium text-sm truncate pr-2">${hotspot.name}</h4>
                <span class="text-blue-400 text-xs font-semibold flex-shrink-0">${distanceText}</span>
              </div>
              ${hotspot.address_text ? `<p class="text-zinc-400 text-xs line-clamp-1 mb-2">${hotspot.address_text}</p>` : ""}
              <div class="flex items-center gap-2">
                <svg class="w-3 h-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-15.355 21.213 0"/>
                </svg>
                <span class="text-zinc-500 text-xs">WiFi Available</span>
              </div>
            </div>
          </div>
        </div>
      `;
      })
      .join("");

    nearbyList.innerHTML = nearbyHTML;

    // Add click handlers
    document.querySelectorAll(".nearby-hotspot").forEach((el) => {
      el.addEventListener("click", () => {
        const lat = parseFloat(el.dataset.lat);
        const lng = parseFloat(el.dataset.lng);
        map.setView([lat, lng], 17); // Zoom to hotspot

        // Find and open the marker popup
        window.hotspotsMarkers.forEach((marker) => {
          if (
            marker.hotspotData &&
            marker.hotspotData.latitude === lat &&
            marker.hotspotData.longitude === lng
          ) {
            marker.openPopup();
          }
        });
      });
    });
  } catch (error) {
    console.error("Error loading nearby hotspots:", error);
    nearbyList.innerHTML = `
      <p class="text-red-400 text-sm px-1">Error loading hotspots</p>
    `;
  }
};
```

---

## Authentication Code

### Sign Up (supabase-auth.js)
```javascript
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
```

### Sign In (supabase-auth.js)
```javascript
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
```

### Create User Profile (supabase-auth.js)
```javascript
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
```

---

## Contribute Form Code

### Form Submission Handler (index.js, lines 1300-1380)
```javascript
contributeForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Check if user is signed in
  if (!window.authService.isSignedIn()) {
    alert("Please sign in to contribute a location.");
    toggleOverlay(contributeOverlay, false);
    toggleOverlay(profileOverlay, true);
    return;
  }

  // Validate coordinates
  if (!validatedCoords) {
    alert("Please enter valid GPS coordinates or Plus Code.");
    return;
  }

  const formData = {
    name: document.getElementById("place-name").value,
    address: document.getElementById("place-location").value,
    latitude: validatedCoords.latitude,
    longitude: validatedCoords.longitude,
    wifiType: document.getElementById("wifi-type").value,
    category: document.querySelector('input[name="category"]:checked')?.value,
    notes: document.getElementById("place-notes").value,
    photos: selectedPhotos,
  };

  // Submit to database
  const result = await window.dbService.createHotspot(
    formData.name,
    formData.latitude,
    formData.longitude,
    formData.address,
    formData.photos,
  );

  if (result.success) {
    alert("Thank you! Your Wi-Fi hotspot has been added to the map.");

    // Add marker to map immediately
    const marker = L.marker([formData.latitude, formData.longitude], {
      icon: L.divIcon({
        className: "custom-marker",
        html: `<div class="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg shadow-lg">📶</div>`,
        iconSize: [32, 32],
      }),
    }).addTo(map);

    marker.bindPopup(`
      <div class="p-2">
        <h3 class="font-bold text-lg">${formData.name}</h3>
        <p class="text-sm text-gray-600">${formData.address}</p>
        <p class="text-xs text-gray-500 mt-1">Added by: ${window.authService.getCurrentUser()?.email}</p>
      </div>
    `);

    // Pan to the new marker
    map.setView([formData.latitude, formData.longitude], 15);

    // Reset form and close overlay
    contributeForm.reset();
    selectedPhotos = [];
    photoPreviewsContainer.classList.add("hidden");
    photoPreviewsContainer.innerHTML = "";
    validatedCoords = null;
    coordPreview.classList.add("hidden");
    latInput.value = "";
    lngInput.value = "";
    toggleOverlay(contributeOverlay, false);
  } else {
    alert(`Error: ${result.error}`);
  }
});
```

---

## Plus Code Conversion Code

### Convert GPS to Plus Code (inline in index.html)
```javascript
// When user enters GPS coordinates and wants Plus Code
const lat = parseFloat(document.getElementById("latitude").value);
const lng = parseFloat(document.getElementById("longitude").value);

if (window.PlusCodeAPI.isValid(`${lat}, ${lng}`)) {
  const plusCode = window.PlusCodeAPI.encode(lat, lng);
  document.getElementById("plus-code").value = plusCode;
}
```

### Convert Plus Code to GPS (inline in index.html)
```javascript
// When user enters Plus Code
const plusCode = document.getElementById("plus-code").value;

if (window.PlusCodeAPI.isValid(plusCode)) {
  const decoded = window.PlusCodeAPI.decode(plusCode);
  document.getElementById("latitude").value = decoded.latitudeCenter.toFixed(6);
  document.getElementById("longitude").value = decoded.longitudeCenter.toFixed(6);
  
  validatedCoords = {
    latitude: decoded.latitudeCenter,
    longitude: decoded.longitudeCenter
  };
}
```

---

## Event Listeners Setup (index.js)

### Sidebar & Overlay Toggles
```javascript
// Sidebar and Overlay toggles
menuButtonMap.addEventListener("click", () => toggleSidebar(true));
closeSidebarButton.addEventListener("click", () => toggleSidebar(false));
backButton.addEventListener("click", () => {
  renderInitialView();
});

[openSearchMapBtn, closeSearchBtn].forEach((el) =>
  el.addEventListener("click", () =>
    toggleOverlay(
      searchOverlay,
      searchOverlay.classList.contains("opacity-0"),
    ),
  ),
);

[openProfileMapBtn, closeProfileBtn].forEach((el) =>
  el.addEventListener("click", () =>
    toggleOverlay(
      profileOverlay,
      profileOverlay.classList.contains("opacity-0"),
    ),
  ),
);

[contributeBtn, closeContributeBtn].forEach((el) =>
  el.addEventListener("click", () =>
    toggleOverlay(
      contributeOverlay,
      contributeOverlay.classList.contains("opacity-0"),
    ),
  ),
);
```

### Search Form
```javascript
searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const query = searchInput.value.trim();
  if (query) {
    executeSearch(query);
  }
});
```

### Map Recenter
```javascript
recenterMapButton.addEventListener("click", () => {
  if (currentUserLocation) {
    updateMap(currentUserLocation);
  }
});
```

---

**Code Snippets Document Version:** 1.0  
**Last Updated:** Based on current codebase
