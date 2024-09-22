import React, { useEffect, useState } from "react";
import "./LegendControl.css";

const LegendControl = ({ checkedLayers, layerStyles }) => {
  const [legendItems, setLegendItems] = useState([]);

  // Update legend items based on the checked layers
  useEffect(() => {
    const items = checkedLayers
      .map((layerId) => {
        console.log(layerId);
        
        const style = layerStyles[layerId];
        if (style) {
          return {
            id: layerId,
            legends: getLegendStyle(style), // Now extracting all possible values
          };
        }
        return null;
      })
      .filter(Boolean); // Filter out null values for layers without styles

    setLegendItems(items);
  }, [checkedLayers, layerStyles]);

  return (
    <div className="legend-control">
      <h4>Legend</h4>
      {legendItems.map((item) => (
        <>
          <h2 className="legend-label">
            {item.id.split("/").pop(0).replace(/^\d+_/, "").replace(/_/g, " ")}
          </h2>
          <li key={item.id} className="legend-item">
            <ul>
              {item.legends.map((legend, idx) => (
                <li key={idx} className="legend-entry">
                  <span className="legend-symbol" style={legend.style}></span>
                  <span>{legend.label.split(':').pop()}</span>
                </li>
              ))}
            </ul>
          </li>
        </>
      ))}
    </div>
  );
};

const getLegendStyle = (style) => {
  const legends = [];

  // Iterate over all style properties (e.g., circle-color, fill-color)
  for (const [property, value] of Object.entries(style)) {
    // Handle match expressions
    if (Array.isArray(value) && value[0] === "match") {
      const attribute = value[1][1]; // The attribute being matched (e.g., STRUCTTYPE)

      // Iterate over the match values and their corresponding styles
      for (let i = 2; i < value.length - 1; i += 2) {
        const matchValue = value[i]; // e.g., "Pump Station"
        const matchStyle = value[i + 1]; // e.g., "#A8A800" (color)

        legends.push({
          label: `${attribute}: ${matchValue}`,
          style: getStyleObject(property, matchStyle),
        });
      }

      // Handle the fallback value (the last item in the match array)
      const fallbackStyle = value[value.length - 1];
      legends.push({
        label: `${attribute}: Other`,
        style: getStyleObject(property, fallbackStyle),
      });
    } else {
      // Handle direct properties without match expressions (e.g., "circle-radius": 5)
      legends.push({
        label: property,
        style: getStyleObject(property, value),
      });
    }
  }

  return legends;
};

// Helper function to generate the CSS style object for a legend item
const getStyleObject = (property, value) => {
  const styleObject = {};

  // Handle circle-color, fill-color, and line-color
  if (property.includes("color")) {
    styleObject.backgroundColor = value;
  }

  // Handle circle-radius
  if (property.includes("radius")) {
    styleObject.width = `${value}px`;
    styleObject.height = `${value}px`;
    styleObject.borderRadius = "50%";
  }

  // Handle line width for line-color
  if (property.includes("line-width")) {
    styleObject.border = `2px solid ${value}`;
  }

  return styleObject;
};

export default LegendControl;
