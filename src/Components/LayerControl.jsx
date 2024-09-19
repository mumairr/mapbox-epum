import React, { useState } from "react";
import { Tree } from "antd";
import "./LayerControl.css";

const LayerControl = ({ mapInstance, layers }) => {
  const [checkedKeys, setCheckedKeys] = useState([]); // Track which layers are checked
  const [expandedKeys, setExpandedKeys] = useState([]); // Track which nodes are expanded

  // Utility function to clean and split names based on numeric prefixes
  const cleanName = (name) => name.replace(/^\d+_/, "").replace(/_/g, " ");

  // Split a layer id by numeric prefixes to nest categories and layers
  const splitLayerId = (id) => {
    return id.split(/(?=\d_)/).map(cleanName); // Split by a number followed by an underscore (e.g., 2_, 3_, etc.)
  };

  // Toggle the visibility of a layer on the mapInstance
  const toggleLayerVisibility = (layerId, isVisible) => {
    const visibility = isVisible ? "visible" : "none";
    const mapLayer = mapInstance.getLayer(layerId);
    if (mapLayer) {
      mapInstance.setLayoutProperty(layerId, "visibility", visibility);
    } else {
      console.log(`Layer ${layerId} not found in the map.`);
    }
  };

  // Handle checking/unchecking layers
  const onCheck = (checkedKeysValue) => {
    setCheckedKeys(checkedKeysValue);

    layers.forEach((layer) => {
      const isVisible = checkedKeysValue.includes(layer.id);
      toggleLayerVisibility(layer.id, isVisible);
    });
  };

  // Handle expand/collapse of nodes
  const onExpand = (expandedKeysValue) => {
    setExpandedKeys(expandedKeysValue);
  };

  // Recursive function to build the tree structure
  const buildTreeData = (groupedLayers) => {
    const treeData = [];

    Object.keys(groupedLayers).forEach((category) => {
      const categoryNode = {
        title: cleanName(category),
        key: category,
        children: [],
      };

      // If there are layers, add them as leaf nodes
      if (groupedLayers[category].layers) {
        groupedLayers[category].layers.forEach((layer) => {
          const layerParts = splitLayerId(layer.id).slice(1); // Skip the first part (category)

          // Recursively nest subcategories if needed
          let currentNode = categoryNode;
          layerParts.forEach((part, index) => {
            if (index === layerParts.length - 1) {
              currentNode.children.push({
                title: part, // Last part is the leaf (layer)
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
    </div>
  );
};

export default LayerControl;
