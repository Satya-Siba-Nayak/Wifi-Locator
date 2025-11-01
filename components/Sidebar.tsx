import React from 'react';
import type { SearchResult } from '../types';
import WifiIcon from './icons/WifiIcon';
import Spinner from './Spinner';
import LocationCard from './LocationCard';
import SearchIcon from './icons/SearchIcon';

interface SidebarProps {
  onSearch: (query: string) => void;
  onToggleSearch: () => void;
  loading: boolean;
  result: SearchResult | null;
  locationError: string | null;
  apiError: string | null;
}

const filterPills = ['Coffee Shops', 'Libraries', 'Coworking', 'Free Wi-Fi', 'Quiet Places'];

const featuredPlaces = [
  {
    name: 'Artisan Roast Cafe',
    query: 'Artisan Roast Cafe with wifi',
    category: 'Coffee Shop',
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=500&auto=format&fit=crop',
  },
  {
    name: 'Central City Library',
    query: 'Central City Library with free wifi',
    category: 'Library',
    image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=500&auto=format&fit=crop',
  },
  {
    name: 'Innovate Coworking Hub',
    query: 'Innovate Coworking Hub with power outlets',
    category: 'Coworking Space',
    image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=500&auto=format&fit=crop',
  }
];


const Sidebar: React.FC<SidebarProps> = ({ onSearch, onToggleSearch, loading, result, locationError, apiError }) => {

  return (
    <aside className="w-full md:w-[380px] lg:w-[420px] h-full bg-zinc-900/80 backdrop-blur-md border-r border-zinc-700/50 flex flex-col z-10 overflow-y-auto">
      <header className="p-4 flex items-center justify-between border-b border-zinc-700/50 flex-shrink-0">
        <div className="flex items-center space-x-3">
            <WifiIcon />
            <h1 className="text-xl font-semibold text-gray-100">Wi-Fi Locator</h1>
        </div>
        <button 
          onClick={onToggleSearch} 
          aria-label="Search" 
          className="p-2 rounded-full text-zinc-300 hover:bg-zinc-700 transition-colors md:hidden"
        >
          <SearchIcon />
        </button>
      </header>

      <div className="p-4 flex-grow">
        {loading && (
            <div className="flex justify-center items-center h-full">
                <Spinner />
            </div>
        )}
        {locationError && <div className="text-red-400 bg-red-900/30 p-3 rounded-lg">{locationError}</div>}
        {apiError && <div className="text-yellow-400 bg-yellow-900/30 p-3 rounded-lg">{apiError}</div>}

        {!loading && !result && !locationError && (
             <div className="space-y-8">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-400 px-1 mb-3">Quick Filters</h3>
                  <div className="flex flex-wrap gap-2">
                    {filterPills.map(filter => (
                      <button 
                        key={filter} 
                        onClick={() => onSearch(filter)} 
                        className="bg-zinc-800 text-zinc-200 px-3 py-1.5 rounded-lg text-sm hover:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label={`Search for ${filter}`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-400 px-1 mb-3">Featured Places</h3>
                  <div className="space-y-3">
                    {featuredPlaces.map(place => (
                      <button 
                        key={place.name} 
                        onClick={() => onSearch(place.query)}
                        className="w-full text-left rounded-lg overflow-hidden bg-zinc-800 hover:bg-zinc-700/70 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 group"
                        aria-label={`Search for ${place.name}`}
                      >
                        <div className="relative h-24">
                          <img src={place.image} alt={place.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                           <span className="absolute bottom-2 right-2 bg-blue-600/90 text-white text-xs font-semibold px-2 py-0.5 rounded-full">{place.category}</span>
                        </div>
                        <div className="p-3">
                          <p className="font-semibold text-zinc-100">{place.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
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