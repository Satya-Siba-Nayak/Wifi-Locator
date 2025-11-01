import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
import SearchOverlay from './components/SearchOverlay';
import ProfileOverlay from './components/ProfileOverlay';
import { findWifiLocations } from './services/geminiService';
import type { SearchResult } from './types';

const App: React.FC = () => {
  const [location, setLocation] = useState<{ latitude: number; longitude: number; } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationError(null);
        },
        (error) => {
          console.error("Geolocation error:", error);
          setLocationError(`Error: ${error.message}. Please enable location services.`);
        }
      );
    } else {
      setLocationError("Geolocation is not supported by this browser.");
    }
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    if (!location) {
        setApiError("Could not get your location. Please enable location services and try again.");
        return;
    }
    setLoading(true);
    setApiError(null);
    setSearchResult(null);
    try {
        const result = await findWifiLocations(query, location);
        setSearchResult(result);
    } catch (error) {
        console.error("API Error:", error);
        setApiError("Sorry, something went wrong while searching. Please try again.");
    } finally {
        setLoading(false);
    }
  }, [location]);

  const executeSearch = useCallback((query: string) => {
    setIsSearchOpen(false);
    // Delay search slightly to allow overlay to animate out
    setTimeout(() => handleSearch(query), 150);
  }, [handleSearch]);

  return (
    <div className="flex h-screen w-full font-sans antialiased">
      <Sidebar 
        onSearch={handleSearch}
        onToggleSearch={() => setIsSearchOpen(true)}
        onToggleProfile={() => setIsProfileOpen(true)}
        loading={loading}
        result={searchResult}
        locationError={locationError}
        apiError={apiError}
      />
      <MapView 
        location={location} 
        onToggleSearch={() => setIsSearchOpen(true)}
        onToggleProfile={() => setIsProfileOpen(true)}
      />
      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSearch={executeSearch}
      />
      <ProfileOverlay
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
};

export default App;