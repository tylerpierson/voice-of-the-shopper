import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapPopup.scss';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix Leaflet's default marker icon
L.Marker.prototype.options.icon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const MapPopup = ({ show, onClose, position, onLocationSelect, draggable = true }) => {
  const [markerPos, setMarkerPos] = useState(position);
  const mapRef = useRef();

  useEffect(() => {
    setMarkerPos(position); // Reset marker if position prop changes
  }, [position]);

  useEffect(() => {
    if (show && mapRef.current) {
      setTimeout(() => {
        mapRef.current.invalidateSize();
        mapRef.current.setView(markerPos);
      }, 300);
    }
  }, [show, markerPos]);

  const handleDragEnd = async (e) => {
  const newPos = e.target.getLatLng();
  setMarkerPos(newPos);

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${newPos.lat}&lon=${newPos.lng}`
    );
    const data = await response.json();
    const address = data.display_name || "Address not found";

    if (onLocationSelect) {
      onLocationSelect({
        lat: newPos.lat,
        lng: newPos.lng,
        address: address,
      });
    }
    
    // Close the modal once the address is selected
    onClose();
  } catch (error) {
    console.error("Reverse geocoding failed:", error);
    if (onLocationSelect) {
      onLocationSelect({
        lat: newPos.lat,
        lng: newPos.lng,
        address: "Unable to fetch address",
      });
    }

    // Close modal in case of an error
    onClose();
  }
};

  

  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-button" onClick={onClose}>×</button>

        <MapContainer
          center={markerPos}
          zoom={13}
          scrollWheelZoom={false}
          whenCreated={(mapInstance) => {
            mapRef.current = mapInstance;
          }}
          style={{ height: '400px', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <Marker
            position={markerPos}
            draggable={draggable}
            eventHandlers={draggable ? { dragend: handleDragEnd } : {}}
          >
            <Popup>
              {draggable ? 'Drag me to change location' : 'Selected location'}
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
};

export default MapPopup;
