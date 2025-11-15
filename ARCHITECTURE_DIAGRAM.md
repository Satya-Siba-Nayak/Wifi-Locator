# WiFi Locator - Architecture & Data Flow Diagrams

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     WiFi Locator Web App                        │
│                      (Single Page App)                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
        ┌───────▼──────┐  ┌──▼──────────┐  │
        │   Frontend   │  │  Supabase   │  │
        │   (HTML/JS)  │  │   Client    │  │
        └───────┬──────┘  └──┬──────────┘  │
                │             │             │
     ┌──────────┴────────┐    │             │
     │                   │    │             │
 ┌───▼────────┐  ┌──────▼────▼──────┐  ┌──▼──────────────┐
 │ Leaflet.js │  │  Supabase SDK    │  │  Plus Code API  │
 │   (Maps)   │  │  (Auth & DB)     │  │  (Coordinates)  │
 └────────────┘  └──────┬───────────┘  └─────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
    ┌───▼───────────────▼──┐    ┌──────▼────────────┐
    │  Supabase Backend    │    │ Supabase Storage │
    │  (PostgreSQL + PostGIS)│   │ (Hotspot Photos) │
    └─────────────────────┘    └──────────────────┘
```

---

## Component Hierarchy

```
HTML Document
│
├─ Sidebar (Left Panel)
│  ├─ Header: Logo + Title + Close Button
│  ├─ Content Container
│  │  ├─ Initial View (Default)
│  │  │  ├─ Quick Filters Section
│  │  │  │  └─ Filter Pills (5 items)
│  │  │  │
│  │  │  ├─ Nearby Hotspots Section
│  │  │  │  └─ Hotspot Cards (Dynamic, up to 5)
│  │  │  │
│  │  │  └─ Featured Places Section
│  │  │     └─ Featured Place Cards (3 items, hardcoded)
│  │  │
│  │  └─ Results View (After Search)
│  │     ├─ Back Button
│  │     └─ Search Results (Location Cards)
│  │
│  └─ Footer: Copyright
│
├─ Map Area (Main Content)
│  ├─ Leaflet Map Container
│  ├─ Top-Left Controls
│  │  └─ Mobile Menu Button
│  ├─ Top-Right Controls
│  │  ├─ Profile Button
│  │  ├─ Search Button
│  │  └─ Recenter Button
│  ├─ Bottom-Right Controls
│  │  ├─ Zoom Controls Stack
│  │  │  ├─ Recenter on User Location
│  │  │  └─ Reset Orientation
│  │  └─ Contribute Button (Large)
│  └─ Markers (Dynamic, from Database)
│
└─ Overlays (Full-screen, z-index: 2000)
   ├─ Search Overlay (Hidden by default)
   │  ├─ Close Button
   │  ├─ "Where to?" Heading
   │  ├─ Search Input Field
   │  └─ Recommendation Pills (5 items)
   │
   ├─ Profile Overlay (Hidden by default)
   │  ├─ Close Button
   │  ├─ Welcome Heading
   │  ├─ Auth Segmented Control (Sign In | Sign Up)
   │  ├─ Auth Form
   │  │  ├─ Name Field (Hidden initially)
   │  │  ├─ Email Field
   │  │  └─ Password Field
   │  ├─ Error/Success Messages
   │  ├─ Google OAuth Button
   │  └─ User Info (When logged in)
   │
   └─ Contribute Overlay (Hidden by default)
      ├─ Close Button
      ├─ Form: Place Details
      │  ├─ Place Name Input
      │  ├─ Address Input
      │  ├─ Location Input (GPS or Plus Code)
      │  │  ├─ GPS Tab (Latitude + Longitude)
      │  │  ├─ Plus Code Tab (Plus Code Input)
      │  │  └─ Auto-detect Button
      │  ├─ Wi-Fi Type Select
      │  ├─ Category Radio Buttons (6 options)
      │  ├─ Notes Text Area
      │  └─ Photo Upload Input
      │     └─ Photo Previews (Up to 5)
      └─ Submit Button
