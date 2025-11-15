# WiFi Locator Codebase Structure - Comprehensive Overview

## Project Overview
**WiFi Locator** is a web-based application that helps users find Wi-Fi hotspots with excellent connectivity. The app features a map interface, search functionality, user authentication, and allows users to contribute new hotspot locations.

**Tech Stack:**
- Frontend: HTML, CSS (Tailwind CSS), Vanilla JavaScript (ES6 modules)
- Map: Leaflet.js + OpenStreetMap tiles
- Backend/Database: Supabase (PostgreSQL + PostGIS for geolocation)
- Authentication: Supabase Auth (Email/Password & Google OAuth)
- Location Encoding: Plus Codes (Google's Open Location Code system)
- Storage: Supabase Storage for hotspot photos

---

## File Structure

```
C:\Users\ssnay\Documents\GitHub\Wifi-Locator\
├── index.html                 # Main HTML file with full UI structure
├── index.js                   # Main application logic and event handlers (1400+ lines)
├── styles.css                 # Custom CSS styling for dark theme and components
├── supabase-config.js         # Supabase initialization and configuration
├── supabase-auth.js           # Authentication service class
├── supabase-db.js             # Database operations service class
├── package.json               # Project metadata and dependencies
├── biome.json                 # Code formatter/linter configuration
├── README.md                  # Project documentation
├── SUPABASE_SETUP.md          # Database setup instructions
└── .gitignore, metadata.json  # Git and project config files
```

---

## Core Components & Functionality

### 1. **Featured Places** (Currently Implemented)

**Location:** `index.js` (lines 105-119, 248-277)

**What it is:**
Featured Places are a curated set of popular location types displayed in the sidebar's initial view. They serve as quick search shortcuts.

**Current Implementation:**
```javascript
const featuredPlaces = [
  {
    name: "Artisan Roast Cafe",
    query: "Artisan Roast Cafe with wifi",
    category: "Coffee Shop",
    image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=500&auto=format&fit=crop",
  },
  {
    name: "Central City Library",
    query: "Central City Library with free wifi",
    category: "Library",
    image: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=500&auto=format&fit=crop",
  },
  {
    name: "Innovate Coworking Hub",
    query: "Innovate Coworking Hub with power outlets",
    category: "Coworking Space",
    image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=500&auto=format&fit=crop",
  },
];
```

**How Featured Places Render:**
1. Each featured place is displayed as a card with:
   - Background image
   - Place name and category badge
   - Hover effect (image scales up, background darkens)
   - Click handler that executes a search with the place's query

2. Rendered in `renderInitialView()` function as part of the sidebar initial state
3. Users can click on any featured place card to trigger a search

**UI Location:** Bottom section of the sidebar, below "Nearby Hotspots" section

---

### 2. **Search Functionality**

**Location:** `index.js` (lines 828-856)

**How it Works:**

#### Search Entry Points:
1. **Search Overlay Button** - Top right of map (magnifying glass icon)
2. **Search Input Field** - Search overlay modal with large search bar
3. **Filter Pills** - Quick filter buttons (Coffee Shops, Libraries, Coworking, Free Wi-Fi, Quiet Places)
4. **Featured Places Cards** - Click any featured place to search
5. **Recommendation Pills** - Suggested searches in the search overlay

#### Search Execution Flow:
```javascript
const executeSearch = (query) => {
  // 1. Close overlays
  if (window.innerWidth < 768) {
    toggleSidebar(false);
  }
  toggleOverlay(searchOverlay, false);
  
  // 2. Execute search with 300ms delay for animation
  setTimeout(() => handleSearch(query), 300);
};

const handleSearch = (query) => {
  // 1. Check if user location is available
  if (!currentUserLocation) {
    sidebarContent.innerHTML = renderError(
      "Could not get your location. Please enable location services..."
    );
    return;
  }
  
  // 2. Show spinner while searching
  isLoading = true;
  sidebarContent.innerHTML = renderSpinner();
  
  // 3. Simulate search (currently returns MOCK_PLACES)
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

**Current Limitations:**
- Search currently uses **MOCK DATA** (hardcoded 3 places)
- Returns static results regardless of actual query
- Does NOT search the database of user-contributed hotspots
- Location-aware but results are hardcoded

**Search Results Display:**
- Shows summary message
- Renders list of location cards with:
  - Place title and external link icon
  - Up to 2 review snippets per place
  - Links to OpenStreetMap

---

### 3. **Places Fetching from Database**

**Location:** `supabase-db.js` (lines 17-107)

**Main Function: `getLiveHotspots()`**

**What it does:**
Fetches all Wi-Fi hotspots that have been contributed by users from the Supabase database.

```javascript
async getLiveHotspots() {
  try {
    // Calls RPC function to get all hotspots with coordinates, creator info, and photos
    const { data: hotspotData, error: hotspotError } =
      await this.supabase.rpc("get_all_hotspots_with_coords");
    
    if (hotspotError) throw hotspotError;
    
    // Process rows and group by hotspot ID (handling LEFT JOIN with photos)
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
          photos: [],
          first_photo_path: null,
        });
      }
      
      // Add photos to this hotspot
      if (row.photo_id) {
        const hotspot = hotspotsMap.get(row.id);
        hotspot.photos.push({
          id: row.photo_id,
          storage_path: row.storage_path,
          display_order: row.display_order,
        });
      }
    });
    
    // Convert to array and sort photos
    const hotspots = Array.from(hotspotsMap.values()).map((spot) => {
      spot.photos.sort((a, b) => a.display_order - b.display_order);
      spot.first_photo_path = spot.photos[0]?.storage_path || null;
      return spot;
    });
    
    return { success: true, data: hotspots };
  } catch (error) {
    console.error("Error fetching live hotspots:", error);
    return { success: false, error: error.message };
  }
}
```

**Related Database Functions:**

1. **`getHotspotsInBounds(minLat, maxLat, minLng, maxLng)`**
   - Fetches hotspots within a geographic bounding box
   - Useful for map viewport optimization
   - Falls back to `getLiveHotspots()` if RPC fails

2. **`createHotspot(name, latitude, longitude, addressText, photos)`**
   - Creates a new hotspot entry
   - Converts coordinates to PostGIS WKT format
   - Handles photo uploads
   - Returns success/error response

**Database Schema (Implied):**
```
hotspots table:
- id (primary key)
- name (text)
- location (PostGIS geography/geometry)
- address_text (text)
- created_by (user ID)
- created_at (timestamp)

