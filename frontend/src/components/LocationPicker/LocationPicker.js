import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import style from "./FeedbackChat.module.scss";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const LocationMarker = ({ position, setPosition }) => {
  const markerRef = useRef(null); // Create a reference to the marker

  useEffect(() => {
    // Attach the dragend event listener to the marker when the ref is set
    if (markerRef.current) {
      markerRef.current.on('dragend', (e) => {
        const newLatLng = e.target.getLatLng(); // Get the new position
        setPosition(newLatLng); // Update the position state
      });
    }
  }, []); // Empty dependency array ensures this effect runs once when the component mounts

  return position === null ? null : (
    <Marker
      ref={markerRef} // Assign the ref to the Marker
      position={position}
      draggable={true}
    />
  );
};

const LocationPicker = () => {
  const [position, setPosition] = useState({ lat: 51.505, lng: -0.09 });
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMapVisible, setIsMapVisible] = useState(false); // Track map visibility

  useEffect(() => {
    const fetchAddress = async () => {
      setLoading(true);
      try {
        const res = await axios.get(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${position.lat}&lon=${position.lng}`
        );
        setAddress(res.data.display_name);
      } catch (err) {
        setAddress('Unable to fetch address');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (position) fetchAddress();
  }, [position]);

  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setPosition({
            lat: latitude,
            lng: longitude,
          });
  
          // Fetch address using the lat and lng
          try {
            setLoading(true);
            const res = await axios.get(
              `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
            );
            setAddress(res.data.display_name); // Update address state
          } catch (err) {
            setAddress('Unable to fetch address');
            console.error(err);
          } finally {
            setLoading(false);
          }
        },
        (error) => {
          console.error(error);
          switch (error.code) {
            case error.PERMISSION_DENIED:
              alert('Location access denied. Please enable location in your browser settings.');
              break;
            case error.POSITION_UNAVAILABLE:
              alert('Position unavailable. Try again later.');
              break;
            case error.TIMEOUT:
              alert('Location request timed out. Try again later.');
              break;
            default:
              alert('Could not retrieve your location. Please try again.');
          }
        },
        {
          enableHighAccuracy: true, // Request for more accurate location (can fail if signal is weak)
          timeout: 10000,
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };
  
  
  const toggleMapVisibility = () => {
    setIsMapVisible((prevState) => !prevState); // Toggle the map visibility
  };

  return (
    <div style={{ width: '100%', textAlign: 'center' }}>
      <h2 className="text-xl font-bold mb-2">Select Location</h2>

      {/* Button to toggle map visibility */}
      <button
        onClick={toggleMapVisibility}
        className={style.showMapButton}
        style={{ margin: 20 }}
      >
        {isMapVisible ? 'Hide Map' : 'Show Map'}
      </button>

      {/* Map visibility controlled by isMapVisible state */}
      {isMapVisible && (
        <div style={{ height: '400px', marginBottom: '1rem' }}>
          <MapContainer
            center={position}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker position={position} setPosition={setPosition} />
            <ZoomControl position="topright" />
          </MapContainer>
        </div>
      )}

      {/* Show button to use current location */}
      <button
        onClick={handleUseMyLocation}
        className="p-2 bg-green-500 text-white mb-2"
        style={{ borderRadius: '4px' }}
      >
        Use My Location
      </button>

      {/* Display fetched address */}
      {loading ? (
        <p>Loading address...</p>
      ) : (
        <div style={{ marginTop: '1rem' }}>
          <p><strong>Latitude:</strong> {position.lat}</p>
          <p><strong>Longitude:</strong> {position.lng}</p>
          <p><strong>Address:</strong> {address}</p>
        </div>
      )}
    </div>
  );
};

export default LocationPicker;