import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import './MapWithFeedback.scss';


const feedbackCount = {
    USA: 2,
    Canada: 2,
    India: 2,
};

const countryCoordinates = {
    USA: [37.0902, -95.7129],
    Canada: [56.1304, -106.3468],
    India: [20.5937, 78.9629],
};

const createCustomIcon = (count) =>
    L.divIcon({
        html: `<div class="custom-marker">${count}</div>`,
        className: '', // Prevent default marker styles
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30],
    });

function MapWithFeedback() {
const [feedbackCount, setFeedbackCount] = useState({}); 
const [mapInstance, setMapInstance] = useState(null);
useEffect(() => {
    setFeedbackCount({
      USA: 2,
      Canada: 2,
      India: 2,
    });
    console.log("Rendering with feedbackCount:", feedbackCount);
  }, []);

const fetchLocationCount = async () => {
    try {
        const res = await fetch("http://localhost:8000/get-locationCount");
        const data = await res.json();

        const countMap = {};
        data.forEach(item => {
            countMap[item.location] = item.count;
        });
        console.log('fetching feedback count:', countMap);
        setFeedbackCount(countMap);
    } catch (err) {
        console.error("Failed to load summaries:", err);
    }
};
    
return (
        <MapContainer center={[20, 0]} zoom={2} style={{ height: '700px', width: '100%' }} whenCreated={setMapInstance} class="style.container">
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution=""
            />
            {Object.entries(feedbackCount).map(([location, count]) => {
  const coords = countryCoordinates[location];
  if (!coords) return null; // skip if no coordinates

  return (
    <Marker
      key={location}
      position={coords}
      icon={createCustomIcon(count)}
    >
      <Popup>
        {location}: {count} feedback(s)
      </Popup>
    </Marker>
  );
})}

        </MapContainer>
    );
};

export default MapWithFeedback;
