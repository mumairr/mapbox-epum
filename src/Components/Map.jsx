import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
import "./map.css";
import LayerControl from "./LayerControl";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

function Map() {
  const [mapInstance, setMapInstance] = useState(null);
  const map2DContainerRef = useRef(null);
  const [layers, setLayers] = useState([]);

  useEffect(() => {
    const map2D = new mapboxgl.Map({
      container: map2DContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [-95.3701, 29.7601],
      zoom: 8,
    });
    map2D.addControl(new mapboxgl.FullscreenControl());
    map2D.addControl(
      new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl,
      }),
      "top-left"
    );

    map2D.addControl(new mapboxgl.ScaleControl());
    map2D.addControl(new mapboxgl.NavigationControl());
    const backendUrl = "http://localhost:5000";

    async function getFolderStructure() {
      const response = await fetch(`${backendUrl}/folder-structure`);
      const structure = response.json();
      return structure;
    }

    async function addGeoJsonLayers(map, folderStructure) {
      const layers = [];

      for (const item of folderStructure) {
        if (item.endsWith(".geojson")) {
          const layerName = item.replace(".geojson", "").split("\\").pop();

          const geojsonUrl = `${backendUrl}/geojson/${layerName}.geojson`;
          const response = await fetch(geojsonUrl);
          if (response.status !== 200) {
          } else {
            const geojsonData = await response.json();
            if (!geojsonData.error) {
              map.addSource(layerName, {
                type: "geojson",
                data: geojsonData,
              });
              const geometryType = geojsonData.features[0]?.geometry?.type;

              if (geometryType === "Point") {
                map.addLayer({
                  id: layerName,
                  type: "circle",
                  source: layerName,
                  layout: {
                    visibility: "none",
                  },
                  paint: {
                    "circle-radius": 5,
                    "circle-color": "#FF5722",
                  },
                });
              } else if (geometryType === "LineString") {
                map.addLayer({
                  id: layerName,
                  type: "line",
                  source: layerName,
                  layout: {
                    visibility: "none",
                  },
                  paint: {
                    "line-color": "#2196F3",
                    "line-width": 2,
                  },
                });
              } else if (geometryType === "Polygon") {
                map.addLayer({
                  id: layerName,
                  type: "fill",
                  source: layerName,
                  layout: {
                    visibility: "none",
                  },
                  paint: {
                    "fill-color": "#4CAF50",
                    "fill-opacity": 0.5,
                  },
                });
              }

              layers.push({
                id: layerName,
                type: "line",
                source: layerName,
                layout: {
                  visibility: "visible",
                },
              });
            }
          }
        }
      }

      return layers;
    }

    map2D.on("load", async () => {
      const folderStructure = await getFolderStructure();
      const layers = await addGeoJsonLayers(map2D, folderStructure);

      setLayers(layers);
    });

    setMapInstance(map2D);
    return () => {
      map2D.remove();
    };
  }, []);

  return (
    <>
      <div
        ref={map2DContainerRef}
        style={{ width: "100vw", height: "100vh" }}
      />
      {mapInstance && (
        <LayerControl mapInstance={mapInstance} layers={layers} />
      )}
    </>
  );
}

export default Map;
