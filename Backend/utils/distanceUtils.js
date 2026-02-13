/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Check if bus is within proximity of a stop (50 meters)
 * @param {number} busLat - Bus latitude
 * @param {number} busLon - Bus longitude
 * @param {number} stopLat - Stop latitude
 * @param {number} stopLon - Stop longitude
 * @param {number} radiusMeters - Radius in meters (default 50)
 * @returns {boolean} - True if within radius
 */
function isWithinRadius(busLat, busLon, stopLat, stopLon, radiusMeters = 50) {
  const distance = calculateDistance(busLat, busLon, stopLat, stopLon);
  return distance <= radiusMeters;
}

/**
 * Find the nearest stop to the bus location
 * @param {number} busLat - Bus latitude
 * @param {number} busLon - Bus longitude
 * @param {Array} stops - Array of stops with {lat, lon, name} or {location: {lat, lon}, name}
 * @param {number} radiusMeters - Radius in meters (default 50)
 * @returns {Object|null} - Nearest stop within radius or null
 */
function findNearestStop(busLat, busLon, stops, radiusMeters = 50) {
  let nearestStop = null;
  let minDistance = Infinity;

  stops.forEach(stop => {
    // Handle both formats: {lat, lon} or {location: {lat, lon}}
    const stopLat = stop.lat || stop.location?.lat;
    const stopLon = stop.lon || stop.location?.lon || stop.location?.lng;
    
    if (stopLat && stopLon) {
      const distance = calculateDistance(busLat, busLon, stopLat, stopLon);
      
      if (distance <= radiusMeters && distance < minDistance) {
        minDistance = distance;
        nearestStop = {
          ...stop,
          name: stop.name || stop.stopName,
          distance: distance,
          lat: stopLat,
          lon: stopLon
        };
      }
    }
  });

  return nearestStop;
}

module.exports = {
  calculateDistance,
  isWithinRadius,
  findNearestStop
};














