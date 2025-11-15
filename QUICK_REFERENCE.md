# WiFi Locator - Quick Reference Guide

## File Locations Quick Map

```
index.html          - Complete HTML structure, all UI elements
index.js            - Main application logic (1400+ lines)
                     ├─ Featured Places: lines 105-119
                     ├─ Search: lines 828-856
                     ├─ Map Init: lines 320-450
                     ├─ Nearby Hotspots: lines 450-600
                     └─ Contribute Form: lines 1100-1400

styles.css          - Dark theme CSS, custom components
supabase-config.js  - Initialize Supabase client
supabase-auth.js    - Authentication class (signup/login)
supabase-db.js      - Database operations (fetch/create hotspots)
```

---

## Featured Places Location

**File:** `C:\Users\ssnay\Documents\GitHub\Wifi-Locator\index.js`
**Lines:** 105-119 (definition), 248-277 (rendering)

**Quick Access:**
- Search for: `const featuredPlaces = [`
- Currently has 3 hardcoded places:
  1. Artisan Roast Cafe (Coffee Shop)
  2. Central City Library (Library)
  3. Innovate Coworking Hub (Coworking Space)

**To Add/Edit:**
```javascript
// Line ~105
const featuredPlaces = [
  {
    name: "Place Name",
    query: "Search query",
    category: "Category Type",
    image: "https://image-url.jpg",
  },
  // ... more places
];
```

**How It Renders:**
- Each card shows: Image + Name + Category badge
- Click triggers search with the `query` value
- Located in sidebar under "Featured Places" section

---

## Search Functionality Location

**File:** `C:\Users\ssnay\Documents\GitHub\Wifi-Locator\index.js`
**Key Functions:**
- `executeSearch(query)` - Line 849
- `handleSearch(query)` - Line 828

**Current Behavior:**
1. Shows spinner for 1 second
2. Returns MOCK_PLACES (hardcoded 3 places)
3. Ignores actual query parameter
4. Does NOT search database

**Search Entry Points:**
- Search overlay input (search button on map)
- Filter pills (Coffee Shops, Libraries, etc.)
- Featured places cards
- Recommendation pills in search overlay

**Mock Data Location:**
- Lines 155-200 in index.js
- `MOCK_PLACES` array with 3 hardcoded places

---

## Places Fetching from Database

**File:** `C:\Users\ssnay\Documents\GitHub\Wifi-Locator\supabase-db.js`

**Main Function:** `getLiveHotspots()` (lines 17-107)
- Gets all user-contributed hotspots
- Includes creator username, photos, coordinates
- Called when map loads and when checking nearby hotspots

**Other Fetch Functions:**
- `getHotspotsInBounds()` - Geographic bounding box query
- `getUserProfile()` - Get user profile data
- `getMyReports()` - Get user's submitted reports

**Usage Example:**
```javascript
const result = await window.dbService.getLiveHotspots();
if (result.success) {
  const hotspots = result.data; // Array of hotspot objects
  // Each hotspot has: id, name, latitude, longitude, photos, created_by_username
}
```

---

## Main Components Map

```
LAYOUT STRUCTURE
├─ Sidebar (Left Panel)
│  ├─ Header: "Wi-Fi Locator" logo
│  ├─ Content Area:
│  │  ├─ Initial View:
│  │  │  ├─ Quick Filters (Pills)
│  │  │  ├─ Nearby Hotspots (List)
│  │  │  └─ Featured Places (Cards with images)
│  │  └─ Search Results View:
│  │     └─ Location Cards (Title, Reviews, Link)
│  └─ Footer: Copyright notice
│
├─ Main Map Area
│  ├─ Leaflet Map with Markers
│  ├─ Top-left: Menu button (mobile only)
│  ├─ Top-right: Profile, Search, Recenter buttons
│  ├─ Bottom-right: Contribute button
│  └─ Custom Markers: WiFi icon, blue gradient, responsive zoom
│
└─ Full-Screen Overlays (z-index 2000)
   ├─ Search Overlay
   │  ├─ "Where to?" heading
   │  ├─ Search input field
   │  └─ Recommendation pills
   │
   ├─ Profile/Auth Overlay
   │  ├─ Sign In / Sign Up tabs
   │  ├─ Email & password fields
   │  ├─ Google OAuth button
   │  └─ User info (when logged in)
   │
   └─ Contribute Overlay
      ├─ Place name & address
      ├─ Location (GPS or Plus Code)
      ├─ Wi-Fi type & category
      └─ Photo upload with previews
```

