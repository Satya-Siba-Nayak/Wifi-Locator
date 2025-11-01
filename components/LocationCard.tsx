import React from 'react';
import type { GroundingChunkMap } from '../types';
import MapPinIcon from './icons/MapPinIcon';
import ExternalLinkIcon from './icons/ExternalLinkIcon';

interface LocationCardProps {
  place: GroundingChunkMap;
}

const LocationCard: React.FC<LocationCardProps> = ({ place }) => {
  return (
    <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-700/80 hover:border-zinc-600 hover:bg-zinc-700/50 transition-all group">
      <div className="flex justify-between items-start">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 pt-1">
            <MapPinIcon />
          </div>
          <div>
            <h3 className="font-semibold text-gray-100">{place.title}</h3>
          </div>
        </div>
        <a
          href={place.uri}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-full text-zinc-400 group-hover:text-blue-400 group-hover:bg-zinc-600/50 transition-colors"
          aria-label="Open in Maps"
        >
          <ExternalLinkIcon />
        </a>
      </div>
      {place.placeAnswerSources?.reviewSnippets && place.placeAnswerSources.reviewSnippets.length > 0 && (
         <div className="mt-3 pl-8 space-y-2">
            {place.placeAnswerSources.reviewSnippets.slice(0, 2).map((snippet, index) => (
                <div key={index} className="border-l-2 border-zinc-600 pl-3">
                    <p className="text-sm text-zinc-300 italic">"{snippet.text}"</p>
                    <p className="text-xs text-zinc-400 text-right mt-1">- {snippet.author}</p>
                </div>
            ))}
         </div>
      )}
    </div>
  );
};

export default LocationCard;