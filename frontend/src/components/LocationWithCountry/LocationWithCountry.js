import React, { useState, useEffect } from 'react';
import { Switch, FormControlLabel } from '@mui/material';

const LocationWithCountry = () => {
  const [location, setLocation] = useState(null);
  const [country, setCountry] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);

  const getCountry = async (lat, lon) => {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'MyApp/1.0 (example@example.com)',
        },
      });
      const data = await response.json();

      if (data.error) {
        setError('Unable to retrieve country.');
      } else {
        setCountry(data.address.country);
      }
    } catch (err) {
      setError('Error fetching country: ' + err.message);
    }
  };

  const handleToggle = (event) => {
    const checked = event.target.checked;
    setEnabled(checked);

    if (checked && navigator.geolocation) {
      setIsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ latitude, longitude });
          getCountry(latitude, longitude).finally(() => {
            setIsLoading(false);
          });
        },
        (err) => {
          setError('Error getting location: ' + err.message);
          setIsLoading(false);
        }
      );
    }else{
      setCountry(null)
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
  <FormControlLabel
    control={<Switch checked={enabled} onChange={handleToggle} />}
    label="Enable Location Access"
  />
  {country && (
    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <h3 style={{ margin: 0 }}>Location:</h3>
      <p style={{ margin: 0 }}>{country}</p>
    </div>
  )}
</div>
  );
};

export default LocationWithCountry;
