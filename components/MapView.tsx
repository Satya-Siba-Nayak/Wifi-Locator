import React from 'react';
import CompassIcon from './icons/CompassIcon';
import MyLocationIcon from './icons/MyLocationIcon';
import SearchIcon from './icons/SearchIcon';
import UserIcon from './icons/UserIcon';

interface MapViewProps {
  location: { latitude: number; longitude: number; } | null;
  onToggleSearch: () => void;
  onToggleProfile: () => void;
}

const MapView: React.FC<MapViewProps> = ({ location, onToggleSearch, onToggleProfile }) => {
  // Use Pune, India as default, inspired by the original image
  const defaultLocation = { latitude: 18.5204, longitude: 73.8567 }; 
  const mapLocation = location || defaultLocation;

  // Static locations with GPS coordinates. These will now appear as default map markers.
  const staticLocations = [
    { name: 'Blue Tokai Coffee', lat: 18.5363, lon: 73.8940 },
    { name: 'S. M. Joshi Library', lat: 18.5134, lon: 73.8449 },
    { name: 'The Mesh Co-Work', lat: 18.5583, lon: 73.8091 },
  ];

  const lat = mapLocation.latitude;
  const lon = mapLocation.longitude;
  const delta = 0.05; // Controls the zoom level via bounding box size
  const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
  
  // Add markers for user's location (if available) and static locations to the map URL
  let markers = location ? `&marker=${lat},${lon}` : '';
  staticLocations.forEach(place => {
    markers += `&marker=${place.lat},${place.lon}`;
  });

  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik${markers}`;

  return (
    <main className="flex-grow h-full relative hidden md:block">
      <iframe
        className="absolute inset-0 w-full h-full border-0 filter invert-[95%] hue-rotate-[180deg] contrast-125"
        src={mapUrl}
        title="OpenStreetMap view"
        aria-label="Map view"
        loading="lazy"
      ></iframe>

      <div className="absolute top-4 right-4 z-10 flex flex-col items-center space-y-2">
          <button 
            onClick={onToggleProfile}
            className="p-3 bg-zinc-900/70 backdrop-blur-md rounded-full shadow-lg border border-zinc-700/50 text-zinc-300 hover:bg-zinc-800/60 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500" 
            aria-label="Profile"
          >
              <UserIcon />
          </button>
          <button 
            onClick={onToggleSearch}
            className="p-3 bg-zinc-900/70 backdrop-blur-md rounded-full shadow-lg border border-zinc-700/50 text-zinc-300 hover:bg-zinc-800/60 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500" 
            aria-label="Search locations"
          >
              <SearchIcon />
          </button>
          <div className="!mt-4 bg-zinc-900/70 backdrop-blur-md rounded-xl shadow-lg border border-zinc-700/50 text-zinc-300">
             <button className="p-2.5 hover:bg-zinc-800/60 rounded-t-xl transition-colors border-b border-zinc-700/80" aria-label="Center on my location">
                <MyLocationIcon />
             </button>
             <button className="p-2.5 hover:bg-zinc-800/60 rounded-b-xl transition-colors" aria-label="Reset map orientation">
                 <CompassIcon />
             </button>
         </div>
      </div>
    </main>
  );
};

export default MapView;