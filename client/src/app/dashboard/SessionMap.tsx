/**
 * 会话地图组件
 * 使用 Leaflet 显示会话位置
 */

'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// 修复 Leaflet 默认图标问题
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: () => string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface SessionMapProps {
  lat?: number;
  lng?: number;
}

// 地图视图更新组件
function MapUpdater({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView([lat, lng], 10);
  }, [map, lat, lng]);

  return null;
}

export default function SessionMap({
  lat = 36.1699,
  lng = -115.1398,
}: SessionMapProps) {
  return (
    <div className="h-full w-full relative overflow-hidden rounded-xl">
      <MapContainer
        center={[lat, lng]}
        zoom={10}
        scrollWheelZoom={false}
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
        className="rounded-xl"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Circle
          center={[lat, lng]}
          radius={3000}
          pathOptions={{
            fillColor: 'blue',
            fillOpacity: 0.2,
            color: 'blue',
            weight: 2,
          }}
        />
        <MapUpdater lat={lat} lng={lng} />
      </MapContainer>
    </div>
  );
}
