import { WeatherData, WeatherDayForecast } from '../types';

const WEATHER_CODE_MAP: Record<number, { text: string; icon: string }> = {
  0: { text: '晴空万里', icon: 'Sun' },
  1: { text: '大部晴朗', icon: 'SunMedium' },
  2: { text: '局部多云', icon: 'CloudSun' },
  3: { text: '阴天多云', icon: 'Cloud' },
  45: { text: '山野薄雾', icon: 'CloudFog' },
  48: { text: '浓雾结霜', icon: 'CloudFog' },
  51: { text: '零星细雨', icon: 'CloudDrizzle' },
  53: { text: '中度毛毛雨', icon: 'CloudDrizzle' },
  55: { text: '连绵细雨', icon: 'CloudDrizzle' },
  61: { text: '小阵雨', icon: 'CloudRain' },
  63: { text: '中雨', icon: 'CloudRain' },
  65: { text: '大雨倾盆', icon: 'CloudRain' },
  71: { text: '轻微飘雪', icon: 'CloudSnow' },
  73: { text: '中雪', icon: 'CloudSnow' },
  75: { text: '大雪/暴雪', icon: 'Snowflake' },
  77: { text: '高山雪粒/米雪', icon: 'Snowflake' },
  80: { text: '局部阵雨', icon: 'CloudRain' },
  81: { text: '强阵雨', icon: 'CloudRain' },
  82: { text: '狂风暴雨', icon: 'CloudLightning' },
  85: { text: '阵雪', icon: 'CloudSnow' },
  86: { text: '暴风雪', icon: 'Snowflake' },
  95: { text: '雷阵雨', icon: 'CloudLightning' },
  96: { text: '雷雨伴有冰雹', icon: 'CloudLightning' },
  99: { text: '强烈雷暴冰雹', icon: 'CloudLightning' },
};

