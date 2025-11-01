import React, { useState } from 'react';
import type { SearchResult } from '../types';
import WifiIcon from './icons/WifiIcon';
import SearchIcon from './icons/SearchIcon';
import Spinner from './Spinner';
import LocationCard from './LocationCard';

interface SidebarProps {
  onSearch: (query: string) => void;
  loading: boolean;
  result: SearchResult | null;
  locationError: string | null;
  apiError: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({ onSearch, loading, result, locationError, apiError }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <aside className="w-full md:w-[380px] lg:w-[420px] h-full bg-zinc-900/80 backdrop-blur-md border-r border-zinc-700/50 flex flex-col z-10 overflow-y-auto">
      <header className="p-4 flex items-center border-b border-zinc-700/50 flex-shrink-0">
        <div className="flex items-center space-x-3">
            <WifiIcon />
            <h1 className="text-xl font-semibold text-gray-100">Wi-Fi Locator</h1>
        </div>
      </header>

      <div className="p-4 flex-shrink-0">
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., quiet cafes with fast Wi-Fi"
              className="w-full bg-zinc-800 border border-transparent rounded-lg pl-10 pr-4 py-2.5 text-zinc-200 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:bg-zinc-700/50 transition-all"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon />
            </div>
          </div>
        </form>
      </div>

      <div className="px-4 pb-4 flex-grow">
        {loading && (
            <div className="flex justify-center items-center h-full">
                <Spinner />
            </div>
        )}
        {locationError && <div className="text-red-400 bg-red-900/30 p-3 rounded-lg">{locationError}</div>}
        {apiError && <div className="text-yellow-400 bg-yellow-900/30 p-3 rounded-lg">{apiError}</div>}

        {!loading && !result && !locationError && (
             <div className="text-center text-zinc-400 mt-16">
                <p className="text-lg">Find your next connection.</p>
                <p>Search for Wi-Fi hotspots, coffee shops, libraries, and more.</p>
            </div>
        )}
        
        {result && (
          <div className="space-y-4">
            {result.summary && (
              <div className="bg-zinc-800 p-4 rounded-xl">
                <p className="text-zinc-300">{result.summary}</p>
              </div>
            )}
            {result.places.length > 0 ? (
                result.places.map((place, index) => (
                    <LocationCard key={place.maps.uri + index} place={place.maps} />
                ))
            ) : (
                <div className="text-center text-zinc-400 p-4">
                    <p>No specific places found. Try a different search.</p>
                </div>
            )}
          </div>
        )}
      </div>

      <footer className="p-4 text-center text-xs text-zinc-500 border-t border-zinc-700/50 flex-shrink-0">
        <p>&copy; {new Date().getFullYear()} Wi-Fi Locator</p>
      </footer>
    </aside>
  );
};

export default Sidebar;