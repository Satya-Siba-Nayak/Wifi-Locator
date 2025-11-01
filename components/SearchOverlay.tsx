import React, { useState, useEffect, useRef } from 'react';
import SearchIcon from './icons/SearchIcon';
import CloseIcon from './icons/CloseIcon';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
}

const recommendationPills = ['Quiet cafes with fast Wi-Fi', 'Places to work with power outlets', '24/7 study spots', 'Libraries with free internet', 'Coffee shops nearby'];

const SearchOverlay: React.FC<SearchOverlayProps> = ({ isOpen, onClose, onSearch }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Auto-focus the input when the overlay opens
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      // Clear query when closing
      setQuery('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleRecommendationClick = (rec: string) => {
    setQuery(rec);
    onSearch(rec);
  };

  return (
    <div 
      className={`fixed inset-0 z-50 bg-zinc-950/90 backdrop-blur-lg transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      aria-hidden={!isOpen}
    >
      <div className="relative w-full h-full">
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
          aria-label="Close search"
        >
          <CloseIcon />
        </button>
        <div className="flex flex-col items-center justify-start pt-24 md:pt-32 px-4">
          <div className="w-full max-w-xl">
            <form onSubmit={handleSubmit} role="search" className="relative">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for coffee shops, libraries..."
                aria-label="Search for locations"
                className="w-full bg-zinc-800 border-2 border-zinc-700 rounded-full pl-14 pr-6 py-4 text-lg text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-zinc-900 shadow-lg transition-all outline-none"
              />
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <SearchIcon />
              </div>
            </form>

            <div className="mt-10 text-center">
              <h3 className="text-sm font-semibold text-zinc-400 mb-4">Or try one of these</h3>
              <div className="flex flex-wrap gap-3 justify-center">
                {recommendationPills.map(rec => (
                  <button 
                    key={rec}
                    onClick={() => handleRecommendationClick(rec)}
                    className="bg-zinc-800 text-zinc-200 px-4 py-2 rounded-lg text-sm hover:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {rec}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchOverlay;