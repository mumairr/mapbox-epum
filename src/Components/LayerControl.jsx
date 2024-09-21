import React, { useState, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import { Tree, Button, message } from "antd";
import { ZoomInOutlined } from "@ant-design/icons";
import "./LayerControl.css";
import LegendControl from "./LegendControl";

let layerStyles = {
  "Stormdrain/1_Stormdrain_Network_Structures": {
    "circle-radius": 5,
    "circle-color": [
      "match",
      ["get", "STRUCTTYPE"],
      "Pump Station",
      "#A8A800",
      "Detention Pond",
      "#6F4588",
      "Virtual Junction",
      "#CE2B30",
      "#ccc",
    ],
  },
  "Stormdrain/1_SWM_BProjects_-_Type": {
    "fill-color": [
      "match",
      ["get", "PROJECTTYPE"],
      "LDP",
      "#99E600",
      "DRE",
      "#004DA8",
      "hLDP",
      "#CA2B27",
      "#ccc",
    ],
  },
  defaultPoint: {
    "circle-radius": 5,
    "circle-stroke-width": 2,
    "circle-stroke-color": "#000",
    "circle-color": "#FF5722",
    "circle-opacity": 1,
  },
  defaultLine: {
    "fill-color": "#4CAF50",
    "fill-opacity": 0.5,
    "fill-opacity-transition": { duration: 500 },
  },
  defaultPolygon: {
    "fill-color": "#4CAF50",
    "fill-opacity": 0.5,
    "fill-opacity-transition": { duration: 500 },
  },
};

const LayerControl = ({ mapInstance }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const info = (msg) => {
    messageApi.info(msg);
  };
  const [checkedKeys, setCheckedKeys] = useState([]); // Track which layers are checked
  const [expandedKeys, setExpandedKeys] = useState([]); // Track which nodes are expanded
  const [layers, setLayers] = useState([]); // Track all the layers
  const backendUrl = "http://localhost:5000"; // Local flask app needed
  const [loadedLayers, setLoadedLayers] = useState([]); // Track layers already loaded

  useEffect(async () => {
    const folderStructure = await getFolderStructure();
    setLayers(await getLayersName(folderStructure));
  }, []);

  async function getFolderStructure() {
    const response = await fetch(`${backendUrl}/folder-structure`);
    const structure = response.json();
    return structure;
  }

  // Utility function to clean and split names based on numeric prefixes
  const cleanName = (name) => name.replace(/^\d+_/, "").replace(/_/g, " ");

  // Split a layer id by numeric prefixes to nest categories and layers
  const splitLayerId = (id) => {
    return id.split(/(?=\d_)/).map(cleanName); // Split by a number followed by an underscore (e.g., 2_, 3_, etc.)
  };

  // Create a single popup and reuse it
  const popup = new mapboxgl.Popup({
    closeButton: true,
    closeOnClick: false,
    closeOnMove: true,
  });

  // Fetch and add layers when selected
  async function fetchAndAddLayer(map, layerId) {
    if (!map.getSource(layerId)) {
      const geojsonUrl = `${backendUrl}/geojson/${layerId}.geojson`;
      const response = await fetch(geojsonUrl);

      if (response.status === 200) {
        const geojsonData = await response.json();
        if (geojsonData.features.length === 0) {
          info(`${cleanName(layerId)} layer has no features.`);
          return;
        }

        map.addSource(layerId, {
          type: "geojson",
          data: geojsonData,
        });

        const geometryType = geojsonData.features[0]?.geometry?.type;

        if (geometryType === "Point") {
          if (layerId == "Stormdrain/1_Stormdrain_Network_Structures") {
            map.addLayer({
              id: layerId,
              type: "circle",
              source: layerId,
              paint: layerStyles["Stormdrain/1_Stormdrain_Network_Structures"],
            });
          } else {
            map.addLayer({
              id: layerId,
              type: "circle",
              source: layerId,
              paint: layerStyles["defaultPoint"],
            });
          }
        } else if (geometryType === "LineString") {
          map.addLayer({
            id: layerId,
            type: "line",
            source: layerId,
            paint: layerStyles["defaultLine"],
          });
        } else if (geometryType === "Polygon") {
          if (layerId == "Stormdrain/1_SWM_BProjects_-_Type") {
            map.addLayer({
              id: layerId,
              type: "fill",
              source: layerId,
              paint: layerStyles["Stormdrain/1_SWM_BProjects_-_Type"],
            });
          } else
            map.addLayer({
              id: layerId,
              type: "fill",
              source: layerId,
              paint: layerStyles["defaultPolygon"],
            });
        }

        // Handle feature hover events for popups
        map.on("mousemove", layerId, (e) => {
          const feature = e.features[0];
          if (e.features.length > 0) {
            // Change cursor to pointer when over a feature
            map.getCanvas().style.cursor = "pointer";

            // Dynamically build a table with all feature properties
            let popupContent = `<center><h2>Feature Information</h2></center><h4>Layer: ${layerId}</h4><table id="popupTable">`;
            for (const [key, value] of Object.entries(feature.properties)) {
              popupContent += `<tr><td><strong>${key}</strong></td><td>${value}</td></tr>`;
            }
            popupContent += `</table>`;
            popupContent += `<button id="zoomButton">Zoom to Feature</button>`;

            // Set the popup with dynamic content
            popup.setLngLat(e.lngLat).setHTML(popupContent).addTo(map);

            // Handle zoom button click inside the popup
            document.getElementById("zoomButton").onclick = () => {
              zoomToFeature(feature.geometry.coordinates);
            };
          }
        });

        // When the mouse leaves the feature, reset the cursor
        map.on("mouseleave", layerId, () => {
          map.getCanvas().style.cursor = ""; // Revert cursor back to default
          // popup.remove(); // Remove the popup
        });

        setLoadedLayers((prevLoadedLayers) => [...prevLoadedLayers, layerId]);
      } else {
        console.log(`Failed to load layer: ${layerId}`);
      }
    }
  }

  const zoomToFeature = (coordinates) => {
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend(coordinates);
    mapInstance.fitBounds(bounds, { padding: 20 });
  };

  // Get layer names and structure
  const getLayersName = async (folderStructure) => {
    const layers = folderStructure
      .filter((item) => item.endsWith(".geojson"))
      .map((item) => {
        const layerName = item.replace(".geojson", "").split("\\").pop();
        return {
          id: layerName,
          type: "line",
          source: layerName,
          layout: {
            visibility: "none",
          },
        };
      });
    return layers;
  };

  // Zoom to layer extent, adding the layer if it's not already loaded
  const zoomToLayer = async (layerId) => {
    let source = mapInstance.getSource(layerId);

    // If the source isn't loaded yet, fetch and add the layer
    if (!source) {
      await fetchAndAddLayer(mapInstance, layerId);
      source = mapInstance.getSource(layerId); // Re-check after loading the layer
    }

    // If the layer is added successfully, proceed with zooming
    if (source) {
      const data = source._data;

      const bounds = new mapboxgl.LngLatBounds();

      // Compute bounds for all features in the GeoJSON data
      data.features.forEach((feature) => {
        const geometryType = feature.geometry.type;
        const coordinates = feature.geometry.coordinates;

        if (geometryType === "Point") {
          // For Point, extend bounds directly with coordinates
          bounds.extend(coordinates);
        } else if (geometryType === "LineString") {
          // For LineString, loop through all coordinates
          coordinates.forEach((coord) => bounds.extend(coord));
        } else if (geometryType === "Polygon") {
          // For Polygon, loop through all rings (first is outer boundary, others are holes)
          coordinates.forEach((ring) => {
            ring.forEach((coord) => bounds.extend(coord)); // Loop through each vertex in the ring
          });
        } else if (geometryType === "MultiPolygon") {
          // For MultiPolygon, loop through each polygon and its rings
          coordinates.forEach((polygon) => {
            polygon.forEach((ring) => {
              ring.forEach((coord) => bounds.extend(coord)); // Loop through each vertex in each ring
            });
          });
        }
      });

      // Zoom to the calculated layer bounds
      mapInstance.fitBounds(bounds, { padding: 20 });

      // Mark the layer as checked in the control
      setCheckedKeys((prevCheckedKeys) => {
        // Ensure the layerId is included in the checkedKeys state
        if (!prevCheckedKeys.includes(layerId)) {
          return [...prevCheckedKeys, layerId];
        }
        return prevCheckedKeys;
      });
    } else {
      console.error(`Failed to load and add the layer ${layerId}.`);
    }
  };

  // Toggle the visibility of a layer on the mapInstance
  const toggleLayerVisibility = (layerId, isVisible) => {
    const visibility = isVisible ? "visible" : "none";
    const mapLayer = mapInstance.getLayer(layerId);
    if (mapLayer) {
      mapInstance.setLayoutProperty(layerId, "visibility", visibility);
    } else {
      // console.log(`Layer ${layerId} not found in the map.`);
    }
  };

  // Handle checking/unchecking layers
  const onCheck = async (checkedKeysValue) => {
    setCheckedKeys(checkedKeysValue);

    for (const layer of layers) {
      const isVisible = checkedKeysValue.includes(layer.id);

      // Lazy load the layer only when it’s checked and hasn’t been loaded before
      if (isVisible && !loadedLayers.includes(layer.id)) {
        await fetchAndAddLayer(mapInstance, layer.id);
      }

      // Toggle visibility
      toggleLayerVisibility(layer.id, isVisible);
    }
  };

  // Handle expand/collapse of nodes
  const onExpand = (expandedKeysValue) => {
    setExpandedKeys(expandedKeysValue);
  };

  // Recursive function to build the tree structure with zoom button
  const buildTreeData = (groupedLayers) => {
    const treeData = [];

    Object.keys(groupedLayers).forEach((category) => {
      const categoryNode = {
        title: cleanName(category),
        key: category,
        children: [],
      };

      // If there are layers, add them as leaf nodes with zoom button
      if (groupedLayers[category].layers) {
        groupedLayers[category].layers.forEach((layer) => {
          const layerParts = splitLayerId(layer.id).slice(1);

          // Recursively nest subcategories if needed
          let currentNode = categoryNode;
          layerParts.forEach((part, index) => {
            if (index === layerParts.length - 1) {
              currentNode.children.push({
                title: (
                  <>
                    {part}
                    <Button
                      icon={<ZoomInOutlined />}
                      size="small"
                      style={{ marginLeft: 10 }}
                      onClick={() => zoomToLayer(layer.id)} // Call zoom function on click
                    />
                  </>
                ),
                key: layer.id, // Use the full layer id as the unique key
                isLeaf: true,
              });
            } else {
              // Check if the part already exists, otherwise create it
              let existingNode = currentNode.children.find(
                (child) => child.title === part
              );
              if (!existingNode) {
                existingNode = {
                  title: part,
                  key: `${category}-${part}`,
                  children: [],
                };
                currentNode.children.push(existingNode);
              }
              currentNode = existingNode;
            }
          });
        });
      }

      treeData.push(categoryNode);
    });

    return treeData;
  };

  // Group layers into categories and subcategories
  const groupLayers = (layers) => {
    return layers.reduce((acc, layer) => {
      const parts = layer.id.split("/");

      let current = acc;

      // Recursively create nested categories and subcategories
      parts.forEach((part, index) => {
        const cleanedPart = cleanName(part);

        if (index === parts.length - 1) {
          // Final part (layer), add it to layers
          if (!current.layers) {
            current.layers = [];
          }
          current.layers.push(layer);
        } else {
          if (!current[cleanedPart]) {
            current[cleanedPart] = {}; // Initialize new category or subcategory
          }
          current = current[cleanedPart]; // Traverse deeper into the subcategories
        }
      });

      return acc;
    }, {});
  };

  // First, group layers into nested categories/subcategories
  const groupedLayers = groupLayers(layers);

  // Transform this grouped structure into a format suitable for Ant Design's Tree component
  const treeData = buildTreeData(groupedLayers);

  return (
    <>
      {contextHolder}
      <div className="layer-control" style={{ padding: "10px" }}>
        <Tree
          checkable
          showLine
          expandedKeys={expandedKeys}
          onExpand={onExpand}
          onCheck={onCheck}
          checkedKeys={checkedKeys}
          treeData={treeData} // Use treeData directly in Ant Tree
          defaultExpandAll={true} // Expand all nodes by default
          style={{ background: "#f9f9f9", padding: "10px" }} // Apply background and padding
        />
        {/* Add the LegendControl here */}
      </div>

      {/* Add the LegendControl here */}
      <LegendControl checkedLayers={checkedKeys} layerStyles={layerStyles} />
    </>
  );
};

export default LayerControl;
