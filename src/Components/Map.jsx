import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
import "./map.css";
import LayerControl from "./LayerControl";
import { Card, Space, Switch } from "antd";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const secondsPerRevolution = 120;
const maxSpinZoom = 5;
const slowSpinZoom = 3;
let userInteracting = false;
let map2D;
function Map() {
  const [mapInstance, setMapInstance] = useState(null);
  const map2DContainerRef = useRef(null);
  const [layers, setLayers] = useState([]);
  const [spinEnabled, setSpinEnabled] = useState(true);

  useEffect(() => {
    // map2D = new mapboxgl.Map({
    //   container: map2DContainerRef.current,
    //   style: "mapbox://styles/mapbox/streets-v12",
    //   center: [-95.3701, 29.7601],
    //   zoom: 2,
    //   projection: "globe", // Enable globe mode
    // });

    map2D = new mapboxgl.Map({
      container: "map",
      zoom: 2,
      center: [-95.3701, 29.7601],
      // pitch: 80,
      // bearing: 41,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
    });

    map2D.on("style.load", () => {
      map2D.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      });
      map2D.setTerrain({
        source: "mapbox-dem",
        exaggeration: 1.5,
      });
    });

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
      if (spinEnabled) {
        spinGlobe(map2D);
      }
    });

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
        <Card title="Options" bordered={true}>
          <Space>
            Spin Globe
            <Switch
              checkedChildren={<CheckOutlined />}
              unCheckedChildren={<CloseOutlined />}
              defaultChecked
              onChange={(checked) => setSpinEnabled(checked)} // Handle spin toggle
            />
          </Space>
        </Card>
      </div>
    </>
  );
}

export default Map;
