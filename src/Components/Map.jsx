import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import "mapbox-gl/dist/mapbox-gl.css";  // Import Mapbox CSS
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css"; // Import the geocoder CSS
import "./map.css";

// Set your Mapbox access token here
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

function Map() {
  const map2DContainerRef = useRef(null);  // Reference to 2D map container div
  const mapGlobeContainerRef = useRef(null);  // Reference to globe map container div

  useEffect(() => {
    // Initialize the 2D map
    const map2D = new mapboxgl.Map({
      container: map2DContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [-74.5, 40], // Initial center [longitude, latitude]
      zoom: 2,
    });
    map2D.addControl(new mapboxgl.FullscreenControl());

    // Initialize the Globe map
    const mapGlobe = new mapboxgl.Map({
      container: mapGlobeContainerRef.current,
      style: "mapbox://styles/mapbox/satellite-v9",
      center: [-74.5, 40], // Initial center [longitude, latitude]
      zoom: 2,
      projection: 'globe', // Enable globe mode
    });
    mapGlobe.addControl(new mapboxgl.FullscreenControl());

    map2D.addControl(
      new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl
      })
    );

    
    mapGlobe.addControl(
      new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl
      })
    );
    
    map2D.addControl(new mapboxgl.ScaleControl());
    mapGlobe.addControl(new mapboxgl.ScaleControl());
    map2D.addControl(new mapboxgl.NavigationControl());
    mapGlobe.addControl(new mapboxgl.NavigationControl());

    // Function to sync movements between the two maps
    function syncMaps(e) {
      const center = e.target.getCenter();
      const zoom = e.target.getZoom();
      const bearing = e.target.getBearing();
      const pitch = e.target.getPitch();

      if (e.target === map2D) {
        mapGlobe.off('move', syncMaps);
        mapGlobe.setCenter(center);
        mapGlobe.setZoom(zoom);
        mapGlobe.setBearing(bearing);
        mapGlobe.setPitch(pitch);
        mapGlobe.on('move', syncMaps);
      } else {
        map2D.off('move', syncMaps);
        map2D.setCenter(center);
        map2D.setZoom(zoom);
        map2D.setBearing(bearing);
        map2D.setPitch(pitch);
        map2D.on('move', syncMaps);
      }
    }

    // Sync the maps when one moves
    map2D.on('move', syncMaps);
    mapGlobe.on('move', syncMaps);

    // Clean up on unmount
    return () => {
      map2D.remove();
      mapGlobe.remove();
    };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "row", height: "100vh" }}>
      {/* 2D Map Container */}
      <div ref={map2DContainerRef} style={{ width: "50vw", height: "100vh" }} />

      {/* Globe Map Container */}
      <div ref={mapGlobeContainerRef} style={{ width: "50vw", height: "100vh" }} />
    </div>
  );
}

export default Map;
