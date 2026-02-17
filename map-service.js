import L from 'leaflet';

class MapService {
  constructor() {
    this.map = null;
    this.markers = [];
    this.routeLayer = null;
  }

  /**
   * Initialize the Leaflet map
   * @param {string} containerId - ID of the container element
   */
  initMap(containerId) {
    // Create map centered on world view
    this.map = L.map(containerId, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([20, 0], 2);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);

    // Fix for marker icons in Vite
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    return this.map;
  }

  /**
   * Geocode a location name to coordinates using Nominatim
   * @param {string} locationName - Name of the location
   * @returns {Promise<{lat: number, lon: number, displayName: string}>}
   */
  async geocodeLocation(locationName) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon),
          displayName: data[0].display_name,
        };
      } else {
        throw new Error('Location not found');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      throw error;
    }
  }

  /**
   * Center map on a location
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @param {number} zoom - Zoom level
   */
  centerOnLocation(lat, lon, zoom = 13) {
    if (this.map) {
      this.map.setView([lat, lon], zoom);
    }
  }

  /**
   * Add a marker to the map
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @param {string} title - Marker title
   * @param {string} description - Popup description
   * @returns {L.Marker}
   */
  addMarker(lat, lon, title, description = '') {
    const marker = L.marker([lat, lon]).addTo(this.map);
    
    if (title || description) {
      const popupContent = `
        <div style="font-family: Inter, sans-serif;">
          <strong style="font-size: 1rem; color: #1a1a2e;">${title}</strong>
          ${description ? `<p style="margin-top: 0.5rem; color: #4a5568; font-size: 0.875rem;">${description}</p>` : ''}
        </div>
      `;
      marker.bindPopup(popupContent);
    }
    
    this.markers.push(marker);
    return marker;
  }

  /**
   * Clear all markers from the map
   */
  clearMarkers() {
    this.markers.forEach(marker => {
      this.map.removeLayer(marker);
    });
    this.markers = [];
  }

  /**
   * Draw a route between multiple points
   * @param {Array<{lat: number, lon: number}>} points - Array of coordinates
   */
  drawRoute(points) {
    // Remove existing route
    if (this.routeLayer) {
      this.map.removeLayer(this.routeLayer);
    }

    // Create polyline
    const latLngs = points.map(p => [p.lat, p.lon]);
    this.routeLayer = L.polyline(latLngs, {
      color: '#667eea',
      weight: 3,
      opacity: 0.7,
      smoothFactor: 1,
    }).addTo(this.map);

    // Fit map to show entire route
    this.map.fitBounds(this.routeLayer.getBounds(), { padding: [50, 50] });
  }

  /**
   * Calculate distance between two points (Haversine formula)
   * @param {number} lat1 - First point latitude
   * @param {number} lon1 - First point longitude
   * @param {number} lat2 - Second point latitude
   * @param {number} lon2 - Second point longitude
   * @returns {number} Distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
      Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 10) / 10; // Round to 1 decimal
  }

  /**
   * Convert degrees to radians
   */
  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Clear the route from the map
   */
  clearRoute() {
    if (this.routeLayer) {
      this.map.removeLayer(this.routeLayer);
      this.routeLayer = null;
    }
  }

  /**
   * Reset the map view
   */
  reset() {
    this.clearMarkers();
    this.clearRoute();
    this.map.setView([20, 0], 2);
  }
}

export default MapService;
