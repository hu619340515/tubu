export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
  experienceLevel?: 'rookie' | 'intermediate' | 'expert';
  role?: 'admin' | 'user';
  isAdmin?: boolean;
  createdAt: number;
}

export interface SiteAnnouncement {
  id: string;
  enabled: boolean;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'alert';
  updatedAt: number;
}

export interface Category {
  id: string;
  name: string;
  color: string; // Tailwind color token or hex
  icon: string; // Lucide icon name
  isDefault?: boolean;
}

export interface GearItem {
  id: string;
  name: string;
  categoryId: string;
  weightGrams: number; // in grams
  quantity: number;
  packed: boolean;
  isEssential: boolean; // 必带重点装备
  notes?: string;
  packLocation?: 'backpack' | 'worn' | 'pocket'; // 打包位置
}

export type TrailType = 'day_hike' | 'overnight_camp' | 'high_altitude' | 'thru_hike';

export interface HikingList {
  id: string;
  userId: string;
  title: string;
  description?: string;
  destination: string;
  destinationCoords?: {
    lat: number;
    lng: number;
  };
  trailType: TrailType;
  durationDays: number;
  startDate?: string;
  items: GearItem[];
  customCategories: Category[];
  createdAt: number;
  updatedAt: number;
  isFavorite?: boolean;
}

export interface WeatherDayForecast {
  date: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  weatherText: string;
  rainProb: number;
  windSpeedMax: number;
  uvIndex: number;
}

export interface WeatherData {
  locationName: string;
  latitude: number;
  longitude: number;
  elevation: number;
  currentTemp: number;
  currentWeatherCode: number;
  currentWeatherText: string;
  currentWindSpeed: number;
  currentRainProb: number;
  currentUvIndex: number;
  daily: WeatherDayForecast[];
  gearRecommendations: string[];
  lastFetched: number;
}

export interface SharedListPayload {
  version: number;
  title: string;
  destination: string;
  trailType: TrailType;
  durationDays: number;
  creatorName: string;
  categories: Category[];
  items: GearItem[];
  shareDate: string;
}
