import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
import "./Map.css";
import LayerControl from "./LayerControl";
import { Card, Radio, Space, Switch } from "antd";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";

// Set the Mapbox access token in .env file
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

// Constants for globe spinning
const secondsPerRevolution = 120;
const maxSpinZoom = 5;
const slowSpinZoom = 3;
let userInteracting = false;

function Map() {
  const [mapInstance, setMapInstance] = useState(null);
  const map2DContainerRef = useRef(null);
  const [layers, setLayers] = useState([]);
  const [spinEnabled, setSpinEnabled] = useState(true);
  const [selectedBase, setSelectedBase] = useState("outdoors-v12"); // Default base layer

  // Base layers
  const baseLayers = [
    {
      id: "satellite-streets-v12",
      title: "Satellite Streets",
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      visibility: "none",
      type: "base",
    },
    {
      id: "dark-v11",
      title: "Dark",
      style: "mapbox://styles/mapbox/dark-v11",
      visibility: "none",
      type: "base",
    },
    {
      id: "streets-v12",
      title: "Streets",
      style: "mapbox://styles/mapbox/streets-v12",
      visibility: "none",
      type: "base",
    },
    {
      id: "light-v11",
      title: "Light",
      style: "mapbox://styles/mapbox/light-v11",
      visibility: "none",
      type: "base",
    },
    {
      id: "outdoors-v12",
      title: "Outdoors",
      style: "mapbox://styles/mapbox/outdoors-v12",
      visibility: "none",
      type: "base",
    },
  ];

  useEffect(() => {
    const map2D = new mapboxgl.Map({
      zoom: 2,
      center: [-95.3701, 29.7601],
      container: "map",
      style: "mapbox://styles/mapbox/outdoors-v12",
      projection: "globe",
    });

    map2D.on("style.load", () => {
      map2D.setFog({
        color: "rgb(186, 210, 235)", // Lower atmosphere
        "high-color": "rgb(36, 92, 223)", // Upper atmosphere
        "horizon-blend": 0.02, // Atmosphere thickness (default 0.2 at low zooms)
        "space-color": "rgb(11, 11, 25)", // Background color
        "star-intensity": 0.25, // Background star brightness (default 0.35 at low zoooms )
      });
    });

    // Reverse geocoding for coordinates
    const coordinatesGeocoder = (query) => {
      // Match anything which looks like
      // decimal degrees coordinate pair.
      const matches = query.match(
        /^[ ]*(?:Lat: )?(-?\d+\.?\d*)[, ]+(?:Lng: )?(-?\d+\.?\d*)[ ]*$/i
      );
      if (!matches) {
        return null;
      }

      function coordinateFeature(lng, lat) {
        return {
          center: [lng, lat],
          geometry: {
            type: "Point",
            coordinates: [lng, lat],
          },
          place_name: "Lat: " + lat + " Lng: " + lng,
          place_type: ["coordinate"],
          properties: {},
          type: "Feature",
        };
      }

      const coord1 = Number(matches[1]);
      const coord2 = Number(matches[2]);
      const geocodes = [];

      if (coord1 < -90 || coord1 > 90) {
        // must be lng, lat
        geocodes.push(coordinateFeature(coord1, coord2));
      }

      if (coord2 < -90 || coord2 > 90) {
        // must be lat, lng
        geocodes.push(coordinateFeature(coord2, coord1));
      }

      if (geocodes.length === 0) {
        // else could be either lng, lat or lat, lng
        geocodes.push(coordinateFeature(coord1, coord2));
        geocodes.push(coordinateFeature(coord2, coord1));
      }

      return geocodes;
    };

    // Add fullscreen, geocoder, scale, and navigation controls
    map2D.addControl(new mapboxgl.FullscreenControl());

    map2D.addControl(
      new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl,
        localGeocoder: coordinatesGeocoder,
        placeholder: "Try: -40, 170",
        reverseGeocode: true,
      }),
      "top-left"
    );

    map2D.addControl(new mapboxgl.ScaleControl());
    map2D.addControl(new mapboxgl.NavigationControl());

    map2D.on("style.load", () => {
      map2D.setFog({}); // Set the default atmosphere style
      // Start globe spinning on page load
      if (spinEnabled) {
        spinGlobe(map2D);
      }
    });

    // Add a listener for the moveend event to handle globe spinning
    map2D.on("moveend", () => {
      if (spinEnabled) {
        spinGlobe(map2D);
      }
    });

    setMapInstance(map2D);
    return () => {
      map2D.remove();
    };
  }, []);

  // Set the map instance to the state selected via the radio buttons
  const onChange = (layer) => {
    const layerId = layer.target.id;

    const currentLayers = mapInstance
      .getStyle()
      .layers.filter(
        (layer) =>
          layer.id.match(/Storm.*/) ||
          layer.id.match(/Water.*/) ||
          layer.id.match(/Waste.*/)
      );
    const currentSources = mapInstance.getStyle().sources;
    const newStyle = "mapbox://styles/mapbox/" + layerId;

    mapInstance.setStyle(newStyle);

    // Wait for the new style to finish loading
    mapInstance.once("styledata", () => {
      // Re-add sources (custom ones, not those part of the base map)
      for (const [sourceId, source] of Object.entries(currentSources)) {
        if (!mapInstance.getSource(sourceId)) {
          mapInstance.addSource(sourceId, source);
        }
      }
      // Re-add layers (custom ones, not background/base layers)
      currentLayers.forEach((layer) => {
        if (!mapInstance.getLayer(layer.id)) {
          mapInstance.addLayer(layer);
        }
      });
    });

    setSelectedBase(layer.target.value);
  };

  // useEffect to handle enabling/disabling globe spinning based on spinEnabled
  useEffect(() => {
    if (mapInstance) {
      if (spinEnabled) {
        userInteracting = false;
        spinGlobe(mapInstance);
      } else {
        userInteracting = true;
      }
    }
  }, [spinEnabled, mapInstance]);

  // Function to spin the globe
  function spinGlobe(map) {
    if (map) {
      const zoom = map.getZoom();
      if (!userInteracting && zoom < maxSpinZoom) {
        let distancePerSecond = 360 / secondsPerRevolution;
        if (zoom > slowSpinZoom) {
          const zoomDif = (maxSpinZoom - zoom) / (maxSpinZoom - slowSpinZoom);
          distancePerSecond *= zoomDif;
        }
        const center = map.getCenter();
        center.lng -= distancePerSecond;
        map.easeTo({ center, duration: 1000, easing: (n) => n });
      }
    }
  }

  return (
    <>
      <div
        id="map"
        ref={map2DContainerRef}
        style={{ width: "100vw", height: "100vh" }}
      />
      {mapInstance && (
        <LayerControl mapInstance={mapInstance} layers={layers} />
      )}
      <div id="options">
        <Card bordered={true}>
          <Space direction="vertical">
            Spin Globe
            <Switch
              checkedChildren={<CheckOutlined />}
              unCheckedChildren={<CloseOutlined />}
              defaultChecked
              onChange={(checked) => setSpinEnabled(checked)} // Handle spin toggle
            />
            Base Layers
            <Radio.Group onChange={onChange} value={selectedBase}>
              <Space direction="vertical">
                {baseLayers.map((layer) => (
                  // Base layers
                  <Radio key={layer.id} id={layer.id} value={layer.id}>
                    {layer.title}
                  </Radio>
                ))}
              </Space>
            </Radio.Group>
          </Space>
        </Card>
      </div>
    </>
  );
}

export default Map;
