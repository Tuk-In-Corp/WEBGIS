import React, { useState } from "react";

export const toggleBaseLayer = (mapInstance, layerType, setBaseLayer, setShowLayerOptions) => {
  if (!mapInstance) return;
  const layers = mapInstance.getLayers().getArray();
  layers.forEach((layer) => {
    if (layer.get("title") === "OSM") {
      layer.setVisible(layerType === "OSM");
    } else if (layer.get("title") === "Google Satellite") {
      layer.setVisible(layerType === "Satellite");
    }
  });
  setBaseLayer(layerType);
  setShowLayerOptions(false);
};

const LayerSwitcher = ({ mapInstance, baseLayer, setBaseLayer }) => {
  const [showOptions, setShowOptions] = useState(false);

  return (
    <div style={{ position: "absolute", top: 10, right: 10, background: "white", padding: 10, borderRadius: 5 }}>
      <button onClick={() => setShowOptions(!showOptions)}>🌍 Layers</button>
      {showOptions && (
        <div style={{ marginTop: 5 }}>
          <button onClick={() => toggleBaseLayer(mapInstance, "OSM", setBaseLayer, setShowOptions)} 
            style={{ fontWeight: baseLayer === "OSM" ? "bold" : "normal" }}>
            OSM
          </button>
          <button onClick={() => toggleBaseLayer(mapInstance, "Satellite", setBaseLayer, setShowOptions)} 
            style={{ fontWeight: baseLayer === "Satellite" ? "bold" : "normal" }}>
            Satellite
          </button>
        </div>
      )}
    </div>
  );
};

export default LayerSwitcher;
