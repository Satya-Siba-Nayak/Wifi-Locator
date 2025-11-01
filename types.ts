export interface GroundingChunkMap {
  title: string;
  uri: string;
  placeAnswerSources?: {
    reviewSnippets: {
      uri: string;
      text: string;
      author: string;
    }[];
  };
}

export interface GroundingChunk {
  maps: GroundingChunkMap;
}

export interface SearchResult {
  summary: string;
  places: GroundingChunk[];
}
