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
  console.log("All services initialized");

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
  const featuredPlaces = [
    {
      name: "Artisan Roast Cafe",
      query: "Artisan Roast Cafe with wifi",
      category: "Coffee Shop",
      image:
        "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=500&auto=format&fit=crop",
    },
    {
      name: "Central City Library",
      query: "Central City Library with free wifi",
      category: "Library",
      image:
        "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=500&auto=format&fit=crop",
    },
    {
      name: "Innovate Coworking Hub",
      query: "Innovate Coworking Hub with power outlets",
      category: "Coworking Space",
      image:
        "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=500&auto=format&fit=crop",
    },
  ];
  const recommendationPills = [
    "Quiet cafes with fast Wi-Fi",
    "Places to work with power outlets",
    "24/7 study spots",
    "Libraries with free internet",
    "Coffee shops nearby",
  ];

  const MOCK_PLACES = [
    {
      maps: {
        title: "The Daily Grind",
        uri: "https://www.openstreetmap.org/",
        placeAnswerSources: {
          reviewSnippets: [
            {
              text: "Great coffee and reliable Wi-Fi for working.",
              author: "Jane D.",
            },
            {
              text: "Can get a bit crowded, but the atmosphere is nice.",
              author: "John S.",
            },
          ],
        },
      },
    },
    {
      maps: {
        title: "City Central Library",
        uri: "https://www.openstreetmap.org/",
        placeAnswerSources: {
          reviewSnippets: [
            {
              text: "Very quiet and the internet is super fast and free.",
              author: "Alice W.",
            },
          ],
        },
      },
    },
    {
      maps: {
        title: "Co-Work & Create",
        uri: "https://www.openstreetmap.org/",
        placeAnswerSources: {
          reviewSnippets: [],
        },
      },
    },
  ];

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

  const renderLocationCard = (place) => `
        <div class="bg-zinc-800 p-4 rounded-xl border border-zinc-700/80 hover:border-zinc-600 hover:bg-zinc-700/50 transition-all group">
            <div class="flex justify-between items-start">
                <div class="flex items-start space-x-3">
                    <div class="flex-shrink-0 pt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <div><h3 class="font-semibold text-gray-100">${place.title}</h3></div>
                </div>
                <a href="${place.uri}" target="_blank" rel="noopener noreferrer" class="p-1.5 rounded-full text-zinc-400 group-hover:text-blue-400 group-hover:bg-zinc-600/50 transition-colors" aria-label="Open in Maps">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002 2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
            </div>
            ${(place.placeAnswerSources?.reviewSnippets || [])
              .slice(0, 2)
              .map(
                (snippet) => `
                <div class="mt-3 pl-8 border-l-2 border-zinc-600 pl-3">
                    <p class="text-sm text-zinc-300 italic">"${snippet.text}"</p>
                    <p class="text-xs text-zinc-400 text-right mt-1">- ${snippet.author}</p>
                </div>
            `,
              )
              .join("")}
        </div>`;

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
      .map(
        (place) => `
            <button data-query="${place.query}" class="featured-place w-full text-left rounded-lg overflow-hidden bg-zinc-800 hover:bg-zinc-700/70 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 group">
                <div class="relative h-24">
                    <img src="${place.image}" alt="${place.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <span class="absolute bottom-2 right-2 bg-blue-600/90 text-white text-xs font-semibold px-2 py-0.5 rounded-full">${place.category}</span>
                </div>
                <div class="p-3"><p class="font-semibold text-zinc-100">${place.name}</p></div>
            </button>
        `,
      )
      .join("");

    sidebarContent.innerHTML = `
            <div class="space-y-8">
                <div>
                    <h3 class="text-sm font-semibold text-zinc-400 px-1 mb-3">Quick Filters</h3>
                    <div class="flex flex-wrap gap-2">${filtersHTML}</div>
                </div>
                <div>
                    <h3 class="text-sm font-semibold text-zinc-400 px-1 mb-3">Featured Places</h3>
                    <div class="space-y-3">${featuredHTML}</div>
                </div>
            </div>`;

    document.querySelectorAll(".filter-pill, .featured-place").forEach((el) => {
      el.addEventListener("click", (e) =>
        executeSearch(e.currentTarget.dataset.query),
      );
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

    // Load existing hotspots from database
    loadHotspots();
  };

  // Load and display hotspots from database
  const loadHotspots = async () => {
    try {
      const result = await window.dbService.getLiveHotspots();

      if (result.success && result.data) {
        console.log(`Loaded ${result.data.length} hotspots from database`);

        result.data.forEach((hotspot) => {
          if (hotspot.latitude && hotspot.longitude) {
            // Create custom marker for hotspot
            const marker = L.marker([hotspot.latitude, hotspot.longitude], {
              icon: L.divIcon({
                className: "custom-marker",
                html: `<div class="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl shadow-lg transition-colors cursor-pointer border-2 border-white">📶</div>`,
                iconSize: [40, 40],
                iconAnchor: [20, 20],
              }),
            }).addTo(map);

            // Get creator info (username or email)
            const creatorName =
              hotspot.created_by_username ||
              hotspot.created_by_email ||
              "Anonymous";

            // Create popup with hotspot info
            const popupContent = `
              <div class="p-3 min-w-[200px]">
                <h3 class="font-bold text-lg text-zinc-900 mb-1">${hotspot.name || "Wi-Fi Hotspot"}</h3>
                ${hotspot.address_text ? `<p class="text-sm text-zinc-600 mb-2">📍 ${hotspot.address_text}</p>` : ""}

                <div class="space-y-1 text-xs text-zinc-700">
                  ${hotspot.avg_speed_score ? `<p>⚡ Speed: ${getSpeedLabel(hotspot.avg_speed_score)}</p>` : ""}
                  ${hotspot.noise_level ? `<p>🔊 Noise: ${hotspot.noise_level}</p>` : ""}
                  ${hotspot.security_rating ? `<p>🔒 Security: ${hotspot.security_rating}</p>` : ""}
                </div>

                <div class="mt-3 pt-2 border-t border-zinc-200">
                  <p class="text-xs text-zinc-500">Added by: <span class="font-medium">${creatorName}</span></p>
                  ${hotspot.created_at ? `<p class="text-xs text-zinc-400">${formatDate(hotspot.created_at)}</p>` : ""}
                </div>

                <button class="mt-3 w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors" onclick="viewHotspotDetails(${hotspot.id})">
                  View Details
                </button>
              </div>
            `;

            marker.bindPopup(popupContent, {
              maxWidth: 300,
              className: "custom-popup",
            });
          }
        });
      }
    } catch (error) {
      console.error("Error loading hotspots:", error);
    }
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

  // Geolocation
  if (navigator.geolocation) {
    console.log("Requesting geolocation...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("Geolocation success:", position.coords);
        console.log("Latitude:", position.coords.latitude);
        console.log("Longitude:", position.coords.longitude);
        console.log("Accuracy:", position.coords.accuracy, "meters");

        currentUserLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        // Show coordinates in sidebar temporarily for debugging
        sidebarContent.innerHTML = `
          <div class="space-y-4 p-4">
            <div class="bg-zinc-800 p-4 rounded-lg">
              <h3 class="font-semibold text-zinc-100 mb-2">📍 Your Location</h3>
              <p class="text-sm text-zinc-300">Lat: ${position.coords.latitude.toFixed(6)}</p>
              <p class="text-sm text-zinc-300">Lon: ${position.coords.longitude.toFixed(6)}</p>
              <p class="text-sm text-zinc-400 mt-2">Accuracy: ±${Math.round(position.coords.accuracy)}m</p>
            </div>
          </div>
        `;

        updateMap(currentUserLocation);

        // Render initial view after a delay so user can see coordinates
        setTimeout(() => renderInitialView(), 3000);
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
    renderInitialView();
  }

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
  loginTab.addEventListener("click", () => {
    currentAuthMode = "login";
    segmentedControlBg.style.transform = "translateX(0%)";
    loginTab.classList.remove("text-zinc-400");
    loginTab.classList.add("text-zinc-100");
    signupTab.classList.add("text-zinc-400");
    signupTab.classList.remove("text-zinc-100");
    nameField.classList.add("hidden");
    nameField.querySelector("input").required = false;
    authSubmitBtn.textContent = "Sign In";
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
    authSubmitBtn.textContent = "Create Account";
    // Clear error messages
    if (authErrorMsg) authErrorMsg.classList.add("hidden");
    if (authSuccessMsg) authSuccessMsg.classList.add("hidden");
  });

  // Auth form submission (Email/Password)
  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!window.authService) {
      console.error("Auth service not initialized");
      return;
    }

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const name = document.getElementById("name").value;

    // Disable submit button and show loading state
    authSubmitBtn.disabled = true;
    const originalText = authSubmitBtn.textContent;
    authSubmitBtn.textContent = "Please wait...";

    try {
      let result;
      if (currentAuthMode === "signup") {
        result = await window.authService.signUp(email, password, name);
      } else {
        result = await window.authService.signIn(email, password);
      }

      if (result.success) {
        window.authService.showSuccess(
          currentAuthMode === "signup"
            ? "Account created successfully!"
            : "Signed in successfully!",
        );
        authForm.reset();
        // Close overlay after a short delay
        setTimeout(() => {
          toggleOverlay(profileOverlay, false);
        }, 1500);
      } else {
        window.authService.showError(result.error);
      }
    } catch (error) {
      console.error("Auth error:", error);
      window.authService.showError(
        "An unexpected error occurred. Please try again.",
      );
    } finally {
      // Re-enable submit button
      authSubmitBtn.disabled = false;
      authSubmitBtn.textContent = originalText;
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
          const plusCode = window.OpenLocationCode.encode(lat, lng);
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
        const plusCode = window.OpenLocationCode.encode(
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
        if (
          window.OpenLocationCode &&
          window.OpenLocationCode.isValid(plusCode)
        ) {
          // Decode Plus Code to lat/lng for database storage
          const codeArea = window.OpenLocationCode.decode(plusCode);
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

    console.log("Contribution submitted:", formData);

    // Submit to database
    const result = await window.dbService.createHotspot(
      formData.name,
      formData.latitude,
      formData.longitude,
      formData.address,
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
    }
  });

  // Initial Renders
  renderInitialView();
  renderSearchRecommendations();
});