```

---

## Data Flow: Page Load & Initialization

```
User Opens App
│
└─ DOMContentLoaded Event
   │
   ├─ Wait for Supabase Services
   │  ├─ supabase-config.js loads & initializes Supabase client
   │  ├─ supabase-auth.js loads & creates SupabaseAuthService
   │  └─ supabase-db.js loads & creates SupabaseDBService
   │
   ├─ Check Plus Code API (inline in HTML)
   │
   ├─ Initialize Map
   │  ├─ Create Leaflet map instance
   │  ├─ Set default view: [18.5204, 73.8567], zoom 13 (Pune)
   │  ├─ Add OpenStreetMap tiles with dark filter
   │  ├─ Add zoom controls
   │  └─ Call loadHotspots()
   │
   ├─ Load Hotspots from Database
   │  ├─ window.dbService.getLiveHotspots()
   │  │  └─ Supabase RPC: get_all_hotspots_with_coords
   │  │     ├─ Query: hotspots + creators (profiles) + photos
   │  │     └─ Returns: Array of hotspot rows (with duplicates for photos)
   │  │
   │  ├─ Client-side Processing
   │  │  ├─ Group rows by hotspot ID
   │  │  ├─ Collect photos for each hotspot
   │  │  ├─ Sort photos by display_order
   │  │  └─ Extract first photo path
   │  │
   │  └─ Create Markers for Each Hotspot
   │     ├─ Custom icon (Blue gradient + WiFi icon)
   │     ├─ Bind popup with hotspot details
   │     ├─ Add to map
   │     └─ Store in window.hotspotsMarkers array
   │
   ├─ Request User Geolocation
   │  ├─ Browser asks for permission
   │  ├─ Get user's latitude, longitude, accuracy
   │  ├─ Store in currentUserLocation
   │  ├─ Call updateMap() to center on user
   │  └─ Create pulsing user marker
   │
   ├─ Update Nearby Hotspots List
   │  ├─ Get all hotspots (already loaded)
   │  ├─ Calculate distance to each (Haversine formula)
   │  ├─ Sort by distance
   │  ├─ Take top 5 nearest
   │  └─ Render in "Nearby Hotspots" section
   │
   └─ Render Initial UI
      ├─ renderInitialView()
      │  ├─ Display filter pills
      │  ├─ Display nearby hotspots
      │  └─ Display featured places cards
      │
      └─ renderSearchRecommendations()
         └─ Display recommendation pills in search overlay
```

---

## Data Flow: Search Feature

```
User Initiates Search
│
├─ Search Input Method
│  ├─ Method 1: Type in search overlay input
│  ├─ Method 2: Click filter pill (Coffee Shops, Libraries, etc.)
│  ├─ Method 3: Click featured place card
│  └─ Method 4: Click recommendation pill
│
├─ Search Submitted (Form or button click)
│  └─ Capture query string
│
└─ executeSearch(query)
   │
   ├─ Close search overlay
   ├─ Close sidebar (if mobile)
   │
   └─ Schedule handleSearch() with 300ms delay
      │
      └─ handleSearch(query)
         │
         ├─ Validate user location exists
         │  └─ If not: Show error, return
         │
         ├─ Set isLoading = true
         ├─ Show spinner in sidebar
         │
         ├─ Simulate API delay (1000ms)
         │
         └─ Get Results
            │
            ├─ CURRENT: Return MOCK_PLACES (hardcoded)
            │  └─ 3 test locations with reviews
            │
            └─ FUTURE: Query database
               ├─ Filter hotspots by name LIKE query
               ├─ Filter by category if query matches category
               ├─ Filter by location radius from user
               └─ Return matching hotspots
         
         └─ Render Results
            │
            ├─ renderResults(result)
            ├─ Show back button
            ├─ Show summary message
            ├─ Render location cards for each result
            │  └─ Card includes:
            │     ├─ Place title
            │     ├─ Up to 2 review snippets
            │     └─ External link
            │
            └─ Set isShowingResults = true
