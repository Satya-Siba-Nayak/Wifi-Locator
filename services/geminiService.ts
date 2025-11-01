import { GoogleGenAI } from "@google/genai";
import type { SearchResult, GroundingChunk } from '../types';

if (!process.env.API_KEY) {
    console.warn("API_KEY environment variable not set. Please set it to use the search API.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export async function findWifiLocations(
    query: string,
    location: { latitude: number; longitude: number; }
): Promise<SearchResult> {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Find places related to this query: "${query}". Provide a brief summary and list relevant locations.`,
            config: {
                tools: [{ googleMaps: {} }],
                toolConfig: {
                    retrievalConfig: {
                        latLng: {
                            latitude: location.latitude,
                            longitude: location.longitude,
                        }
                    }
                }
            },
        });
        
        const summary = response.text;
        const groundingChunks = (response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] || [])
            .filter(chunk => 'maps' in chunk);

        return {
            summary,
            places: groundingChunks,
        };
    } catch (error) {
        console.error("Error calling search API:", error);
        throw new Error("Failed to fetch data from search API.");
    }
}