hotspot_photos table:
- id (primary key)
- hotspot_id (foreign key)
- storage_path (text)
- display_order (integer)
- uploaded_by (user ID)

profiles table:
- id (user ID)
- username (text)
- points (integer)
```

---

### 4. **Main Components & Pages Structure**

#### 4.1 **Map Component**

**Location:** `index.html` (lines 400-650 approx), `index.js` (lines 320-450)

**Features:**
- **Library:** Leaflet.js with OpenStreetMap tiles
- **Dark Theme:** CSS filter inversion applied to tiles
- **Interactive Elements:**
  - Zoom controls (top-left in custom position)
  - Attribution control
  - Custom coordinate extraction for PostGIS

**Map Initialization:**
```javascript
const initMap = () => {
  map = L.map("map", {
    zoomControl: false,
    attributionControl: true,
  }).setView([18.5204, 73.8567], 13); // Default: Pune, India
  
  // OpenStreetMap tiles with dark inversion
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);
  
  // Add custom zoom control
  L.control.zoom({ position: "bottomleft" }).addTo(map);
  
  // Load hotspots from database
  loadHotspots();
};
```

**Markers:**
- Custom blue gradient markers with WiFi icon
- Responsive scaling based on zoom level
- Pulsing animation on user location marker
- Click opens detailed popup with hotspot info

**Zoom Responsiveness:**
- Markers and popups scale with zoom level
- Zoom 5-8: Small (0.4 scale)
- Zoom 16-18: Normal (1.0 scale)

#### 4.2 **Sidebar Component**

**Location:** `index.html` (lines 35-95), `index.js` (lines 240-300)

**States:**
1. **Initial View** (Landing)
   - Quick Filter Pills (Coffee Shops, Libraries, etc.)
   - Nearby Hotspots Section
   - Featured Places Cards

2. **Search Results View**
   - Back button to return to initial view
   - List of search results with place cards

3. **Mobile Responsive:**
   - Hidden by default on small screens
   - Toggle with hamburger menu button
   - Full-width overlay behavior

**Key Functions:**
- `renderInitialView()` - Displays filters, nearby hotspots, featured places
- `renderResults(result)` - Shows search results
- `toggleSidebar(show)` - Show/hide sidebar with animation

#### 4.3 **Search Overlay Component**

**Location:** `index.html` (lines 665-745)

**Features:**
- Full-screen dark overlay with blur effect
- Large centered search input with icon
- Recommendation pills below search
- Close button (top-right)
- Triggered by search button on map

**Structure:**
```
Search Overlay
├── Close button
├── "Where to?" heading
├── Search input field
└── Recommendation pills (suggested searches)
```

#### 4.4 **Profile/Auth Overlay Component**

**Location:** `index.html` (lines 750-1050)

**States:**
1. **Not Logged In:**
   - Segmented control: Sign In | Sign Up tabs
   - Email and password fields
   - Google OAuth button
   - Error/Success messages

2. **Logged In:**
   - User avatar and name/email display
   - Sign Out button

**Auth Flow:**
- `signIn(email, password)` - Email/password authentication
- `signUp(email, password, fullName)` - New account creation
- `signInWithGoogle()` - OAuth login
- Profile automatically created on signup

**Location:** `supabase-auth.js`

#### 4.5 **Contribute Overlay Component**

**Location:** `index.html` (lines 1050-1350), `index.js` (lines 1100-1400)

**Form Fields:**
1. **Basic Info:**
   - Place Name (required)
   - Address (required)

2. **Location Coordinates (required, choose one method):**
   - GPS Coordinates: Latitude + Longitude inputs
   - Plus Code: Google Plus Code input
   - Auto-detect: Current location button (📡)
   - Coordinate preview with validation

3. **Wi-Fi Details:**
   - Wi-Fi Type: Free & Open | Password Protected | For Customers Only
   - Category: Coffee Shop | Library | Coworking | Cafe | Restaurant | Hostel | Other

4. **Additional Info:**
   - Notes (optional)
   - Photos (optional, max 5)

**Photo Handling:**
- File input with preview thumbnails
- Remove individual photo buttons
- Max 5 photos enforced
- Uploaded to Supabase Storage with display order

**Form Submission:**
```javascript
contributeForm.addEventListener("submit", async (e) => {
  // 1. Check authentication
  if (!window.authService.isSignedIn()) {
    // Redirect to login
  }
  
  // 2. Validate coordinates
  if (!validatedCoords) {
    alert("Please enter valid GPS coordinates or Plus Code.");
  }
  
  // 3. Create hotspot with photos
  const result = await window.dbService.createHotspot(
    formData.name,
    formData.latitude,
    formData.longitude,
    formData.address,
    formData.photos
  );
  
  // 4. Add marker to map immediately
  // 5. Reset form and close overlay
});
```

---

## Data Flow Architecture

### Feature: Viewing Hotspots on Map

```
1. Page Load
   ↓
