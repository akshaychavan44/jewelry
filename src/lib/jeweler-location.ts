export type Coordinates = { latitude: number; longitude: number };

export function coordinates(latitude: unknown, longitude: unknown): Coordinates | null {
  if (latitude === null || latitude === undefined || latitude === "" || longitude === null || longitude === undefined || longitude === "") return null;
  const lat = Number(latitude), lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { latitude: lat, longitude: lng } : null;
}

export function distanceKm(a: Coordinates, b: Coordinates) {
  const rad = (n: number) => n * Math.PI / 180;
  const h = Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}

export function nearestDistance(origin: Coordinates, locations: { latitude: number | null; longitude: number | null }[]) {
  const distances = locations.flatMap(location => {
    const point = coordinates(location.latitude, location.longitude);
    return point ? [distanceKm(origin, point)] : [];
  });
  return distances.length ? Math.min(...distances) : null;
}
