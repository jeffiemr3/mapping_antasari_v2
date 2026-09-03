import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { ROUTE_COLORS } from '../data/constants';

export default function MapView({ assignments, ordersMap, warehouse, focusedVehicleIdx }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const routeLayerRef = useRef(null);
  const markerLayerRef = useRef(null);

  // Inisialisasi peta sekali saja
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: [warehouse.lat, warehouse.lng], zoom: 11 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
    }).addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    markerLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-center kalau titik awal gudang berubah
  useEffect(() => {
    if (mapRef.current) mapRef.current.setView([warehouse.lat, warehouse.lng], 11);
  }, [warehouse.lat, warehouse.lng]);

  // Gambar ulang marker & rute setiap kali alokasi berubah
  useEffect(() => {
    const map = mapRef.current;
    const routeLayer = routeLayerRef.current;
    const markerLayer = markerLayerRef.current;
    if (!map || !routeLayer || !markerLayer) return;
    routeLayer.clearLayers();
    markerLayer.clearLayers();

    const bounds = [[warehouse.lat, warehouse.lng]];

    const warehouseIcon = L.divIcon({
      html: '<div style="background:#111218;border:2px solid #F2A93B;color:#fff;width:36px;height:36px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,.4)">🏭</div>',
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
    L.marker([warehouse.lat, warehouse.lng], { icon: warehouseIcon })
      .bindPopup(`<strong>Titik Awal (${warehouse.name || 'Gudang'})</strong>`)
      .addTo(markerLayer);

    assignments.forEach((stopIds, vehicleIdx) => {
      if (!stopIds || stopIds.length === 0) return;
      if (focusedVehicleIdx !== null && focusedVehicleIdx !== vehicleIdx) return;
      const color = ROUTE_COLORS[vehicleIdx % ROUTE_COLORS.length];
      const path = [[warehouse.lat, warehouse.lng]];

      stopIds.forEach((id, stopIdx) => {
        const order = ordersMap[id];
        if (!order || !order.lat || !order.lng) return;
        path.push([order.lat, order.lng]);
        bounds.push([order.lat, order.lng]);
        const stopIcon = L.divIcon({
          html: `<div style="width:28px;height:28px;border-radius:999px;color:#fff;font-weight:bold;font-size:12px;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);background-color:${color}">${
            stopIdx + 1
          }</div>`,
          className: '',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const itemsHtml = order.lines.map((l) => `<li>${l.itemName} (x${l.qty} ${l.uom})</li>`).join('');
        L.marker([order.lat, order.lng], { icon: stopIcon })
          .bindPopup(
            `<strong>${stopIdx + 1}. ${order.customer}</strong><br/>${order.address}<br/><ul style="margin:4px 0 0;padding-left:16px">${itemsHtml}</ul>`
          )
          .addTo(markerLayer);
      });

      if (path.length > 1) {
        L.polyline(path, { color, weight: 3, opacity: 0.8 }).addTo(routeLayer);
      }
    });

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [assignments, ordersMap, warehouse, focusedVehicleIdx]);

  return <div ref={containerRef} className="w-full h-full rounded-2xl overflow-hidden" style={{ minHeight: 400 }} />;
}