```

---

## Data Flow: Contribute Location

```
User Clicks "Contribute" Button
│
└─ contributeOverlay Opens (Full-screen modal)
   │
   ├─ User Fills Form
   │  ├─ Place Name (required)
   │  ├─ Address (required)
   │  ├─ Location Coordinates
   │  │  ├─ Option 1: Enter GPS (Latitude + Longitude)
   │  │  ├─ Option 2: Enter Plus Code
   │  │  └─ Option 3: Auto-detect current location
   │  │
   │  ├─ Validate Coordinates
   │  │  ├─ GPS: Parse as floats, check range
   │  │  ├─ Plus Code: Use window.PlusCodeAPI.isValid()
   │  │  ├─ If Plus Code: Decode to GPS using window.PlusCodeAPI.decode()
   │  │  ├─ Store in validatedCoords object
   │  │  └─ Show coordinate preview if valid
   │  │
   │  ├─ Wi-Fi Type (Select dropdown)
   │  │  ├─ Free & Open
   │  │  ├─ Password Protected
   │  │  └─ For Customers Only
   │  │
   │  ├─ Category (Radio buttons, 6 options)
   │  │  ├─ Coffee Shop
   │  │  ├─ Library
   │  │  ├─ Coworking
   │  │  ├─ Cafe
   │  │  ├─ Restaurant
   │  │  └─ Other
   │  │
   │  ├─ Notes (Optional text area)
   │  │
   │  └─ Photos (Optional, max 5)
   │     ├─ User selects files
   │     ├─ Show preview thumbnails
   │     └─ Allow removal of individual photos
   │
   └─ User Submits Form
      │
      ├─ Validate
      │  ├─ Check user is signed in
      │  │  └─ If not: Show auth overlay, return
      │  │
      │  └─ Check coordinates are valid
      │     └─ If not: Show error, return
      │
      ├─ Create Hotspot in Database
      │  │
      │  └─ window.dbService.createHotspot(
      │     ├─ name: Place Name
      │     ├─ latitude: Validated latitude
      │     ├─ longitude: Validated longitude
      │     ├─ addressText: Address
      │     └─ photos: File array
      │  )
      │
      ├─ Server Processing
      │  ├─ Get current user ID from auth
      │  ├─ Check user profile exists (create if needed)
      │  ├─ Convert coordinates to PostGIS format: POINT(lon lat)
      │  ├─ Insert into hotspots table
      │  └─ Return new hotspot ID
      │
      ├─ Upload Photos (if provided)
      │  │
      │  └─ window.dbService.uploadHotspotPhotos(
      │     ├─ hotspotId
      │     ├─ photos array
      │     └─ userId
      │  )
      │
      ├─ Server Processing
      │  ├─ For each photo file:
      │  │  ├─ Generate unique filename: {hotspotId}/{timestamp}_{index}.{ext}
      │  │  ├─ Upload to Supabase Storage: hotspot-photos bucket
      │  │  ├─ Save photo reference in hotspot_photos table
      │  │  │  ├─ hotspot_id
      │  │  │  ├─ storage_path
      │  │  │  ├─ display_order (index)
      │  │  │  └─ uploaded_by (user_id)
      │  │  └─ Continue with next photo
      │  │
      │  └─ Award user 10 points
      │     └─ Increment profiles.points
      │
      ├─ Success: Update Map Immediately
      │  ├─ Create new marker at submitted coordinates
      │  ├─ Use custom marker icon
      │  ├─ Pan map to new location
      │  ├─ Open popup with hotspot details
      │  └─ Add marker to window.hotspotsMarkers
      │
      ├─ Reset Form
      │  ├─ Clear all inputs
      │  ├─ Clear photo previews
      │  ├─ Clear validated coords
      │  └─ selectedPhotos = []
      │
      └─ Close Contribute Overlay
         └─ Show success message: "Thank you! Your Wi-Fi hotspot has been added to the map."
```

---

## Data Flow: Map Interaction

```
Map Actions:

1. Click Hotspot Marker
   └─ Open Popup with Details
      ├─ Photo (if available)
      ├─ Hotspot Name
      ├─ Address
      ├─ Stats (Speed, Noise, Security)
      ├─ Creator info (Avatar, name, date added)
      └─ "View Full Details" Button
         └─ Calls window.viewHotspotDetails(hotspotId)

2. Zoom Map In/Out
   └─ Trigger 'zoomend' event
      ├─ Calculate new scale factor based on zoom level
      ├─ Update all marker icons (size)
      ├─ Update all popup sizes
      └─ If popup open, apply scale transform

3. Nearby Hotspot Click
   └─ In "Nearby Hotspots" list
      ├─ Extract lat/lng from card
      ├─ Call map.setView([lat, lng], 17)
      ├─ Find matching marker in window.hotspotsMarkers
      └─ Open marker popup

4. Recenter Button Click
   └─ updateMap(currentUserLocation)
      ├─ Pan to user location
      └─ Update user marker position
