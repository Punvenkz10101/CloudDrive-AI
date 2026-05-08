import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface ThreatLocation {
  lat: number;
  lon: number;
  country: string;
  city: string;
  street?: string;
  count: number;
  userId?: string;
  timestamp?: string;
}

interface ThreatMapProps {
  locations: ThreatLocation[];
}

const ThreatMap: React.FC<ThreatMapProps> = ({ locations }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const layerGroup = useRef<L.LayerGroup | null>(null);
  const hasUserMovedMap = useRef(false);
  const lastAutoFitKey = useRef('');

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    // 1. Initialize Native Leaflet Map
    leafletMap.current = L.map(mapRef.current, {
      center: [20, 0],
      zoom: 2,
      zoomControl: true,
      scrollWheelZoom: true,
      attributionControl: true
    });

    // 2. Add OSM Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      className: 'map-tiles-inverted' // Custom class for darkening
    }).addTo(leafletMap.current);

    // 3. Initialize Layer Group for markers
    layerGroup.current = L.layerGroup().addTo(leafletMap.current);

    // Stop forcing viewport changes after the operator manually explores the map.
    leafletMap.current.on('dragstart zoomstart', () => {
      hasUserMovedMap.current = true;
    });

    // Dark Mode Effect (Inversion happens via CSS usually, or filter)
    const mapElement = mapRef.current;
    if (mapElement) {
       mapElement.style.filter = 'invert(0.9) hue-rotate(180deg) brightness(0.9)';
    }

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  // Sync Markers and View whenever locations change
  useEffect(() => {
    if (!leafletMap.current || !layerGroup.current) return;

    // Clear existing markers
    layerGroup.current.clearLayers();

    if (locations.length === 0) return;

    const points: L.LatLngExpression[] = [];

    const coordKeyParts: string[] = [];

    locations.forEach(loc => {
      if (!Number.isFinite(loc.lat) || !Number.isFinite(loc.lon)) return;

      const latLng: [number, number] = [loc.lat, loc.lon];
      points.push(latLng);
      coordKeyParts.push(`${loc.lat.toFixed(6)}:${loc.lon.toFixed(6)}`);

      // Add attack-source circles at the exact coordinates returned by backend geo lookup.
      const circle = L.circle(latLng, {
        radius: Math.max(50, 100 + loc.count * 20), // neighborhood scale
        fillColor: '#0ea5e9',
        fillOpacity: 0.35,
        color: '#0369a1',
        weight: 2
      });

      // Simple Popup styling
      const popupContent = `
        <div style="font-family: sans-serif; min-width: 150px; color: #1e293b;">
          <h4 style="margin: 0 0 5px; color: #0369a1; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; font-size: 11px; text-transform: uppercase;">Attack Source</h4>
          <div style="font-weight: bold; font-size: 14px; margin-bottom: 2px;">${loc.city}, ${loc.country}</div>
          <div style="font-size: 11px; color: #334155; margin: 4px 0;">Lat ${loc.lat.toFixed(6)}, Lon ${loc.lon.toFixed(6)}</div>
          <div style="font-size: 12px; font-family: monospace; color: #059669; background: #ecfdf5; padding: 2px 4px; border-radius: 4px;">${loc.street || 'Precision Neighborhood'}</div>
          <div style="margin-top: 8px; display: flex; justify-content: space-between; font-size: 10px; color: #64748b;">
             <span>Bot: ${loc.userId || 'ident-x'}</span>
             <span>Hits: ${loc.count}</span>
          </div>
        </div>
      `;

      circle.bindPopup(popupContent).addTo(layerGroup.current!);
    });

    // Auto-fit to threats if they appear
    if (points.length > 0) {
      const currentKey = coordKeyParts.sort().join('|');
      const shouldAutoFit = !hasUserMovedMap.current && currentKey !== lastAutoFitKey.current;

      if (shouldAutoFit) {
      const bounds = L.latLngBounds(points);
      leafletMap.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        lastAutoFitKey.current = currentKey;
      }
    }
  }, [locations]);

  return (
    <Card className="w-full h-full relative border-slate-800 bg-slate-950 shadow-2xl overflow-hidden min-h-[500px]">
      <CardHeader className="border-b border-slate-800 pb-4 bg-slate-950/90 backdrop-blur-md z-10 sticky top-0">
        <CardTitle className="text-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 bg-sky-500 rounded-full ring-4 ring-sky-500/20" />
             Attack Source Map
          </div>
          {locations.length > 0 && (
            <span className="text-[10px] bg-sky-900/30 text-sky-400 px-2 py-0.5 rounded-full border border-sky-900/50">
               {locations.length} ACTIVE SOURCE{locations.length > 1 ? 'S' : ''}
            </span>
          )}
        </CardTitle>
        <CardDescription className="text-slate-400">Exact attack coordinates from geo-enriched blocked events</CardDescription>
      </CardHeader>
      <CardContent className="bg-slate-900 p-0 relative h-[450px]">
        {locations.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-[2000] text-slate-400">
            <div className="w-12 h-12 border border-emerald-500/30 rounded-full flex items-center justify-center mb-4">
               <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            </div>
            <h3 className="text-slate-200 text-sm font-medium">Scanning Global Horizons...</h3>
            <p className="text-xs text-slate-500">ML filters are processing live traffic.</p>
          </div>
        )}
        <div ref={mapRef} className="w-full h-full z-0 bg-slate-900" />
      </CardContent>
    </Card>
  );
};

export default ThreatMap;