---

## Component Details

### Sidebar Component
**HTML:** Lines 35-95 in index.html
**Functions:**
- `renderInitialView()` - Show filters, nearby, featured places
- `renderResults(result)` - Show search results
- `toggleSidebar(show)` - Toggle visibility
- `updateNearbyHotspots()` - Refresh nearby list

### Map Component
**HTML:** Lines 380-650 in index.html
**Functions:**
- `initMap()` - Initialize Leaflet
- `loadHotspots()` - Load and display markers
- `updateMap(location)` - Pan to location
- `generatePopupContent(hotspot)` - Create popup HTML
- `updateNearbyHotspots()` - Calculate distances

### Search Overlay
**HTML:** Lines 665-745 in index.html
**Functions:**
- `executeSearch(query)` - Trigger search
- `handleSearch(query)` - Process search
- `renderResults(result)` - Display results

### Profile/Auth Overlay
**HTML:** Lines 750-1050 in index.html
**Services:** `window.authService` (supabase-auth.js)
**Functions:**
- `signUp(email, password, name)`
- `signIn(email, password)`
- `signInWithGoogle()`
- `signOut()`

### Contribute Overlay
**HTML:** Lines 1050-1350 in index.html
**Services:** `window.dbService` (supabase-db.js)
**Functions:**
- Form validation
- `createHotspot(...)` - Save to database
- `uploadHotspotPhotos(...)` - Upload images
- Photo preview handling

---

## State Variables (Global in index.js)

```javascript
let currentUserLocation = null;          // User's GPS location
let isLoading = false;                   // Loading indicator
let map = null;                          // Leaflet map instance
let userMarker = null;                   // User location marker
let isShowingResults = false;            // Sidebar state
let currentAuthMode = "login";           // Auth UI state
let selectedPhotos = [];                 // Contribute form photos
let validatedCoords = null;              // Validated GPS/Plus Code
window.hotspotsMarkers = [];             // All hotspot markers
```

---

## Window Objects (Global Access)

```javascript
window.supabase              // Supabase client
window.authService           // SupabaseAuthService instance
window.dbService             // SupabaseDBService instance
window.PlusCodeAPI           // Plus Code encoder/decoder
window.hotspotsMarkers       // Array of Leaflet markers
window.viewHotspotDetails()  // Function to view hotspot details
window.supabaseHelpers       // Helper functions (from supabase-config.js)
```

---

## Database Tables Structure

```
hotspots
├─ id (int) - Primary key
├─ name (text) - Hotspot name
├─ location (PostGIS) - Geographic point
├─ address_text (text) - Human-readable address
├─ created_by (uuid) - User ID (foreign key)
├─ created_at (timestamp)
└─ avg_speed_score, noise_level, security_rating (from reports)

hotspot_photos
├─ id (int)
├─ hotspot_id (int) - Foreign key to hotspots
├─ storage_path (text) - Path in Supabase Storage
├─ display_order (int)
└─ uploaded_by (uuid) - User ID

profiles
├─ id (uuid) - User ID (foreign key from auth.users)
├─ username (text)
├─ points (int) - Gamification points
└─ created_at (timestamp)

reports
├─ id (int)
├─ hotspot_id (int) - Foreign key
├─ user_id (uuid) - User ID
├─ speed_rating (int)
├─ noise_level (text)
├─ security_rating (text)
├─ password_text (text)
├─ comment (text)
└─ created_at (timestamp)
```