```

---

## Data Flow: Authentication

```
User Clicks Profile Button
│
└─ profileOverlay Opens (Full-screen modal)
   │
   ├─ Check if User Logged In
   │  │
   │  ├─ NOT Logged In
   │  │  └─ Show Auth Form
   │  │     ├─ Default: Sign In tab
   │  │     ├─ Tabs: "Sign In" | "Sign Up"
   │  │     ├─ Form Fields: Email, Password, (Name for signup)
   │  │     └─ Buttons: Sign In/Up, Google OAuth
   │  │
   │  └─ Logged In
   │     └─ Show User Info
   │        ├─ Avatar (initials)
   │        ├─ Name
   │        ├─ Email
   │        └─ Sign Out Button
   │
   └─ Sign In Flow
      │
      ├─ User Enters Email + Password
      │
      └─ Form Submit
         │
         └─ window.authService.signIn(email, password)
            │
            ├─ Call Supabase: supabase.auth.signInWithPassword()
            │
            ├─ Success
            │  ├─ Return user object
            │  ├─ Show success message
            │  ├─ Update UI to show user info
            │  └─ Close overlay
            │
            └─ Error
               ├─ Get error message
               └─ Show in UI (red error box)

   └─ Sign Up Flow
      │
      ├─ User Enters Name + Email + Password
      │
      └─ Form Submit
         │
         └─ window.authService.signUp(email, password, fullName)
            │
            ├─ Call Supabase: supabase.auth.signUp()
            │
            ├─ Create User Profile
            │  └─ window.authService.createUserProfile(userId, username)
            │     └─ Insert into profiles table
            │        ├─ id: userId
            │        ├─ username: fullName or email prefix
            │        └─ points: 0
            │
            ├─ Success
            │  ├─ Return user object
            │  ├─ Show success message
            │  ├─ Update UI
            │  └─ Close overlay
            │
            └─ Error
               └─ Show error message

   └─ Google OAuth Flow
      │
      ├─ User Clicks "Continue with Google"
      │
      └─ window.authService.signInWithGoogle()
         │
         ├─ Call Supabase: supabase.auth.signInWithOAuth()
         │
         ├─ Browser redirects to Google login
         │
         ├─ User authorizes app
         │
         └─ Redirect back to app (window.location.origin)
            ├─ Session established
            ├─ Supabase creates profile automatically
            └─ Show user info in overlay
```

---

## Nearby Hotspots Calculation

```
updateNearbyHotspots() Function

1. Get All Hotspots
   └─ window.dbService.getLiveHotspots()
      └─ Returns array of all hotspots with coordinates

2. For Each Hotspot:
   └─ Calculate Distance to User
      │
      ├─ Use Haversine Formula:
      │  │
      │  └─ Distance = 2 * R * arcsin(
      │              sqrt(sin²(Δlat/2) + cos(lat1) * cos(lat2) * sin²(Δlon/2))
      │          )
      │  │
      │  └─ R = Earth radius = 6371 km
      │
      └─ Create object: { ...hotspot, distance: calculated_distance }

3. Sort by Distance
   └─ Sort array ascending (nearest first)

4. Select Top 5
   └─ slice(0, 5)

5. Generate HTML & Render
   └─ For each nearby hotspot:
      ├─ Card with thumbnail
      ├─ Name, address, WiFi icon
      ├─ Distance badge (km or meters)
      └─ Click handler to zoom to marker and open popup
```

---

## Database Schema (Visual)

```
┌──────────────────────────────────────────────┐
│                  hotspots                     │
├──────────────────────────────────────────────┤
│ PK  id (int)                                 │
│     name (text)                              │
│     location (PostGIS POINT)  ←─┐            │
│     address_text (text)          │            │
│ FK  created_by (uuid) ──────┐    │            │
│     created_at (timestamp)   │    │            │
│     updated_at (timestamp)   │    │            │
│     avg_speed_score (numeric)│    │            │
│     noise_level (text)       │    │            │
│     security_rating (text)   │    │            │
└──────────────────────────────│────│────────────┘
                               │    │
                    ┌──────────┘    │
                    │               │
        ┌───────────▼──────┐    ┌───▼──────────────────┐
        │   profiles       │    │  hotspot_photos      │
        ├──────────────────┤    ├──────────────────────┤
        │ PK id (uuid)     │    │ PK id (int)          │
        │    username      │    │ FK hotspot_id (int)  │
        │    points        │    │    storage_path      │
        │    created_at    │    │    display_order     │
        │    updated_at    │    │ FK uploaded_by (uuid)│
        └──────────────────┘    │    created_at        │
                               └──────────────────────┘
                                       │
                                       │
        ┌──────────────────────────────▼────────────┐
        │      Supabase Storage Bucket              │
        │         hotspot-photos                    │
        ├────────────────────────────────────────────┤
        │ {hotspotId}/{timestamp}_{index}.{ext}     │
        │ Example: 42/1699564800000_0.jpg           │
        └────────────────────────────────────────────┘


