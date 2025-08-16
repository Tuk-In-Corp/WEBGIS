import React, { useState, useEffect } from "react";
import { Tile as TileLayer } from "ol/layer";
import { OSM, XYZ } from "ol/source";
import openstreetIcon from "./osm.png";
import satelliteIcon from "./Satellite.png";
import styles from "./App.module.css";

const LayerToggle = ({ mapRef }) => {
  const [currentLayer, setCurrentLayer] = useState("Satellite");

  // Define the OSM and Satellite layers
  const osmLayer = new TileLayer({
    source: new OSM(),
    title: "OSM",
    type: "base",
  });

  const satelliteLayer = new TileLayer({
    source: new XYZ({
      url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&key=YOUR_GOOGLE_MAPS_API_KEY",
      maxZoom: 20,
    }),
    title: "Satellite",
    type: "base",
  });

  // Map layer options
  const layerOptions = {
    OSM: { layer: osmLayer, icon: openstreetIcon },
    Satellite: { layer: satelliteLayer, icon: satelliteIcon },
  };

  useEffect(() => {
    if (!mapRef.current) return;
    // Add the Satellite layer by default
    mapRef.current.getLayers().setAt(0, satelliteLayer);
    return () => {
      // Cleanup: Reset to Satellite layer on unmount
      mapRef.current.getLayers().setAt(0, satelliteLayer);
    };
  }, [mapRef]);

  const handleToggle = () => {
    const newLayer = currentLayer === "OSM" ? "Satellite" : "OSM";
    if (!mapRef.current) return;

    // Switch to the selected layer
    mapRef.current.getLayers().setAt(0, layerOptions[newLayer].layer);
    setCurrentLayer(newLayer);
  };

  // Determine the icon to display (opposite of the current layer)
  const displayIcon = currentLayer === "OSM" ? satelliteIcon : openstreetIcon;
  const displayTitle = currentLayer === "OSM" ? "Switch to Satellite View" : "Switch to OSM View";

  return (
    <div className={styles.layerToggleContainer}>
      <img
        src={displayIcon}
        alt={currentLayer === "OSM" ? "Satellite" : "OSM"}
        className={styles.toggleIcon}
        onClick={handleToggle}
        title={displayTitle}
      />
    </div>
  );
};

export default LayerToggle;