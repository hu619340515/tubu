import * as fflate from 'fflate';
import { ParsedTrack, TrackPoint, TrackSegment, TrackWaypoint } from '../types/track';

function calcDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatTimestampToCst(dateOrString: string | number | Date): string {
  try {
    const d = typeof dateOrString === 'object' && dateOrString instanceof Date ? dateOrString : new Date(dateOrString);
    if (isNaN(d.getTime())) return '';
    // Convert to China Standard Time (UTC+8)
    const bj = new Date(d.getTime() + (8 * 60 + d.getTimezoneOffset()) * 60000);
    const p = (n: number) => n.toString().padStart(2, '0');
    return `${bj.getFullYear()}-${p(bj.getMonth() + 1)}-${p(bj.getDate())} ${p(bj.getHours())}:${p(bj.getMinutes())}:${p(bj.getSeconds())}`;
  } catch {
    return '';
  }
}

export const trackParserService = {
  /**
   * Parse KMZ file (zipped KML)
   */
  async parseKmz(buffer: ArrayBuffer): Promise<ParsedTrack> {
    const uint8 = new Uint8Array(buffer);
    const unzipped = fflate.unzipSync(uint8);
    
    // Look for doc.kml or any .kml file
    let kmlText = '';
    for (const [filename, data] of Object.entries(unzipped)) {
      if (filename.toLowerCase().endsWith('.kml')) {
        kmlText = fflate.strFromU8(data);
        break;
      }
    }

    if (!kmlText) {
      throw new Error('KMZ 压缩包内未找到有效的 .kml 轨迹文件');
    }

    return this.parseKml(kmlText);
  },

  /**
   * Parse KML text content (from 2bulu / Google Earth)
   */
  parseKml(kmlText: string): ParsedTrack {
    const parser = new DOMParser();
    const xml = parser.parseFromString(kmlText, 'text/xml');

    const parseError = xml.querySelector('parsererror');
    if (parseError) {
      throw new Error('KML XML 解析失败：' + parseError.textContent);
    }

    const doc = xml.querySelector('Document') || xml.documentElement;
    const nameEl = doc.querySelector('name');
    const title = nameEl?.textContent?.trim() || '未命名户外路线';
    const descEl = doc.querySelector('description');
    const description = descEl?.textContent?.trim() || '';
    const authorEl = doc.querySelector('author');
    const author = authorEl?.textContent?.trim() || '';

    // Read ExtendedData
    let extDistanceKm = 0;
    let extElevationGain = 0;
    let extElevationLoss = 0;
    doc.querySelectorAll('ExtendedData > Data').forEach((dataEl) => {
      const name = dataEl.getAttribute('name');
      const val = dataEl.querySelector('value')?.textContent || '';
      if (name === 'Distance') {
        const m = parseFloat(val);
        if (!isNaN(m)) extDistanceKm = +(m / 1000).toFixed(2);
      } else if (name === 'ElevationGain') {
        const m = parseFloat(val);
        if (!isNaN(m)) extElevationGain = Math.round(m);
      } else if (name === 'ElevationLoss') {
        const m = parseFloat(val);
        if (!isNaN(m)) extElevationLoss = Math.round(m);
      }
    });

    // Parse Waypoints (Placemarks with Point)
    const waypoints: TrackWaypoint[] = [];
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    let minEle = 99999, maxEle = -99999;

    const placemarks = xml.querySelectorAll('Placemark');
    placemarks.forEach((pm, idx) => {
      const pointEl = pm.querySelector('Point > coordinates');
      if (pointEl && pointEl.textContent) {
        const parts = pointEl.textContent.trim().split(/[\s,]+/);
        if (parts.length >= 2) {
          const lng = parseFloat(parts[0]);
          const lat = parseFloat(parts[1]);
          const ele = parts.length >= 3 ? parseFloat(parts[2]) : 0;

          if (!isNaN(lat) && !isNaN(lng)) {
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
            if (!isNaN(ele) && ele > 0) {
              minEle = Math.min(minEle, ele);
              maxEle = Math.max(maxEle, ele);
            }

            const pmName = pm.querySelector('name')?.textContent?.trim() || '';
            const pmDesc = pm.querySelector('description')?.textContent || '';
            const pmId = pm.getAttribute('id') || `wpt-${idx}`;

            // Extract photo url if present
            let imageUrl: string | undefined;
            const imgMatch = pmDesc.match(/<img[^>]+src=["']([^"']+)["']/i);
            if (imgMatch) {
              imageUrl = imgMatch[1];
            }

            // Extract photo timestamp
            let photoTime: string | undefined;
            const whenEl = pm.querySelector('TimeStamp > when');
            if (whenEl && whenEl.textContent) {
              photoTime = formatTimestampToCst(whenEl.textContent.trim());
            }
            if (!photoTime) {
              const dataTime = pm.querySelector('Data[name="Time"] > value');
              if (dataTime && dataTime.textContent) {
                const ts = parseInt(dataTime.textContent.trim(), 10);
                if (!isNaN(ts)) {
                  photoTime = formatTimestampToCst(ts);
                }
              }
            }

            // Categorize waypoint
            let type: TrackWaypoint['type'] = 'point';
            if (pmId === 'startPoint' || pmName.includes('起点')) type = 'start';
            else if (pmId === 'endPoint' || pmName.includes('终点')) type = 'end';
            else if (pmName.includes('营地') || pmName.includes('宿') || pmName.includes('扎营')) type = 'camp';
            else if (pmName.includes('垭口') || pmName.includes('峰') || pmName.includes('顶')) type = 'pass';
            else if (imageUrl || pmName.includes('眼') || pmName.includes('湖')) type = 'photo';

            waypoints.push({
              id: pmId,
              name: pmName || (type === 'photo' ? '实景打卡' : `标点 ${idx + 1}`),
              lat,
              lng,
              ele: isNaN(ele) ? undefined : Math.round(ele),
              description: pmDesc.replace(/<[^>]+>/g, ' ').trim(),
              imageUrl,
              type,
              time: photoTime,
            });
          }
        }
      }
    });

    // Parse Track Segments (<gx:Track> or <LineString>)
    const segments: TrackSegment[] = [];
    const allPoints: TrackPoint[] = [];

    let runningDistKm = 0;
    let prevPoint: TrackPoint | null = null;

    placemarks.forEach((pm, sIdx) => {
      // 1. Try gx:Track
      const gxCoords = pm.querySelectorAll('Track > coord, gx\\:Track > gx\\:coord');
      const segmentPoints: TrackPoint[] = [];
      const segName = pm.querySelector('name')?.textContent?.trim() || `轨迹片段 ${sIdx + 1}`;

      if (gxCoords.length > 0) {
        gxCoords.forEach((cEl) => {
          const parts = (cEl.textContent || '').trim().split(/\s+/);
          if (parts.length >= 2) {
            const lng = parseFloat(parts[0]);
            const lat = parseFloat(parts[1]);
            const ele = parts.length >= 3 ? parseFloat(parts[2]) : 0;

            if (!isNaN(lat) && !isNaN(lng)) {
              minLat = Math.min(minLat, lat);
              maxLat = Math.max(maxLat, lat);
              minLng = Math.min(minLng, lng);
              maxLng = Math.max(maxLng, lng);
              if (!isNaN(ele) && ele > 0) {
                minEle = Math.min(minEle, ele);
                maxEle = Math.max(maxEle, ele);
              }

              if (prevPoint) {
                runningDistKm += calcDistanceKm(prevPoint.lat, prevPoint.lng, lat, lng);
              }

              const pt: TrackPoint = {
                lat,
                lng,
                ele: isNaN(ele) ? 0 : Math.round(ele * 10) / 10,
                distanceKm: +runningDistKm.toFixed(2),
              };

              prevPoint = pt;
              segmentPoints.push(pt);
              allPoints.push(pt);
            }
          }
        });
      } else {
        // 2. Try LineString
        const lineCoords = pm.querySelector('LineString > coordinates');
        if (lineCoords && lineCoords.textContent) {
          const entries = lineCoords.textContent.trim().split(/\s+/);
          entries.forEach((entry) => {
            const parts = entry.split(',');
            if (parts.length >= 2) {
              const lng = parseFloat(parts[0]);
              const lat = parseFloat(parts[1]);
              const ele = parts.length >= 3 ? parseFloat(parts[2]) : 0;

              if (!isNaN(lat) && !isNaN(lng)) {
                minLat = Math.min(minLat, lat);
                maxLat = Math.max(maxLat, lat);
                minLng = Math.min(minLng, lng);
                maxLng = Math.max(maxLng, lng);
                if (!isNaN(ele) && ele > 0) {
                  minEle = Math.min(minEle, ele);
                  maxEle = Math.max(maxEle, ele);
                }

                if (prevPoint) {
                  runningDistKm += calcDistanceKm(prevPoint.lat, prevPoint.lng, lat, lng);
                }

                const pt: TrackPoint = {
                  lat,
                  lng,
                  ele: isNaN(ele) ? 0 : Math.round(ele * 10) / 10,
                  distanceKm: +runningDistKm.toFixed(2),
                };

                prevPoint = pt;
                segmentPoints.push(pt);
                allPoints.push(pt);
              }
            }
          });
        }
      }

      if (segmentPoints.length > 0) {
        let segGain = 0;
        let segLoss = 0;
        let segMaxEle = -99999;
        let segMinEle = 99999;

        for (let i = 1; i < segmentPoints.length; i++) {
          const diff = segmentPoints[i].ele - segmentPoints[i - 1].ele;
          if (diff > 0) segGain += diff;
          else segLoss += Math.abs(diff);
          segMaxEle = Math.max(segMaxEle, segmentPoints[i].ele);
          segMinEle = Math.min(segMinEle, segmentPoints[i].ele);
        }

        const segDist = segmentPoints[segmentPoints.length - 1].distanceKm! - segmentPoints[0].distanceKm!;

        segments.push({
          id: `seg-${segments.length + 1}`,
          name: segName,
          points: segmentPoints,
          distanceKm: +segDist.toFixed(2),
          elevationGain: Math.round(segGain),
          elevationLoss: Math.round(segLoss),
          maxElevation: Math.round(segMaxEle),
          minElevation: Math.round(segMinEle),
        });
      }
    });

    const totalDist = extDistanceKm > 0 ? extDistanceKm : +runningDistKm.toFixed(2);

    // Calculate distance along track from start and to end for each waypoint
    if (allPoints.length > 0) {
      waypoints.forEach((wpt) => {
        let minDistSq = Infinity;
        let closestDist = 0;
        for (let i = 0; i < allPoints.length; i++) {
          const pt = allPoints[i];
          const dLat = pt.lat - wpt.lat;
          const dLng = (pt.lng - wpt.lng) * Math.cos(((wpt.lat + pt.lat) / 2) * (Math.PI / 180));
          const distSq = dLat * dLat + dLng * dLng;
          if (distSq < minDistSq) {
            minDistSq = distSq;
            closestDist = pt.distanceKm || 0;
          }
        }
        wpt.distFromStartKm = +closestDist.toFixed(1);
        wpt.distToEndKm = +Math.max(0, totalDist - closestDist).toFixed(1);
      });
    }

    return {
      id: `track-${Date.now()}`,
      title,
      description,
      author,
      totalDistanceKm: totalDist,
      elevationGain: extElevationGain > 0 ? extElevationGain : Math.round(extElevationGain),
      elevationLoss: extElevationLoss > 0 ? extElevationLoss : Math.round(extElevationLoss),
      maxElevation: maxEle > 0 ? Math.round(maxEle) : 0,
      minElevation: minEle < 99999 ? Math.round(minEle) : 0,
      segments,
      allPoints,
      waypoints,
      bounds: {
        minLat: minLat < 90 ? minLat : 29.7,
        maxLat: maxLat > -90 ? maxLat : 29.9,
        minLng: minLng < 180 ? minLng : 99.5,
        maxLng: maxLng > -180 ? maxLng : 99.8,
      },
    };
  },

  /**
   * Parse GPX file
   */
  parseGpx(gpxText: string): ParsedTrack {
    const parser = new DOMParser();
    const xml = parser.parseFromString(gpxText, 'text/xml');

    const title = xml.querySelector('gpx > metadata > name')?.textContent?.trim() || 'GPX 徒步轨迹';
    const description = xml.querySelector('gpx > metadata > desc')?.textContent?.trim() || '';

    const waypoints: TrackWaypoint[] = [];
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    let minEle = 99999, maxEle = -99999;

    // Parse WPT
    xml.querySelectorAll('wpt').forEach((wEl, idx) => {
      const lat = parseFloat(wEl.getAttribute('lat') || '');
      const lng = parseFloat(wEl.getAttribute('lon') || '');
      const ele = parseFloat(wEl.querySelector('ele')?.textContent || '0');
      const name = wEl.querySelector('name')?.textContent?.trim() || `航点 ${idx + 1}`;
      const desc = wEl.querySelector('desc')?.textContent?.trim() || '';

      const time = wEl.querySelector('time')?.textContent?.trim();
      const photoTime = time ? formatTimestampToCst(time) : undefined;

      if (!isNaN(lat) && !isNaN(lng)) {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        if (!isNaN(ele) && ele > 0) {
          minEle = Math.min(minEle, ele);
          maxEle = Math.max(maxEle, ele);
        }

        waypoints.push({
          id: `wpt-${idx}`,
          name,
          lat,
          lng,
          ele: Math.round(ele),
          description: desc,
          type: name.includes('营地') ? 'camp' : name.includes('垭口') ? 'pass' : 'point',
          time: photoTime,
        });
      }
    });

    const segments: TrackSegment[] = [];
    const allPoints: TrackPoint[] = [];
    let runningDistKm = 0;
    let prevPoint: TrackPoint | null = null;
    let totalGain = 0;
    let totalLoss = 0;

    xml.querySelectorAll('trk').forEach((trkEl, tIdx) => {
      const trkName = trkEl.querySelector('name')?.textContent?.trim() || `轨迹段 ${tIdx + 1}`;
      const segPoints: TrackPoint[] = [];

      trkEl.querySelectorAll('trkpt').forEach((ptEl) => {
        const lat = parseFloat(ptEl.getAttribute('lat') || '');
        const lng = parseFloat(ptEl.getAttribute('lon') || '');
        const ele = parseFloat(ptEl.querySelector('ele')?.textContent || '0');
        const time = ptEl.querySelector('time')?.textContent?.trim();

        if (!isNaN(lat) && !isNaN(lng)) {
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
          minLng = Math.min(minLng, lng);
          maxLng = Math.max(maxLng, lng);
          if (!isNaN(ele) && ele > 0) {
            minEle = Math.min(minEle, ele);
            maxEle = Math.max(maxEle, ele);
          }

          if (prevPoint) {
            const dist = calcDistanceKm(prevPoint.lat, prevPoint.lng, lat, lng);
            runningDistKm += dist;
            const diff = ele - prevPoint.ele;
            if (diff > 0) totalGain += diff;
            else totalLoss += Math.abs(diff);
          }

          const pt: TrackPoint = {
            lat,
            lng,
            ele: isNaN(ele) ? 0 : Math.round(ele),
            time,
            distanceKm: +runningDistKm.toFixed(2),
          };

          prevPoint = pt;
          segPoints.push(pt);
          allPoints.push(pt);
        }
      });

      if (segPoints.length > 0) {
        segments.push({
          id: `seg-${tIdx + 1}`,
          name: trkName,
          points: segPoints,
          distanceKm: +(segPoints[segPoints.length - 1].distanceKm! - segPoints[0].distanceKm!).toFixed(2),
          elevationGain: Math.round(totalGain),
          elevationLoss: Math.round(totalLoss),
          maxElevation: Math.round(maxEle),
          minElevation: Math.round(minEle),
        });
      }
    });

    // Calculate distance along track from start and to end for each waypoint
    if (allPoints.length > 0) {
      waypoints.forEach((wpt) => {
        let minDistSq = Infinity;
        let closestDist = 0;
        for (let i = 0; i < allPoints.length; i++) {
          const pt = allPoints[i];
          const dLat = pt.lat - wpt.lat;
          const dLng = (pt.lng - wpt.lng) * Math.cos(((wpt.lat + pt.lat) / 2) * (Math.PI / 180));
          const distSq = dLat * dLat + dLng * dLng;
          if (distSq < minDistSq) {
            minDistSq = distSq;
            closestDist = pt.distanceKm || 0;
          }
        }
        wpt.distFromStartKm = +closestDist.toFixed(1);
        wpt.distToEndKm = +Math.max(0, runningDistKm - closestDist).toFixed(1);
      });
    }

    return {
      id: `track-${Date.now()}`,
      title,
      description,
      totalDistanceKm: +runningDistKm.toFixed(2),
      elevationGain: Math.round(totalGain),
      elevationLoss: Math.round(totalLoss),
      maxElevation: Math.round(maxEle),
      minElevation: Math.round(minEle),
      segments,
      allPoints,
      waypoints,
      bounds: {
        minLat,
        maxLat,
        minLng,
        maxLng,
      },
    };
  },

  /**
   * Load the built-in Genye V-Line demo track
   */
  async loadBuiltinGenyeTrack(): Promise<ParsedTrack> {
    const res = await fetch('/tracks/genye-v-line.kmz');
    if (!res.ok) {
      throw new Error('无法下载内置格聂牧场V线轨迹文件');
    }
    const buf = await res.arrayBuffer();
    return this.parseKmz(buf);
  },
};