2. Get User Location (geolocation API)
   ↓
3. Initialize Map (Leaflet)
   ↓
4. loadHotspots()
   ├─→ window.dbService.getLiveHotspots()
   │   └─→ Supabase RPC: get_all_hotspots_with_coords
   │       ├─→ Returns: hotspots with coordinates, creator info, photos
   │       └─→ Client-side: Group rows by hotspot ID, collect photos
   │
   └─→ For each hotspot:
       ├─→ Create custom marker (WiFi icon, blue gradient)
       ├─→ Generate popup content with hotspot details
       ├─→ Bind popup to marker
       └─→ Add marker to map
   
5. updateNearbyHotspots()
   ├─→ Get user location
   ├─→ Calculate distance to each hotspot (Haversine formula)
   ├─→ Sort by distance, show top 5
   └─→ Render in sidebar "Nearby Hotspots" section
```

### Feature: Contributing a Location

```
1. User clicks "Contribute" button
   ↓
2. Contribute overlay opens with form
   ↓
3. User fills form and submits
   ↓
4. Client-side validation:
   ├─→ Check if signed in → redirect to auth if needed
   ├─→ Validate coordinates (GPS or Plus Code)
   └─→ Validate all required fields
   
5. Create hotspot: window.dbService.createHotspot()
   ├─→ Get current user ID
   ├─→ Ensure user profile exists
   ├─→ Convert coordinates to PostGIS WKT format
   ├─→ Insert into hotspots table
   └─→ Return hotspot ID
   
