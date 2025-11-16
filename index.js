// Wait for Supabase to be fully loaded
const waitForSupabase = () => {
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (window.supabase && window.authService && window.dbService) {
        clearInterval(checkInterval);
        window.authService.initialize();
        window.dbService.initialize();
        resolve();
      }
    }, 100);

    // Timeout after 5 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      console.warn("Supabase initialization timeout");
      resolve();
    }, 5000);
  });
};

document.addEventListener("DOMContentLoaded", async () => {
  // Wait for Supabase to initialize
  await waitForSupabase();
  console.log("✅ All services initialized");

  // Verify Plus Code API is available (defined inline in HTML)
  if (window.PlusCodeAPI) {
    console.log("✅ Plus Code API ready");
    // Test Plus Code API
    try {
      window.PlusCodeAPI.encode(40.7128, -74.006);
    } catch (e) {
      console.error("❌ Plus Code test failed:", e);
    }
  } else {
    console.error("❌ Plus Code API not loaded!");
  }

  // --- STATE ---
  let currentUserLocation = null;
  let isLoading = false;
  let map = null; // Leaflet map instance
  let userMarker = null; // User location marker
  let isShowingResults = false; // Track if showing search results
  let currentAuthMode = "login"; // Track current auth mode: 'login' or 'signup'

  // --- DOM ELEMENTS ---
  const sidebar = document.getElementById("sidebar");
  const sidebarContent = document.getElementById("sidebar-content");
  const backButton = document.getElementById("back-button");

  // Overlays
  const searchOverlay = document.getElementById("search-overlay");
  const profileOverlay = document.getElementById("profile-overlay");
  const contributeOverlay = document.getElementById("contribute-overlay");

  // Sidebar/Overlay Buttons
  const menuButtonMap = document.getElementById("menu-button-map");
  const closeSidebarButton = document.getElementById("close-sidebar-button");
  const openSearchMapBtn = document.getElementById("search-button-map");
  const openProfileMapBtn = document.getElementById("profile-button-map");
  const closeSearchBtn = document.getElementById("close-search-overlay");
  const closeProfileBtn = document.getElementById("close-profile-overlay");
  const contributeBtn = document.getElementById("contribute-button");
  const closeContributeBtn = document.getElementById(
    "close-contribute-overlay",
  );
  const contributeCancelBtn = document.getElementById("contribute-cancel");

  // Search
  const searchForm = document.getElementById("search-form");
  const searchInput = document.getElementById("search-input");
  const searchRecommendations = document.getElementById(
    "search-recommendations",
  );

  // Profile
  const loginTab = document.getElementById("login-tab");
  const signupTab = document.getElementById("signup-tab");
  const segmentedControlBg = document.getElementById("segmented-control-bg");
  const nameField = document.getElementById("name-field");
  const authSubmitBtn = document.getElementById("auth-submit-button");
  const authForm = document.getElementById("auth-form");
  const googleSigninBtn = document.getElementById("google-signin-button");
  const signoutBtn = document.getElementById("signout-button");
  const userInfoDiv = document.getElementById("user-info");
  const authErrorMsg = document.getElementById("auth-error-message");
  const authSuccessMsg = document.getElementById("auth-success-message");

  // Contribute
  const contributeForm = document.getElementById("contribute-form");

  // Map actions
  const recenterMapButton = document.getElementById("recenter-map-button");

  // --- CONSTANTS ---
  const filterPills = [
    "Coffee Shops",
    "Libraries",
    "Coworking",
    "Free Wi-Fi",
    "Quiet Places",
  ];
  let featuredPlaces = []; // Will be loaded from database
  const recommendationPills = [
    "Quiet cafes with fast Wi-Fi",
    "Places to work with power outlets",
    "24/7 study spots",
    "Libraries with free internet",
    "Coffee shops nearby",
  ];

  // MOCK_PLACES removed - now using real database data

  // --- RENDERING ---
  const renderSpinner = () => `
        <div class="flex flex-col items-center justify-center h-full space-y-2">
            <svg class="animate-spin h-8 w-8 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <p class="text-zinc-400">Searching...</p>
        </div>`;

  const renderError = (message) =>
    `<div class="text-red-400 bg-red-900/30 p-3 rounded-lg">${message}</div>`;
  const renderApiError = (message) =>
    `<div class="text-yellow-400 bg-yellow-900/30 p-3 rounded-lg">${message}</div>`;

  const renderLocationCard = (hotspot) => {
    const photoUrl = hotspot.first_photo_path
      ? window.dbService.getPhotoUrl(hotspot.first_photo_path)
      : null;
    const creatorName = hotspot.created_by_username || "Anonymous";
    const creatorAvatar = hotspot.created_by_avatar_url;
    const creatorInitial = creatorName.charAt(0).toUpperCase();
    const mapsUrl = `https://www.openstreetmap.org/?mlat=${hotspot.latitude}&mlon=${hotspot.longitude}#map=18/${hotspot.latitude}/${hotspot.longitude}`;

    return `
        <div class="bg-zinc-800 rounded-xl border border-zinc-700/80 hover:border-zinc-600 hover:bg-zinc-700/50 transition-all group cursor-pointer" data-hotspot-id="${hotspot.id}" data-lat="${hotspot.latitude}" data-lng="${hotspot.longitude}">
            ${
              photoUrl
                ? `
            <div class="relative h-32 overflow-hidden rounded-t-xl">
                <img src="${photoUrl}" alt="${hotspot.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            </div>
            `
                : ""
            }
            <div class="p-4">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-start space-x-3 flex-1">
                        <div class="flex-shrink-0 pt-1">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-15.355 21.213 0"/>
                            </svg>
                        </div>
                        <div class="flex-1 min-w-0">
                            <h3 class="font-semibold text-gray-100">${hotspot.name}</h3>
                            ${hotspot.address_text ? `<p class="text-sm text-zinc-400 mt-1 line-clamp-2">${hotspot.address_text}</p>` : ""}
                        </div>
                    </div>
                    <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="p-1.5 rounded-full text-zinc-400 group-hover:text-blue-400 group-hover:bg-zinc-600/50 transition-colors flex-shrink-0" aria-label="Open in Maps" onclick="event.stopPropagation()">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002 2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                </div>
                <div class="mt-3 pt-3 border-t border-zinc-700/50 flex items-center justify-between text-xs">
                    <div class="flex items-center gap-2">
                        ${
                          creatorAvatar
                            ? `<img src="${creatorAvatar}" alt="${creatorName}" class="w-5 h-5 rounded-full object-cover border border-zinc-600" />`
                            : `<div class="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">${creatorInitial}</div>`
                        }
                        <span class="text-zinc-500">Added by ${creatorName}</span>
                    </div>
                    ${hotspot.created_at ? `<span class="text-zinc-500">${formatDate(hotspot.created_at)}</span>` : ""}
                </div>
            </div>
        </div>`;
  };

  const renderResults = (result) => {
    isShowingResults = true;
    backButton.classList.remove("hidden");

    let html = '<div class="space-y-4">';
    if (result.summary) {
      html += `<div class="bg-zinc-800 p-4 rounded-xl border border-zinc-700/50"><p class="text-zinc-300">${result.summary}</p></div>`;
    }
    if (result.hotspots && result.hotspots.length > 0) {
      html += result.hotspots
        .map((hotspot) => renderLocationCard(hotspot))
        .join("");
    } else {
      html += `<div class="text-center text-zinc-400 p-4"><p>No hotspots found matching "${result.query}". Try a different search or add a new location!</p></div>`;
    }
    html += "</div>";
    sidebarContent.innerHTML = html;

    // Add click handlers to location cards to pan to them on map
    document.querySelectorAll("[data-hotspot-id]").forEach((card) => {
      card.addEventListener("click", () => {
        const lat = parseFloat(card.dataset.lat);
        const lng = parseFloat(card.dataset.lng);
        map.setView([lat, lng], 17);

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

        // Close sidebar on mobile
        if (window.innerWidth < 768) {
          toggleSidebar(false);
        }
      });
    });
  };

  const renderInitialView = () => {
    isShowingResults = false;
    backButton.classList.add("hidden");

    const filtersHTML = filterPills
      .map(
        (filter) =>
          `<button data-query="${filter}" class="filter-pill bg-zinc-800 text-zinc-200 px-3 py-1.5 rounded-lg text-sm hover:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">${filter}</button>`,
      )
      .join("");

    const featuredHTML = featuredPlaces
      .map((hotspot) => {
        const photoUrl = hotspot.first_photo_path
          ? window.dbService.getPhotoUrl(hotspot.first_photo_path)
          : "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=500&auto=format&fit=crop"; // Default image

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

    sidebarContent.innerHTML = `
            <div class="space-y-8">
                <div>
                    <h3 class="text-sm font-semibold text-zinc-400 px-1 mb-3">Quick Filters</h3>
                    <div class="flex flex-wrap gap-2">${filtersHTML}</div>
                </div>
                <div id="nearby-hotspots-section">
                    <h3 class="text-sm font-semibold text-zinc-400 px-1 mb-3">Nearby Hotspots</h3>
                    <div id="nearby-hotspots-list" class="space-y-3">
                        <p class="text-zinc-500 text-sm px-1">Detecting your location...</p>
                    </div>
                </div>
                <div>
                    <h3 class="text-sm font-semibold text-zinc-400 px-1 mb-3">Featured Places</h3>
                    <div id="featured-places-list" class="space-y-3">
                        ${featuredHTML || '<p class="text-zinc-500 text-sm px-1">Loading featured places...</p>'}
                    </div>
                </div>
            </div>`;

    document.querySelectorAll(".filter-pill").forEach((el) => {
      el.addEventListener("click", (e) =>
        executeSearch(e.currentTarget.dataset.query),
      );
    });

    // Add click handlers for featured places to pan to location on map
    document.querySelectorAll(".featured-place").forEach((el) => {
      el.addEventListener("click", (e) => {
        const lat = parseFloat(e.currentTarget.dataset.lat);
        const lng = parseFloat(e.currentTarget.dataset.lng);
        map.setView([lat, lng], 17);

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

        // Close sidebar on mobile
        if (window.innerWidth < 768) {
          toggleSidebar(false);
        }
      });
    });
  };

  const renderSearchRecommendations = () => {
    const container = searchRecommendations.querySelector("div");
    container.innerHTML = recommendationPills
      .map(
        (rec) =>
          `<button data-query="${rec}" class="rec-pill bg-zinc-800 text-zinc-200 px-4 py-2 rounded-full text-sm hover:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">${rec}</button>`,
      )
      .join("");
    document.querySelectorAll(".rec-pill").forEach((el) => {
      el.addEventListener("click", (e) => {
        const query = e.currentTarget.dataset.query;
        searchInput.value = query;
        executeSearch(query);
      });
    });
  };

  // --- LOGIC ---
  const toggleOverlay = (overlay, show) => {
    if (show) {
      overlay.classList.remove("opacity-0", "pointer-events-none");
      overlay.setAttribute("aria-hidden", "false");
    } else {
      overlay.classList.add("opacity-0", "pointer-events-none");
      overlay.setAttribute("aria-hidden", "true");
    }
  };

  const toggleSidebar = (show) => {
    if (show) {
      sidebar.classList.remove("-translate-x-full");
    } else {
      sidebar.classList.add("-translate-x-full");
    }
  };

  // Initialize Leaflet map
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
              // Scale the inner wrapper instead of entire popup to preserve positioning
              const scaleWrapper = popupElement.querySelector(
                ".popup-scale-wrapper",
              );
              if (scaleWrapper) {
                scaleWrapper.style.transform = `scale(${scale})`;
                // Scale from top center - popup anchored at bottom tip
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

  // Calculate scale factor based on zoom level
  const getZoomScale = () => {
    const zoom = map.getZoom();
    // INVERTED: Popup scales WITH map zoom
    // Zoom OUT (low zoom) = small popup (0.4)
    // Zoom IN (high zoom) = large popup (1.0)
    // zoom 5-8: very small (0.4-0.55)
    // zoom 9-12: small (0.6-0.8)
    // zoom 13-15: medium (0.85-0.95)
    // zoom 16-18: normal (1.0)
    let scale;
    if (zoom <= 5) scale = 0.4;
    else if (zoom >= 18) scale = 1.0;
    else scale = 0.4 + ((zoom - 5) / 13) * 0.6;

    return scale;
  };

  // Create marker icon with scale
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

  // Store all markers globally for zoom updates
  window.hotspotsMarkers = [];

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
      console.error("Error loading featured places:", error);
      featuredPlaces = [];
    }
  };

  // Load and display hotspots from database
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
                // Scale the inner wrapper instead of entire popup to preserve positioning
                const scaleWrapper = popupElement.querySelector(
                  ".popup-scale-wrapper",
                );
                if (scaleWrapper) {
                  scaleWrapper.style.transform = `scale(${scale})`;
                  // Scale from top center - popup anchored at bottom tip
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

  // Calculate distance between two points using Haversine formula
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

  // Update nearby hotspots list
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

  // Generate popup content for a hotspot
  const generatePopupContent = (hotspot) => {
    const creatorName = hotspot.created_by_username || "Anonymous";
    const creatorAvatar = hotspot.created_by_avatar_url;
    const creatorInitial = creatorName.charAt(0).toUpperCase();
    const photoUrl = hotspot.first_photo_path
      ? window.dbService.getPhotoUrl(hotspot.first_photo_path)
      : null;

    return `
      <div class="popup-scale-wrapper">
        <div class="popup-container">
        ${
          photoUrl
            ? `
          <div class="popup-photo">
            <img src="${photoUrl}" alt="${hotspot.name}" onerror="this.parentElement.style.display='none'"/>
            <div class="popup-photo-overlay"></div>
          </div>
        `
            : ""
        }

        <div class="popup-content">
          <h3 class="popup-title">${hotspot.name || "Wi-Fi Hotspot"}</h3>

          ${
            hotspot.address_text
              ? `
            <div class="popup-address">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
              </svg>
              <p>${hotspot.address_text}</p>
            </div>
          `
              : ""
          }

          <div class="popup-stats">
            ${
              hotspot.avg_speed_score
                ? `
              <div class="popup-stat-item">
                <span>⚡</span>
                <span class="popup-stat-label">Speed: <span class="popup-stat-value">${getSpeedLabel(hotspot.avg_speed_score)}</span></span>
              </div>
            `
                : ""
            }
            ${
              hotspot.noise_level
                ? `
              <div class="popup-stat-item">
                <span>🔊</span>
                <span class="popup-stat-label">Noise: <span class="popup-stat-value">${hotspot.noise_level}</span></span>
              </div>
            `
                : ""
            }
            ${
              hotspot.security_rating
                ? `
              <div class="popup-stat-item">
                <span>🔒</span>
                <span class="popup-stat-label">Security: <span class="popup-stat-value">${hotspot.security_rating.replace(/_/g, " ")}</span></span>
              </div>
            `
                : ""
            }
          </div>

          <div class="popup-footer">
            <div class="popup-creator">
              ${
                creatorAvatar
                  ? `<img src="${creatorAvatar}" alt="${creatorName}" class="popup-avatar" style="object-fit: cover;" />`
                  : `<div class="popup-avatar">${creatorInitial}</div>`
              }
              <div class="popup-creator-info">
                <p>Added by</p>
                <p class="popup-creator-name">${creatorName}</p>
              </div>
            </div>
            ${hotspot.created_at ? `<p class="popup-date">${formatDate(hotspot.created_at)}</p>` : ""}
          </div>

          <button style="margin-top: 16px; width: 100%; padding: 10px 16px; background: #2563eb; color: white; font-size: 14px; font-weight: 600; border-radius: 8px; border: none; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='#2563eb'" onclick="viewHotspotDetails(${hotspot.id})">
            View Full Details
          </button>
        </div>
        </div>
      </div>
    `;
  };

  // Helper function to convert speed score to label
  const getSpeedLabel = (score) => {
    if (score >= 4) return "Gaming/High ⚡⚡⚡";
    if (score >= 3) return "Streaming ⚡⚡";
    if (score >= 2) return "Browsing ⚡";
    if (score >= 1) return "Email Only";
    return "No Signal";
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  // Global function to view hotspot details (called from popup)
  window.viewHotspotDetails = (hotspotId) => {
    console.log("View details for hotspot:", hotspotId);
    // TODO: Implement detailed view in sidebar
    alert(
      `Viewing details for hotspot #${hotspotId}. Full details view coming soon!`,
    );
  };

  const updateMap = (location, zoom = 15) => {
    if (!map) return;

    const { latitude: lat, longitude: lon } = location;

    // Pan to location
    map.setView([lat, lon], zoom);

    // Create or update user marker
    if (userMarker) {
      userMarker.setLatLng([lat, lon]);
    } else {
      // Create custom pulsing marker
      const pulsingIcon = L.divIcon({
        className: "custom-user-marker",
        html: `
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="absolute w-12 h-12 bg-blue-500/30 rounded-full animate-ping"></div>
            <div class="absolute w-8 h-8 bg-blue-500/40 rounded-full"></div>
            <div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg"></div>
          </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      });

      userMarker = L.marker([lat, lon], { icon: pulsingIcon }).addTo(map);
    }
  };

  const handleSearch = async (query) => {
    console.log(`🔍 Searching for: "${query}"`);
    isLoading = true;
    sidebarContent.innerHTML = renderSpinner();

    try {
      // Get all hotspots from database
      console.log("📡 Fetching hotspots from database...");
      const result = await window.dbService.getLiveHotspots();

      if (!result.success || !result.data) {
        console.error("❌ Failed to load hotspots:", result.error);
        sidebarContent.innerHTML = renderError(
          "Failed to load hotspots. Please try again.",
        );
        isLoading = false;
        return;
      }

      console.log(
        `✅ Retrieved ${result.data.length} total hotspots from database`,
      );

      // Filter hotspots based on search query (case-insensitive)
      const queryLower = query.toLowerCase().trim();
      let filteredHotspots = result.data;

      if (queryLower) {
        filteredHotspots = result.data.filter((hotspot) => {
          const nameMatch = hotspot.name?.toLowerCase().includes(queryLower);
          const addressMatch = hotspot.address_text
            ?.toLowerCase()
            .includes(queryLower);
          const creatorMatch = hotspot.created_by_username
            ?.toLowerCase()
            .includes(queryLower);
          return nameMatch || addressMatch || creatorMatch;
        });
        console.log(
          `🔎 Filtered to ${filteredHotspots.length} hotspots matching "${query}"`,
        );
      }

      // Sort by distance if user location is available
      if (currentUserLocation && filteredHotspots.length > 0) {
        filteredHotspots = filteredHotspots
          .map((hotspot) => ({
            ...hotspot,
            distance: calculateDistance(
              currentUserLocation.lat,
              currentUserLocation.lng,
              hotspot.latitude,
              hotspot.longitude,
            ),
          }))
          .sort((a, b) => a.distance - b.distance);
      }

      const searchResult = {
        query: query,
        summary:
          filteredHotspots.length > 0
            ? `Found ${filteredHotspots.length} hotspot${filteredHotspots.length !== 1 ? "s" : ""} matching "${query}"${currentUserLocation ? ", sorted by distance" : ""}`
            : null,
        hotspots: filteredHotspots,
      };

      renderResults(searchResult);
      isLoading = false;
    } catch (error) {
      console.error("Search error:", error);
      sidebarContent.innerHTML = renderError(
        "An error occurred while searching. Please try again.",
      );
      isLoading = false;
    }
  };

  const executeSearch = (query) => {
    if (window.innerWidth < 768) {
      // Tailwind's 'md' breakpoint
      toggleSidebar(false);
    }
    toggleOverlay(searchOverlay, false);
    // Add a small delay for sidebar animation to complete before starting search
    setTimeout(() => handleSearch(query), 300);
  };

  // --- INITIALIZATION & EVENT LISTENERS ---

  // Initialize map first
  initMap();

  // Show loading state initially
  sidebarContent.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full space-y-4">
      <svg class="animate-spin h-8 w-8 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p class="text-zinc-400">Requesting location access...</p>
      <p class="text-xs text-zinc-500">Please allow location permissions when prompted</p>
    </div>
  `;

  // Load featured places first, then handle geolocation
  loadFeaturedPlaces().then(() => {
    console.log("📍 Featured places loaded, now requesting geolocation...");

    // Geolocation
    if (navigator.geolocation) {
      console.log("📍 Requesting geolocation...");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("✅ Geolocation success:", {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: `${position.coords.accuracy}m`,
          });

          currentUserLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          // Update nearby hotspots when location is detected
          updateNearbyHotspots();

          updateMap(currentUserLocation);

          // Re-load featured places with user location for better results
          loadFeaturedPlaces().then(() => {
            // Render initial view after a delay so user can see coordinates
            setTimeout(() => renderInitialView(), 1000);
          });
        },
        (error) => {
          console.error("Geolocation error:", error);
          let errorMessage = "";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage =
                "Location access denied. Please enable location permissions in your browser settings.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage =
                "Location information unavailable. Please check your device settings.";
              break;
            case error.TIMEOUT:
              errorMessage = "Location request timed out. Please try again.";
              break;
            default:
              errorMessage = `Location error: ${error.message}`;
          }
          sidebarContent.innerHTML = renderError(errorMessage);
          // Use a default location for the map (Pune, India)
          updateMap({ latitude: 18.5204, longitude: 73.8567 });

          // Render without location
          renderInitialView();
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      );
    } else {
      console.error("Geolocation not supported");
      sidebarContent.innerHTML = renderError(
        "Geolocation is not supported by this browser.",
      );
      updateMap({ latitude: 18.5204, longitude: 73.8567 });

      // Render without location
      renderInitialView();
    }
  });

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
  [contributeBtn, closeContributeBtn, contributeCancelBtn].forEach((el) =>
    el.addEventListener("click", () =>
      toggleOverlay(
        contributeOverlay,
        contributeOverlay.classList.contains("opacity-0"),
      ),
    ),
  );

  searchOverlay.addEventListener("transitionend", () => {
    if (!searchOverlay.classList.contains("opacity-0")) {
      searchInput.focus();
    }
  });

  // Search form
  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (query) {
      executeSearch(query);
    }
  });

  // Profile form segmented control
  const forgotPasswordLink = document.getElementById("forgot-password-link");

  loginTab.addEventListener("click", () => {
    currentAuthMode = "login";
    segmentedControlBg.style.transform = "translateX(0%)";
    loginTab.classList.remove("text-zinc-400");
    loginTab.classList.add("text-zinc-100");
    signupTab.classList.add("text-zinc-400");
    signupTab.classList.remove("text-zinc-100");
    nameField.classList.add("hidden");
    nameField.querySelector("input").required = false;

    // Reset button state and text
    authSubmitBtn.disabled = false;
    authSubmitBtn.innerHTML = "Sign In";

    // Show forgot password link in login mode
    if (forgotPasswordLink) {
      forgotPasswordLink.classList.remove("hidden");
    }

    // Clear error messages
    if (authErrorMsg) authErrorMsg.classList.add("hidden");
    if (authSuccessMsg) authSuccessMsg.classList.add("hidden");
  });

  signupTab.addEventListener("click", () => {
    currentAuthMode = "signup";
    const tabWidth = loginTab.offsetWidth;
    segmentedControlBg.style.width = `${tabWidth}px`;
    segmentedControlBg.style.transform = `translateX(${tabWidth}px)`;
    signupTab.classList.remove("text-zinc-400");
    signupTab.classList.add("text-zinc-100");
    loginTab.classList.add("text-zinc-400");
    loginTab.classList.remove("text-zinc-100");
    nameField.classList.remove("hidden");
    nameField.querySelector("input").required = true;

    // Reset button state and text
    authSubmitBtn.disabled = false;
    authSubmitBtn.innerHTML = "Create Account";

    // Hide forgot password link in signup mode
    if (forgotPasswordLink) {
      forgotPasswordLink.classList.add("hidden");
    }

    // Clear error messages
    if (authErrorMsg) authErrorMsg.classList.add("hidden");
    if (authSuccessMsg) authSuccessMsg.classList.add("hidden");
  });

  // Auth form submission (Email/Password)
  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Clear previous messages
    if (authErrorMsg) authErrorMsg.classList.add("hidden");
    if (authSuccessMsg) authSuccessMsg.classList.add("hidden");

    if (!window.authService) {
      console.error("Auth service not initialized");
      window.authService?.showError(
        "Authentication service not ready. Please refresh the page.",
      );
      return;
    }

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const nameInput = document.getElementById("name");

    const email = emailInput?.value?.trim();
    const password = passwordInput?.value;
    const name = nameInput?.value?.trim();

    // Validation
    if (!email) {
      window.authService.showError("Please enter your email address.");
      emailInput?.focus();
      return;
    }

    if (!password) {
      window.authService.showError("Please enter your password.");
      passwordInput?.focus();
      return;
    }

    if (currentAuthMode === "signup" && !name) {
      window.authService.showError("Please enter your name.");
      nameInput?.focus();
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      window.authService.showError("Please enter a valid email address.");
      emailInput?.focus();
      return;
    }

    // Password length validation
    if (password.length < 6) {
      window.authService.showError(
        "Password must be at least 6 characters long.",
      );
      passwordInput?.focus();
      return;
    }

    // Disable submit button and show loading state
    if (!authSubmitBtn) {
      console.error("Submit button not found");
      return;
    }

    authSubmitBtn.disabled = true;
    const originalText = authSubmitBtn.textContent;
    authSubmitBtn.innerHTML = `
      <div class="flex items-center justify-center gap-2">
        <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>${currentAuthMode === "signup" ? "Creating account..." : "Signing in..."}</span>
      </div>
    `;

    try {
      let result;
      if (currentAuthMode === "signup") {
        console.log("📝 Attempting signup for:", email);
        result = await window.authService.signUp(email, password, name);
      } else {
        console.log("🔐 Attempting sign in for:", email);
        result = await window.authService.signIn(email, password);
      }

      if (result.success) {
        console.log("✅ Authentication successful");
        window.authService.showSuccess(
          currentAuthMode === "signup"
            ? "✅ Account created successfully! Welcome!"
            : "✅ Signed in successfully! Welcome back!",
        );
        authForm.reset();

        // Close overlay after a short delay
        setTimeout(() => {
          toggleOverlay(profileOverlay, false);
        }, 1500);
      } else {
        console.error("❌ Authentication failed:", result.error);
        window.authService.showError(
          result.error || "Authentication failed. Please try again.",
        );
      }
    } catch (error) {
      console.error("❌ Auth error:", error);

      // Provide more specific error messages
      let errorMessage = "An unexpected error occurred. Please try again.";

      if (error.message?.includes("fetch")) {
        errorMessage = "Network error. Please check your internet connection.";
      } else if (error.message?.includes("timeout")) {
        errorMessage = "Request timed out. Please try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      window.authService.showError(errorMessage);
    } finally {
      // Re-enable submit button
      authSubmitBtn.disabled = false;
      authSubmitBtn.innerHTML = originalText;
    }
  });

  // Google Sign-In
  if (googleSigninBtn) {
    googleSigninBtn.addEventListener("click", async () => {
      if (!window.authService) {
        console.error("Auth service not initialized");
        return;
      }

      // Disable button and show loading state
      googleSigninBtn.disabled = true;
      const originalHTML = googleSigninBtn.innerHTML;
      googleSigninBtn.innerHTML = "<span>Signing in...</span>";

      try {
        const result = await window.authService.signInWithGoogle();

        if (result.success) {
          window.authService.showSuccess("Signed in with Google successfully!");
          // Close overlay after a short delay
          setTimeout(() => {
            toggleOverlay(profileOverlay, false);
          }, 1500);
        } else {
          window.authService.showError(result.error);
        }
      } catch (error) {
        console.error("Google sign-in error:", error);
        window.authService.showError(
          "Failed to sign in with Google. Please try again.",
        );
      } finally {
        // Re-enable button
        googleSigninBtn.disabled = false;
        googleSigninBtn.innerHTML = originalHTML;
      }
    });
  }

  // Sign Out
  if (signoutBtn) {
    signoutBtn.addEventListener("click", async () => {
      if (!window.authService) {
        console.error("Auth service not initialized");
        return;
      }

      // Disable button and show loading state
      signoutBtn.disabled = true;
      const originalText = signoutBtn.textContent;
      signoutBtn.textContent = "Signing out...";

      try {
        const result = await window.authService.signOut();

        if (result.success) {
          window.authService.showSuccess("Signed out successfully!");
          // Close overlay after a short delay
          setTimeout(() => {
            toggleOverlay(profileOverlay, false);
          }, 1500);
        } else {
          window.authService.showError(result.error);
        }
      } catch (error) {
        console.error("Sign out error:", error);
        window.authService.showError("Failed to sign out. Please try again.");
      } finally {
        // Re-enable button
        signoutBtn.disabled = false;
        signoutBtn.textContent = originalText;
      }
    });
  }

  // Reset Password (for logged-in users)
  const resetPasswordBtn = document.getElementById("reset-password-button");
  if (resetPasswordBtn) {
    resetPasswordBtn.addEventListener("click", async () => {
      if (!window.authService) {
        console.error("Auth service not initialized");
        return;
      }

      const currentUser = window.authService.getCurrentUser();
      if (!currentUser || !currentUser.email) {
        window.authService.showError("Unable to determine your email address.");
        return;
      }

      // Confirm action
      if (!confirm(`Send password reset link to ${currentUser.email}?`)) {
        return;
      }

      // Disable button and show loading state
      resetPasswordBtn.disabled = true;
      const originalText = resetPasswordBtn.textContent;
      resetPasswordBtn.textContent = "Sending...";

      try {
        const result = await window.authService.resetPassword(
          currentUser.email,
        );

        if (result.success) {
          window.authService.showSuccess(result.message);
        } else {
          window.authService.showError(result.error);
        }
      } catch (error) {
        console.error("Password reset error:", error);
        window.authService.showError(
          "Failed to send reset email. Please try again.",
        );
      } finally {
        // Re-enable button
        resetPasswordBtn.disabled = false;
        resetPasswordBtn.textContent = originalText;
      }
    });
  }

  // Profile Picture Management
  const changeAvatarBtn = document.getElementById("change-avatar-button");
  const avatarUploadInput = document.getElementById("avatar-upload-input");
  const deleteAvatarBtn = document.getElementById("delete-avatar-button");
  const userAvatarImg = document.getElementById("user-avatar-img");
  const userAvatarDiv = document.getElementById("user-avatar");

  // Change/Upload Avatar
  if (changeAvatarBtn && avatarUploadInput) {
    changeAvatarBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      avatarUploadInput.click();
    });

    avatarUploadInput.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!window.dbService) {
        console.error("DB service not initialized");
        return;
      }

      // Show loading state
      changeAvatarBtn.disabled = true;
      changeAvatarBtn.innerHTML = `
        <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      `;

      try {
        const result = await window.dbService.uploadProfilePicture(file);

        if (result.success) {
          // Update UI with new avatar
          userAvatarImg.src = result.avatarUrl;
          userAvatarImg.classList.remove("hidden");
          userAvatarDiv.classList.add("hidden");
          deleteAvatarBtn.classList.remove("hidden");

          window.authService.showSuccess(
            "Profile picture updated successfully!",
          );
        } else {
          window.authService.showError(result.error);
        }
      } catch (error) {
        console.error("Avatar upload error:", error);
        window.authService.showError(
          "Failed to upload profile picture. Please try again.",
        );
      } finally {
        // Reset button state
        changeAvatarBtn.disabled = false;
        changeAvatarBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        `;
        // Clear file input
        avatarUploadInput.value = "";
      }
    });
  }

  // Delete Avatar
  if (deleteAvatarBtn) {
    deleteAvatarBtn.addEventListener("click", async () => {
      if (!window.dbService) {
        console.error("DB service not initialized");
        return;
      }

      if (!confirm("Are you sure you want to remove your profile picture?")) {
        return;
      }

      // Show loading state
      deleteAvatarBtn.disabled = true;
      const originalText = deleteAvatarBtn.textContent;
      deleteAvatarBtn.textContent = "Removing...";

      try {
        const result = await window.dbService.deleteProfilePicture();

        if (result.success) {
          // Update UI to show default avatar
          userAvatarImg.classList.add("hidden");
          userAvatarDiv.classList.remove("hidden");
          deleteAvatarBtn.classList.add("hidden");

          // Update avatar initial
          const currentUser = window.authService.getCurrentUser();
          const initial = (currentUser?.email?.[0] || "?").toUpperCase();
          userAvatarDiv.textContent = initial;

          window.authService.showSuccess(
            "Profile picture removed successfully!",
          );
        } else {
          window.authService.showError(result.error);
        }
      } catch (error) {
        console.error("Avatar delete error:", error);
        window.authService.showError(
          "Failed to remove profile picture. Please try again.",
        );
      } finally {
        // Re-enable button
        deleteAvatarBtn.disabled = false;
        deleteAvatarBtn.textContent = originalText;
      }
    });
  }

  // Forgot Password functionality
  const passwordResetModal = document.getElementById("password-reset-modal");
  const passwordResetForm = document.getElementById("password-reset-form");
  const cancelResetBtn = document.getElementById("cancel-reset-button");
  const resetEmailInput = document.getElementById("reset-email");

  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", () => {
      // Hide main auth form and show reset modal
      const authForm = document.getElementById("auth-form");
      authForm.classList.add("hidden");
      passwordResetModal.classList.remove("hidden");

      // Pre-fill with email if already entered
      const emailInput = document.getElementById("email");
      if (emailInput.value) {
        resetEmailInput.value = emailInput.value;
      }
    });
  }

  if (cancelResetBtn) {
    cancelResetBtn.addEventListener("click", () => {
      // Hide reset modal and show main auth form
      passwordResetModal.classList.add("hidden");
      const authForm = document.getElementById("auth-form");
      authForm.classList.remove("hidden");

      // Clear reset email input
      resetEmailInput.value = "";

      // Clear any error/success messages
      if (authErrorMsg) authErrorMsg.classList.add("hidden");
      if (authSuccessMsg) authSuccessMsg.classList.add("hidden");
    });
  }

  if (passwordResetForm) {
    passwordResetForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!window.authService) {
        console.error("Auth service not initialized");
        return;
      }

      const email = resetEmailInput.value.trim();

      if (!email) {
        window.authService.showError("Please enter your email address");
        return;
      }

      // Disable submit button and show loading state
      const sendResetBtn = document.getElementById("send-reset-button");
      sendResetBtn.disabled = true;
      const originalText = sendResetBtn.textContent;
      sendResetBtn.textContent = "Sending...";

      try {
        const result = await window.authService.resetPassword(email);

        if (result.success) {
          window.authService.showSuccess(result.message);

          // Reset form and hide modal after delay
          setTimeout(() => {
            passwordResetModal.classList.add("hidden");
            const authForm = document.getElementById("auth-form");
            authForm.classList.remove("hidden");
            resetEmailInput.value = "";
          }, 3000);
        } else {
          window.authService.showError(result.error);
        }
      } catch (error) {
        console.error("Password reset error:", error);
        window.authService.showError(
          "Failed to send reset email. Please try again.",
        );
      } finally {
        // Re-enable button
        sendResetBtn.disabled = false;
        sendResetBtn.textContent = originalText;
      }
    });
  }

  // Coordinate input handling
  const gpsTab = document.getElementById("gps-tab");
  const pluscodeTab = document.getElementById("pluscode-tab");
  const autoDetectBtn = document.getElementById("auto-detect-btn");
  const gpsInputContainer = document.getElementById("gps-input-container");
  const pluscodeInputContainer = document.getElementById(
    "pluscode-input-container",
  );
  const latInput = document.getElementById("latitude");
  const lngInput = document.getElementById("longitude");
  const plusCodeInput = document.getElementById("plus-code");
  const gpsHelper = document.getElementById("gps-helper");
  const pluscodeHelper = document.getElementById("pluscode-helper");
  const coordPreview = document.getElementById("coord-preview");
  const coordPreviewText = document.getElementById("coord-preview-text");

  let currentCoordMode = "gps"; // "gps" or "pluscode"
  let validatedCoords = null;

  // Tab switching
  gpsTab.addEventListener("click", () => {
    currentCoordMode = "gps";
    gpsTab.classList.remove("bg-zinc-800", "text-zinc-300");
    gpsTab.classList.add("bg-blue-600", "text-white");
    pluscodeTab.classList.add("bg-zinc-800", "text-zinc-300");
    pluscodeTab.classList.remove("bg-blue-600", "text-white");
    gpsInputContainer.classList.remove("hidden");
    pluscodeInputContainer.classList.add("hidden");
    gpsHelper.classList.remove("hidden");
    pluscodeHelper.classList.add("hidden");
    validateCoordinates();
  });

  pluscodeTab.addEventListener("click", () => {
    currentCoordMode = "pluscode";
    pluscodeTab.classList.remove("bg-zinc-800", "text-zinc-300");
    pluscodeTab.classList.add("bg-blue-600", "text-white");
    gpsTab.classList.add("bg-zinc-800", "text-zinc-300");
    gpsTab.classList.remove("bg-blue-600", "text-white");
    pluscodeInputContainer.classList.remove("hidden");
    gpsInputContainer.classList.add("hidden");
    pluscodeHelper.classList.remove("hidden");
    gpsHelper.classList.add("hidden");

    // If GPS coords exist, convert to Plus Code
    if (latInput.value && lngInput.value) {
      const lat = parseFloat(latInput.value);
      const lng = parseFloat(lngInput.value);
      if (!isNaN(lat) && !isNaN(lng)) {
        try {
          const plusCode = window.PlusCodeAPI.encode(lat, lng);
          plusCodeInput.value = plusCode;
        } catch (e) {
          console.error("Error converting to Plus Code:", e);
        }
      }
    }

    validateCoordinates();
  });

  // Auto-detect location
  autoDetectBtn.addEventListener("click", () => {
    if (!currentUserLocation) {
      alert("Location not available. Please allow location access.");
      return;
    }

    if (currentCoordMode === "gps") {
      // Fill GPS coordinates
      latInput.value = currentUserLocation.latitude.toFixed(6);
      lngInput.value = currentUserLocation.longitude.toFixed(6);
    } else {
      // Convert to Plus Code and fill
      try {
        const plusCode = window.PlusCodeAPI.encode(
          currentUserLocation.latitude,
          currentUserLocation.longitude,
        );
        plusCodeInput.value = plusCode;
      } catch (e) {
        console.error("Error generating Plus Code:", e);
        alert("Could not generate Plus Code from your location.");
        return;
      }
    }

    validateCoordinates();

    // Visual feedback
    autoDetectBtn.classList.add("bg-green-600", "text-white");
    setTimeout(() => {
      autoDetectBtn.classList.remove("bg-green-600", "text-white");
    }, 1000);
  });

  // Validate coordinates on input
  latInput.addEventListener("input", validateCoordinates);
  lngInput.addEventListener("input", validateCoordinates);
  plusCodeInput.addEventListener("input", validateCoordinates);

  function validateCoordinates() {
    if (currentCoordMode === "gps") {
      const lat = parseFloat(latInput.value);
      const lng = parseFloat(lngInput.value);

      if (
        !isNaN(lat) &&
        !isNaN(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      ) {
        validatedCoords = { latitude: lat, longitude: lng };
        coordPreview.classList.remove("hidden");
        coordPreviewText.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      } else {
        validatedCoords = null;
        coordPreview.classList.add("hidden");
      }
    } else {
      const plusCode = plusCodeInput.value.trim().toUpperCase();

      try {
        // Validate using Open Location Code library
        if (window.PlusCodeAPI && window.PlusCodeAPI.isValid(plusCode)) {
          // Decode Plus Code to lat/lng for database storage
          const codeArea = window.PlusCodeAPI.decode(plusCode);
          const lat = codeArea.latitudeCenter;
          const lng = codeArea.longitudeCenter;

          // Store as lat/lng for uniform database storage
          validatedCoords = {
            latitude: lat,
            longitude: lng,
            plusCode: plusCode,
          };

          coordPreview.classList.remove("hidden");
          coordPreviewText.textContent = `${plusCode} → ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        } else {
          validatedCoords = null;
          coordPreview.classList.add("hidden");
        }
      } catch (e) {
        // Invalid Plus Code
        console.error("Plus Code validation error:", e);
        validatedCoords = null;
        coordPreview.classList.add("hidden");
      }
    }
  }

  // Photo preview handling
  const photoInput = document.getElementById("place-photos");
  const photoPreviewsContainer = document.getElementById("photo-previews");
  let selectedPhotos = [];

  photoInput.addEventListener("change", (e) => {
    const files = Array.from(e.target.files);

    // Limit to 5 photos
    if (files.length > 5) {
      alert("Maximum 5 photos allowed. Only the first 5 will be used.");
      selectedPhotos = files.slice(0, 5);
    } else {
      selectedPhotos = files;
    }

    // Show previews
    photoPreviewsContainer.innerHTML = "";
    photoPreviewsContainer.classList.remove("hidden");

    selectedPhotos.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const previewDiv = document.createElement("div");
        previewDiv.className = "relative group";
        previewDiv.innerHTML = `
          <img src="${event.target.result}" class="w-full h-24 object-cover rounded-lg border-2 border-zinc-700" alt="Preview ${index + 1}">
          <button type="button" class="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" data-index="${index}">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        `;

        // Remove photo on click
        previewDiv.querySelector("button").addEventListener("click", () => {
          selectedPhotos.splice(index, 1);
          photoInput.value = ""; // Reset input
          if (selectedPhotos.length === 0) {
            photoPreviewsContainer.classList.add("hidden");
          } else {
            // Re-render previews
            const event = new Event("change");
            Object.defineProperty(event, "target", {
              value: { files: selectedPhotos },
            });
            photoInput.dispatchEvent(event);
          }
        });

        photoPreviewsContainer.appendChild(previewDiv);
      };
      reader.readAsDataURL(file);
    });
  });

  // Contribute form submission
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

    // Coordinates are already validated and converted to lat/lng format
    // Both GPS input and Plus Code are stored uniformly as latitude/longitude

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
      formData.photos, // Pass photos array
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

  // Map button - recenter on user location
  recenterMapButton.addEventListener("click", () => {
    if (currentUserLocation) {
      updateMap(currentUserLocation);
    } else {
      alert("📍 Location not available. Please enable location permissions.");
    }
  });

  // Reset map orientation button
  const resetOrientationButton = document.getElementById(
    "reset-orientation-button",
  );
  if (resetOrientationButton) {
    resetOrientationButton.addEventListener("click", () => {
      if (map) {
        // Reset map to north orientation and default zoom
        map.setView(map.getCenter(), 13);
        console.log("🧭 Map orientation reset");
      }
    });
  }

  // Initial Renders
  renderInitialView();
  renderSearchRecommendations();
});
