export interface TrackPoint {
  lat: number;
  lng: number;
  ele: number;
  time?: string;
  distanceKm?: number;
}

export interface TrackSegment {
  id: string;
  name: string;
  points: TrackPoint[];
  distanceKm: number;
  elevationGain: number;
  elevationLoss: number;
  maxElevation: number;
  minElevation: number;
  startTime?: string;
  endTime?: string;
}

export interface TrackWaypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  ele?: number;
  description?: string;
  imageUrl?: string;
  type?: 'start' | 'end' | 'camp' | 'photo' | 'pass' | 'point';
}

export interface ParsedTrack {
  id: string;
  title: string;
  description?: string;
  author?: string;
  totalDistanceKm: number;
  elevationGain: number;
  elevationLoss: number;
  maxElevation: number;
  minElevation: number;
  segments: TrackSegment[];
  allPoints: TrackPoint[];
  waypoints: TrackWaypoint[];
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
}
