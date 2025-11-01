import React from 'react';
import PlusIcon from './icons/PlusIcon';
import MinusIcon from './icons/MinusIcon';
import CompassIcon from './icons/CompassIcon';
import UserIcon from './icons/UserIcon';
import MyLocationIcon from './icons/MyLocationIcon';

interface MapViewProps {
  location: { latitude: number; longitude: number; } | null;
}

const MapView: React.FC<MapViewProps> = ({ location }) => {
  // Use Pune, India as default, inspired by the original image
  const defaultLocation = { latitude: 18.5204, longitude: 73.8567 }; 
  const mapLocation = location || defaultLocation;

  const lat = mapLocation.latitude;
  const lon = mapLocation.longitude;
  const delta = 0.05; // Controls the zoom level via bounding box size
  const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
  
  // Add a marker only if we have the user's actual location
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}${location ? `&layer=mapnik&marker=${lat},${lon}` : ''}`;
  
  return (
    <main className="flex-grow h-full relative hidden md:block">
      <iframe
        className="absolute inset-0 w-full h-full border-0 filter invert-[95%] hue-rotate-[180deg] contrast-125"
        src={mapUrl}
        title="OpenStreetMap view"
        aria-label="Map view"
        loading="lazy"
      ></iframe>

      <div className="absolute top-4 right-4 z-10">
          <button className="p-2.5 bg-zinc-900/70 backdrop-blur-md rounded-full shadow-lg border border-zinc-700/50 text-zinc-300 hover:bg-zinc-800/60 transition-colors">
              <UserIcon />
          </button>
      </div>
      
      <div className="absolute top-20 right-4 flex flex-col items-center space-y-2">
         <div className="bg-zinc-900/70 backdrop-blur-md rounded-xl shadow-lg border border-zinc-700/50 text-zinc-300">
             <button className="p-2.5 hover:bg-zinc-800/60 rounded-t-xl transition-colors border-b border-zinc-700/80">
                <MyLocationIcon />
             </button>
             <button className="p-2.5 hover:bg-zinc-800/60 rounded-b-xl transition-colors">
                 <CompassIcon />
             </button>
         </div>
      </div>

      <div className="absolute bottom-4 right-4 flex flex-col items-center">
         <div className="bg-zinc-900/70 backdrop-blur-md rounded-xl shadow-lg border border-zinc-700/50 text-zinc-300">
             <button className="p-2.5 hover:bg-zinc-800/60 rounded-t-xl transition-colors border-b border-zinc-700/80">
                 <PlusIcon />
             </button>
             <button className="p-2.5 hover:bg-zinc-800/60 rounded-b-xl transition-colors">
                 <MinusIcon />
             </button>
         </div>
      </div>
    </main>
  );
};

export default MapView;