6. Upload photos (if provided)
   ├─→ window.dbService.uploadHotspotPhotos()
   │   ├─→ Upload each file to Supabase Storage: hotspot-photos/{hotspotId}/{timestamp}_{index}
   │   └─→ Save photo references in hotspot_photos table
   │
   └─→ Award user 10 points
   
7. Add marker to map immediately
   ├─→ Create custom marker at submitted coordinates
   ├─→ Pan map to new marker location
   └─→ Open popup
   
8. Reset form and close overlay
```

### Feature: Searching for Places

```
1. User types in search input or clicks filter/featured place
   ↓
2. executeSearch(query)
   ├─→ Close overlays
   └─→ Call handleSearch(query) with delay
   
3. handleSearch(query)
   ├─→ Check if user location available
   ├─→ Show spinner in sidebar
   ├─→ Simulate network delay (1 second)
   │
   └─→ Return MOCK_PLACES (currently hardcoded, not database)
   
4. renderResults(result)
   ├─→ Show back button
   ├─→ Render summary message
   └─→ Render location cards with reviews
```

---

## Key Services & Classes

### 1. **SupabaseAuthService** (`supabase-auth.js`)

**Methods:**
- `initialize()` - Initialize with Supabase client
- `signUp(email, password, fullName)` - Create account and profile
- `signIn(email, password)` - Email/password login
- `signInWithGoogle()` - OAuth login
- `createUserProfile(userId, username)` - Create profile entry
- `signOut()` - Logout user
- `getCurrentUser()` - Get current authenticated user
- `isSignedIn()` - Check if user logged in
- `onAuthStateChanged(callback)` - Subscribe to auth changes

**Window Reference:** `window.authService`

### 2. **SupabaseDBService** (`supabase-db.js`)

**Hotspot Methods:**
- `getLiveHotspots()` - Get all user-contributed hotspots
- `getHotspotsInBounds(minLat, maxLat, minLng, maxLng)` - Get hotspots in region
- `createHotspot(name, latitude, longitude, addressText, photos)` - Add new hotspot
- `uploadHotspotPhotos(hotspotId, photos, userId)` - Upload photos to storage
- `ensureProfileExists(user)` - Create profile if missing

**Report Methods:**
- `submitReport(hotspotId, reportData)` - Submit speed/security report
- `getMyReports()` - Get user's submitted reports

**Profile Methods:**
- `getUserProfile(userId)` - Get user profile data
- `awardPoints(userId, points)` - Award gamification points

**Utility Methods:**
- `getPhotoUrl(storagePath)` - Get public URL for photo
- `extractLatitude(location)` - Extract latitude from PostGIS
- `extractLongitude(location)` - Extract longitude from PostGIS

**Window Reference:** `window.dbService`

### 3. **Plus Code API** (Inline in `index.html`)

**Methods:**
- `encode(latitude, longitude, codeLength)` - Convert GPS to Plus Code
- `decode(code)` - Convert Plus Code to GPS coordinates
- `isValid(code)` - Validate Plus Code format

**Window Reference:** `window.PlusCodeAPI`

---

## UI/UX Features

### Responsive Design
- **Desktop (md+):** Sidebar visible, full layout
- **Mobile (<md):** Sidebar hidden, toggle with menu button

### Color Scheme (Dark Theme)
- Primary: Blue (#2563eb, #3b82f6)
- Background: Zinc gray (#18181b, #27272a, #3f3f46)
- Text: Light gray/white (#f5f5f5, #d4d4d8)
- Accents: Blue, green (success), red (error)

### Interactive Elements
- **Buttons:** Hover effects, focus rings, smooth transitions
- **Cards:** Border highlights on hover, background color changes
- **Overlays:** Blur backdrop, fade-in/out transitions
- **Markers:** Pulsing animation, scale on zoom

---

## Current Limitations & TODOs

### Search Functionality
- [ ] Currently returns MOCK data, not actual database search
- [ ] No integration with Supabase database for search results
- [ ] Filter pills (Coffee Shops, Libraries) don't filter actual hotspots
- [ ] Featured places are hardcoded, not dynamic

### Missing Features
- [ ] User profile/dashboard page
- [ ] View detailed hotspot information
- [ ] Rate/review submitted hotspots
- [ ] Gamification system (leaderboards, badges)
- [ ] Photo gallery for hotspots
- [ ] Real-time location updates
- [ ] Offline map support

### Potential Improvements
- [ ] Add search suggestions/autocomplete
- [ ] Implement backend search with filters
- [ ] Add distance/popularity sorting
- [ ] Enhanced photo uploads (drag-drop, compression)
- [ ] Hotspot verification system
- [ ] Report spam/inactive hotspots

---

## Database Integration Points

**RPC Functions Used:**
- `get_all_hotspots_with_coords` - Fetch all hotspots with photos and creator info
- `get_hotspots_in_bounds` - Fetch hotspots within bounding box
- `increment_user_points` - Award points to users

**Tables Used:**
- `hotspots` - Main hotspot data
- `hotspot_photos` - Photo references with storage paths
- `profiles` - User profiles and gamification points
- `reports` - Speed/security reports for hotspots

**Storage Buckets:**
- `hotspot-photos` - User-uploaded hotspot images

---

## Getting Started with Development

### Key Files to Modify:
1. **For search functionality:** `index.js` lines 828-856 (handleSearch, executeSearch)
2. **For featured places:** `index.js` lines 105-119 (featuredPlaces array)
3. **For adding features:** `supabase-db.js` (add database query methods)
4. **For UI changes:** `index.html` (structure) + `styles.css` (styling)

### Common Tasks:

**Add new Featured Place:**
```javascript
// In index.js, add to featuredPlaces array
{
  name: "Your Place Name",
  query: "Search query here",
  category: "Place Type",
  image: "https://image-url.com/image.jpg",
}
```

**Add new database query:**
```javascript
// In supabase-db.js
async getMyCustomData() {
  try {
    const { data, error } = await this.supabase
      .from("table_name")
      .select("*")
      .eq("column", "value");
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

**Connect search to database:**
Replace MOCK_PLACES in handleSearch with actual database query to filter hotspots by name/category.

---

## Summary

The WiFi Locator app is a **full-stack location-sharing application** with these core features:
- **Map Display:** Leaflet-based map showing contributed Wi-Fi hotspots
- **Featured Places:** Quick search shortcuts displayed in sidebar
- **Search:** Query-based search with filter pills (currently mock data)
- **Contribute:** User form to add new hotspot locations with photos
- **Authentication:** Email/password and Google OAuth via Supabase
- **Database:** PostgreSQL with PostGIS for geographic queries
- **Gamification:** Points system for contributions and reports

The next major development priority should be **integrating the search functionality with the actual Supabase database** to return real results instead of mock data.