┌──────────────────────────────────────────────┐
│               reports                        │
├──────────────────────────────────────────────┤
│ PK  id (int)                                 │
│ FK  hotspot_id (int) ──┐                     │
│ FK  user_id (uuid)     │                     │
│     speed_rating (1-5) │                     │
│     noise_level (text) │                     │
│     security_rating    │                     │
│     password_text      │                     │
│     comment (text)     │                     │
│     created_at         │                     │
│     updated_at         │                     │
└──────────────────────┬─────────────────────┘
                       │ (aggregated for stats)
                       │
        ┌──────────────▼──────────────┐
        │   hotspots stats            │
        │ (avg_speed_score, etc)      │
        │ computed from reports       │
        └─────────────────────────────┘
```

---

## Featured Places Rendering Flow

```
Initial Page Load
│
└─ renderInitialView()
   │
   ├─ Get featuredPlaces array from state
   │  └─ 3 hardcoded places with images & queries
   │
   ├─ Generate Featured HTML
   │  └─ For each place:
   │     └─ Create card with:
   │        ├─ <div class="relative h-24">
   │        │  ├─ <img src="{place.image}" />
   │        │  ├─ Gradient overlay (from-black/60)
   │        │  └─ Category badge (top-right)
   │        │
   │        └─ <div class="p-3">
   │           └─ Place name
   │
   ├─ Inject into DOM
   │  └─ sidebarContent.innerHTML = HTML
   │
   └─ Add Event Listeners
      └─ For each featured place card:
         ├─ Listen for click
         └─ Call executeSearch(place.query)
            └─ Triggers search flow (see Search Data Flow)

User Clicks Featured Place Card
│
├─ Click Event Fired
│
└─ executeSearch("Artisan Roast Cafe with wifi")
   │
   ├─ Close overlays
   ├─ toggleSidebar(false) if mobile
   │
   └─ 300ms later: handleSearch("Artisan Roast Cafe with wifi")
      │
      └─ CURRENTLY: Returns MOCK_PLACES (ignores query)
      │
      └─ FUTURE: Should search database
         ├─ Find hotspots with name containing "Artisan Roast"
         └─ Return results
```

---

## State Management Overview

```
GLOBAL VARIABLES (in index.js):

Location State
├─ currentUserLocation: { lat, lng }
└─ userMarker: Leaflet marker instance

UI State
├─ isLoading: boolean
├─ isShowingResults: boolean
├─ currentAuthMode: "login" | "signup"
└─ map: Leaflet map instance

Data
└─ window.hotspotsMarkers: [] array of Leaflet markers

Form State (Contribute)
├─ selectedPhotos: [] array of File objects
├─ validatedCoords: { latitude, longitude } | null
└─ (form inputs read directly from DOM)

Services (Window objects)
├─ window.supabase: Supabase client
├─ window.authService: SupabaseAuthService
├─ window.dbService: SupabaseDBService
├─ window.PlusCodeAPI: Plus Code encoder/decoder
└─ window.supabaseHelpers: Helper functions
```

---

## Key Interactions Summary

| Feature | Trigger | Main Function | Database Call |
|---------|---------|---------------|---------------|
| Load Hotspots | Page load | `loadHotspots()` | `getLiveHotspots()` |
| Search | Filter/featured/search input | `executeSearch()` → `handleSearch()` | NONE (mock data) |
| Nearby List | Page load, location change | `updateNearbyHotspots()` | `getLiveHotspots()` |
| Contribute | Form submit | `contributeForm.onsubmit` | `createHotspot()`, `uploadHotspotPhotos()` |
| Sign In | Form submit | `authForm.onsubmit` | `signIn()` |
| Sign Up | Form submit | `authForm.onsubmit` | `signUp()`, `createUserProfile()` |
| Map Click | Marker click | Popup open | None (data bound to marker) |

---

**Architecture Document Version:** 1.0  
**Last Updated:** Based on current codebase
