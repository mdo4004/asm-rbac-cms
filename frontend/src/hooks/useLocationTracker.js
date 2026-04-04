import { useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';

/**
 * Reverse-geocode lat/lng → address parts using OpenStreetMap Nominatim (FREE, no API key).
 */
async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    const a = data.address || {};
    return {
      address:  data.display_name || '',
      house_no: a.house_number || a.building || '',
      street:   a.road || a.street || a.neighbourhood || '',
      city:     a.city || a.town || a.village || a.county || '',
      state:    a.state || '',
      pincode:  a.postcode || '',
    };
  } catch {
    return { address: `${lat}, ${lng}`, house_no:'', street:'', city:'', state:'', pincode:'' };
  }
}

/**
 * Get current GPS position (Promise wrapper).
 */
function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported by this browser'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000,
    });
  });
}

/**
 * Milliseconds until next HH:MM today (or tomorrow if already past).
 */
function msUntil(hour, minute) {
  const now    = new Date();
  const target = new Date();
  target.setHours(hour, minute, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1); // tomorrow
  return target.getTime() - now.getTime();
}

/**
 * useLocationTracker
 * Call once when the user is authenticated.
 * - Captures location on mount (login event).
 * - Schedules auto-captures at 11:00 AM and 7:30 PM daily.
 */
export default function useLocationTracker(isLoggedIn) {
  const timersRef = useRef([]);

  const captureAndSend = useCallback(async (captureType) => {
    try {
      const pos     = await getPosition();
      const { latitude, longitude } = pos.coords;
      const addrParts = await reverseGeocode(latitude, longitude);
      await api.post('/location', { latitude, longitude, capture_type: captureType, ...addrParts });
      console.log(`📍 Location captured [${captureType}]:`, addrParts.city || `${latitude},${longitude}`);
    } catch (err) {
      // Silently fail — user may have denied GPS or be offline
      console.warn('Location capture failed:', err.message);
    }
  }, []);

  const scheduleNext = useCallback((hour, minute, type) => {
    const delay = msUntil(hour, minute);
    const id = setTimeout(() => {
      captureAndSend(type);
      // Re-schedule for next day
      scheduleNext(hour, minute, type);
    }, delay);
    timersRef.current.push(id);
    const h = Math.floor(delay / 3600000);
    const m = Math.floor((delay % 3600000) / 60000);
    console.log(`⏰ Next ${type} capture in ${h}h ${m}m`);
  }, [captureAndSend]);

  useEffect(() => {
    if (!isLoggedIn) return;

    // 1. Immediate capture on login
    captureAndSend('login');

    // 2. Schedule 11:00 AM capture
    scheduleNext(11, 0, '11am');

    // 3. Schedule 7:30 PM capture
    scheduleNext(19, 30, '730pm');

    return () => {
      // Clean up timers on logout
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [isLoggedIn, captureAndSend, scheduleNext]);
}
