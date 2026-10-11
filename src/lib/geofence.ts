import { useEffect, useState } from "react";

// Eneo la chuo (MUM, Morogoro) — makadirio; radius mita 800.
export const CAMPUS_LAT = -6.8278;
export const CAMPUS_LNG = 37.6591;
export const CAMPUS_RADIUS_M = 800;

export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export type CampusGate =
  | { status: "checking" }
  | { status: "inside"; lat: number; lng: number; distance: number }
  | { status: "outside"; distance: number }
  | { status: "denied" }
  | { status: "unsupported" };

export function useCampusGate() {
  const [gate, setGate] = useState<CampusGate>({ status: "checking" });

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGate({ status: "unsupported" });
      return;
    }
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        const { latitude, longitude } = pos.coords;
        const distance = Math.round(distanceMeters(latitude, longitude, CAMPUS_LAT, CAMPUS_LNG));
        setGate(
          distance <= CAMPUS_RADIUS_M
            ? { status: "inside", lat: latitude, lng: longitude, distance }
            : { status: "outside", distance },
        );
      },
      () => {
        if (!cancelled) setGate({ status: "denied" });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return gate;
}