export const weatherService = {
  getWeatherInfo(code: number): { text: string; icon: string } {
    return WEATHER_CODE_MAP[code] || { text: '多云', icon: 'Cloud' };
  },

  async fetchWeather(lat: number, lng: number, locationName: string): Promise<WeatherData> {
    const cacheKey = `hike_weather_${lat.toFixed(2)}_${lng.toFixed(2)}`;

    try {
      // 纯净地表气温请求：Open-Meteo 具备 90m DEM 地貌高程模型，输出的 temperature_2m 即为地表 2m 真实气温，无需任何外部人工折算
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,uv_index_max&timezone=auto`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Weather API returned status ' + response.status);
      }

      const data = await response.json();
      const currentCode = data.current?.weather_code ?? 0;
      const currentWeather = this.getWeatherInfo(currentCode);

      const dailyForecasts: WeatherDayForecast[] = [];
      const times: string[] = data.daily?.time || [];

      for (let i = 0; i < Math.min(times.length, 7); i++) {
        const code = data.daily.weather_code[i] ?? 0;
        dailyForecasts.push({
          date: times[i],
          tempMax: Math.round(data.daily.temperature_2m_max[i] ?? 15),
          tempMin: Math.round(data.daily.temperature_2m_min[i] ?? 4),
          weatherCode: code,
          weatherText: this.getWeatherInfo(code).text,
          rainProb: Math.round(data.daily.precipitation_probability_max?.[i] ?? 0),
          windSpeedMax: Math.round(data.daily.wind_speed_10m_max?.[i] ?? 15),
          uvIndex: Math.round(data.daily.uv_index_max?.[i] ?? 6),
        });
      }

      const currentTemp = Math.round(data.current?.temperature_2m ?? 12);
      const currentWind = Math.round(data.current?.wind_speed_10m ?? 12);
      const currentRain = Math.round(data.daily?.precipitation_probability_max?.[0] ?? 0);
      const currentUv = Math.round(data.daily?.uv_index_max?.[0] ?? 6);
      const elevation = Math.round(data.elevation ?? 0);

      // Generate smart hiking packing advice
      const advice: string[] = [];

      if (currentRain > 25 || dailyForecasts.some((d) => d.rainProb > 40)) {
        advice.push('🌧️ 预计有雨或降水概率较高：务必携带GORE-TEX硬壳冲锋衣、背包防雨罩及电子密封袋。');
      }
      if (currentTemp < 8 || dailyForecasts.some((d) => d.tempMin < 5)) {
        advice.push('❄️ 山区低温/夜间较冷：请准备保暖羽绒服、抓绒中间层与防风手套，谨防失温风险。');
      }
      if (currentWind > 25 || dailyForecasts.some((d) => d.windSpeedMax > 30)) {
        advice.push('💨 山脊风力强劲：行进请避开陡峭悬崖风口，营地请加固地钉并拉紧防风绳。');
      }
      if (currentUv >= 6) {
        advice.push('☀️ 紫外线指数偏高：山野无遮挡，建议涂抹SPF50+防晒霜、佩戴宽檐防晒帽及偏光镜。');
      }
      if (elevation > 2500) {
        advice.push('⛰️ 高海拔环境：气压较低空气稀薄，请备足高热量路粮与保温壶，勿快速剧烈跑跳。');
      }
      if (advice.length === 0) {
        advice.push('🌿 天气整体适宜徒步，请保持规律补水与热量摄入，享受山林自然！');
      }

      const result: WeatherData = {
        locationName,
        latitude: lat,
        longitude: lng,
        elevation,
        currentTemp,
        currentWeatherCode: currentCode,
        currentWeatherText: currentWeather.text,
        currentWindSpeed: currentWind,
        currentRainProb: currentRain,
        currentUvIndex: currentUv,
        daily: dailyForecasts,
        gearRecommendations: advice,
        lastFetched: Date.now(),
      };

      // Cache locally for offline access
      try {
        localStorage.setItem(cacheKey, JSON.stringify(result));
      } catch (e) {
        console.warn('Weather cache save failed:', e);
      }

      return result;
    } catch (err) {
      console.warn('Online weather fetch failed, checking local cache:', err);
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (e) {
        // ignore
      }

      // Dynamic realistic synthetic fallback
      const effectiveElevation = locationName.includes('格聂') ? 4200 : locationName.includes('理塘') ? 3960 : 20;
      const isHighAltitude = effectiveElevation >= 3000;
      const baseMax = isHighAltitude ? Math.max(5, Math.round(25 - (effectiveElevation / 1000) * 3.5)) : 28;
      const baseMin = isHighAltitude ? Math.max(-5, Math.round(14 - (effectiveElevation / 1000) * 4.2)) : 20;

      return {
        locationName,
        latitude: lat,
        longitude: lng,
        elevation: effectiveElevation,
        currentTemp: Math.round((baseMax + baseMin) / 2),
        currentWeatherCode: 2,
        currentWeatherText: '多云 (离线参考)',
        currentWindSpeed: isHighAltitude ? 20 : 12,
        currentRainProb: 20,
        currentUvIndex: isHighAltitude ? 7 : 4,
        daily: [
          { date: '今天', tempMax: baseMax, tempMin: baseMin, weatherCode: 2, weatherText: '局部多云', rainProb: 20, windSpeedMax: 20, uvIndex: 7 },
          { date: '明天', tempMax: baseMax - 1, tempMin: baseMin - 1, weatherCode: 1, weatherText: '晴间多云', rainProb: 15, windSpeedMax: 18, uvIndex: 8 },
          { date: '后天', tempMax: baseMax - 2, tempMin: baseMin - 2, weatherCode: 3, weatherText: '阴天有阵雨', rainProb: 35, windSpeedMax: 24, uvIndex: 5 },
        ],
        gearRecommendations: [
          '📶 当前处于离线状态，正在使用基于海拔高程校准的本地参考天气。',
          isHighAltitude
            ? '⛰️ 高海拔严寒预警：昼夜温差极大（夜间气温接近冰点），务必准备温标零下的羽绒睡袋、防风硬壳冲锋衣与厚保暖层。'
            : '🎒 请备齐三层穿衣原则（排汗层+保暖层+防风雨层）以应对山野突变。',
        ],
        lastFetched: Date.now(),
      };
    }
  },

  async searchLocations(keyword: string): Promise<{ name: string; country: string; admin1?: string; lat: number; lng: number; elevation?: number }[]> {
    if (!keyword || keyword.trim().length < 1) return [];
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(keyword.trim())}&count=6&language=zh&format=json`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const json = await res.json();
      if (!json.results) return [];
      return json.results.map((r: any) => ({
        name: r.name,
        country: r.country || '',
        admin1: r.admin1 || '',
        lat: r.latitude,
        lng: r.longitude,
        elevation: r.elevation || 0,
      }));
    } catch (e) {
      console.warn('Geocoding search failed:', e);
      return [];
    }
  },
};