---

## CSS Classes Used

```css
/* Layout */
.main-container, flex, h-screen, w-full
#sidebar, md:relative, max-w-sm, translate-x-0

/* Overlays */
#search-overlay, opacity-0, pointer-events-none, z-[2000]
#profile-overlay, backdrop-blur-lg
#contribute-overlay

/* Sidebar Content */
.filter-pill, .featured-place, .nearby-hotspot
.featured-place - w-full, rounded-lg, overflow-hidden, group hover:bg-zinc-700/70

/* Map */
#map, absolute, inset-0, leaflet-container
.custom-marker, .wifi-marker, pulse animation

/* Cards */
.bg-zinc-800, border-zinc-700, hover:bg-zinc-700
.text-blue-400, .text-zinc-100, .text-zinc-400

/* Forms */
.bg-zinc-800, border-zinc-700, rounded-lg, px-4, py-3
#contribute-form, space-y-6
```

---

## API/RPC Functions

**Called from JavaScript:**
```javascript
// Get hotspots
await supabase.rpc("get_all_hotspots_with_coords")

// Get hotspots in region
await supabase.rpc("get_hotspots_in_bounds", {
  min_lat, max_lat, min_lng, max_lng
})

// Increment points
await supabase.rpc("increment_user_points", {
  user_id, points_to_add
})
```

---

## Development Tasks

### To Implement Search from Database:
1. Replace MOCK_PLACES in `handleSearch()` function
2. Call database query filtering by name/category
3. Return actual hotspots instead of mock data

### To Add New Featured Place:
1. Edit `featuredPlaces` array in index.js (line 105)
2. Add object with name, query, category, image
3. Redeploy

### To Add Database Feature:
1. Create async function in `SupabaseDBService` class
2. Use supabase methods: `.from()`, `.select()`, `.rpc()`
3. Handle errors and return `{success, data/error}`
4. Call from index.js

### To Style New Component:
1. Add HTML in index.html
2. Use Tailwind classes (CDN loaded)
3. Add custom CSS in styles.css if needed
4. Test responsive design on mobile

---

## Common Errors & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Hotspots not showing | Database empty | Contribute a location first |
| Search returns mock data | Feature incomplete | Implement database search |
| Location not detected | Permission denied | Enable location in browser |
| Photos not uploading | Auth not signed in | Sign in before contributing |
| Coordinates invalid | Wrong Plus Code format | Validate at plus.codes website |
| Sidebar not visible (mobile) | Hidden state | Click menu button to toggle |

---

## Performance Notes

- **Hotspots:** Fetched once on map load, all displayed at once
- **Nearby calculation:** Uses Haversine formula, client-side
- **Photos:** Lazy loaded, max 5 per hotspot
- **Search:** Currently instant (mock), real version will need debounce
- **Map:** Leaflet with OpenStreetMap (free, open-source)

---

## Key Files Summary

| File | Purpose | Key Functions |
|------|---------|---|
| index.html | UI structure | All HTML elements, forms, overlays |
| index.js | Main logic | Search, map, hotspots, contribute |
| supabase-db.js | Database ops | getLiveHotspots, createHotspot |
| supabase-auth.js | Authentication | signUp, signIn, signOut |
| supabase-config.js | Init Supabase | Set up client and services |
| styles.css | Styling | Dark theme, custom components |

---

## Next Steps for Development

1. **High Priority:** Implement real search against database (hotspot name, category filters)
2. **High Priority:** Make Featured Places dynamic (fetch from database)
3. **Medium:** Add detailed hotspot view with full info, reviews, photos
4. **Medium:** Implement user profile/dashboard
5. **Low:** Add gamification features (badges, leaderboards)
6. **Low:** Add advanced filters (distance, speed rating, etc.)

---

**Last Updated:** Based on current codebase as of the latest commits
**Document Version:** 1.0
