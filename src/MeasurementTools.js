import React, { useEffect, useState, useRef } from "react";
import { Draw } from "ol/interaction";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import { transform } from "ol/proj";
import { Style, Stroke, Fill, Text } from "ol/style";
import Select from "react-select";
import { FaRulerCombined } from "react-icons/fa";
import "ol/ol.css";
import styles from "./App.module.css";

const MeasurementTool = ({ map ,showModal, setShowModal }) => {
  const [draw, setDraw] = useState(null);
  const [measureType, setMeasureType] = useState(null);
  const [selectedLengthUnit, setSelectedLengthUnit] = useState("km");
  const [selectedAreaUnit, setSelectedAreaUnit] = useState("km²");
  const [measurementValue, setMeasurementValue] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [hasMeasurements, setHasMeasurements] = useState(false);
  const [showMeasurementBox, setShowMeasurementBox] = useState(false);
  const [boxPosition, setBoxPosition] = useState({ x: 100, y: 100 });
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 }); // Context menu state
  const menuRef = useRef(null);
  const measurementBoxRef = useRef(null);
  const vectorSource = useRef(new VectorSource());
  const vectorLayer = useRef(
    new VectorLayer({
      source: vectorSource.current,
      style: (feature) => {
        const geometry = feature.getGeometry();
        const type = geometry.getType();
        const isLine = type === "LineString";
        const isPolygon = type === "Polygon";
        
        if (!isLine && !isPolygon) return null;
        
        let measurement = 0;
        let unit = "";
        let formattedValue = "";
        
        if (isLine) {
          measurement = getLength(geometry) * lengthUnits[selectedLengthUnit];
          unit = selectedLengthUnit;
          formattedValue = `${measurement.toFixed(2)} ${unit}`;
        } else if (isPolygon) {
          measurement = getArea(geometry) * areaUnits[selectedAreaUnit];
          unit = selectedAreaUnit;
          formattedValue = `${measurement.toFixed(2)} ${unit}`;
        }
        
        return new Style({
          stroke: new Stroke({
            color: "rgba(0, 0, 255, 0.7)",
            width: 2,
          }),
          fill: isPolygon ? new Fill({
            color: "rgba(0, 0, 255, 0.1)",
          }) : undefined,
          text: new Text({
            text: formattedValue,
            font: "14px Arial",
            fill: new Fill({
              color: "#000",
            }),
            stroke: new Stroke({
              color: "#fff",
              width: 3,
            }),
            overflow: true,
            offsetY: -10,
          }),
        });
      },
    })
  );
  const dragOffset = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const currentLengthUnitRef = useRef(selectedLengthUnit);
  const currentAreaUnitRef = useRef(selectedAreaUnit);

  useEffect(() => {
    if (!map) return;
    map.addLayer(vectorLayer.current);

    // Add right-click event listener to the map
    const mapElement = map.getTargetElement();
    mapElement.addEventListener("contextmenu", handleContextMenu);

    return () => {
      map.removeLayer(vectorLayer.current);
      mapElement.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [map]);

  useEffect(() => {
    currentLengthUnitRef.current = selectedLengthUnit;
    currentAreaUnitRef.current = selectedAreaUnit;
  }, [selectedLengthUnit, selectedAreaUnit]);

  useEffect(() => {
    if (draw && showModal==true){
      setShowModal(false)
      console.log("Modal closed")
    }
    console.log(showModal)
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setContextMenu({ visible: false, x: 0, y: 0 }); // Hide the context menu
      }
    };
  
    document.addEventListener("mousedown", handleClickOutside);
  
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showModal]);

  const lengthUnits = { meters: 1, km: 0.001, miles: 0.000621371, feet: 3.28084 };
  const areaUnits = { sqmeters: 1, 'km²': 1 / 1_000_000, acres: 0.000247105, sqfeet: 10.7639 };

  const handleContextMenu = (e) => {
    e.preventDefault();
    // Only show context menu if we're in measurement mode or have measurements
    if (draw || vectorSource.current.getFeatures().length > 0) {
      setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
    }
  };

  const handleClearLines = () => {
    vectorSource.current.getFeatures().forEach((feature) => {
      if (feature.getGeometry().getType() === "LineString") {
        vectorSource.current.removeFeature(feature);
      }
    });
    setContextMenu({ visible: false, x: 0, y: 0 });
  };

  const handleClearAreas = () => {
    vectorSource.current.getFeatures().forEach((feature) => {
      if (feature.getGeometry().getType() === "Polygon") {
        vectorSource.current.removeFeature(feature);
      }
    });
    setContextMenu({ visible: false, x: 0, y: 0 });
  };

  const handleClearMeasurements = () => {
    vectorSource.current.clear();
    setContextMenu({ visible: false, x: 0, y: 0 });
  };

  const exitMeasurementMode = () => {
    if (draw) map.removeInteraction(draw); // Remove the drawing interaction
    setDraw(null); // Reset the draw state
    setMeasureType(null); // Reset the measurement type
    setShowMeasurementBox(false); // Hide the measurement box
  };

  const handleExitMeasurementMode = () => {
    exitMeasurementMode(); // Call the existing function to exit measurement mode
    clearMeasurements(); 
    setContextMenu({ visible: false, x: 0, y: 0 }); // Hide the context menu
    setHasMeasurements(false);
  };

  function getLength(geom) {
    const coords = geom.getCoordinates();
    let totalLength = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = transform(coords[i], map.getView().getProjection(), "EPSG:4326");
      const p2 = transform(coords[i + 1], map.getView().getProjection(), "EPSG:4326");
      const dx = p2[0] - p1[0];
      const dy = p2[1] - p1[1];
      totalLength += Math.sqrt(dx * dx + dy * dy) * 111139;
    }
    return totalLength;
  }

  function getArea(geom) {
    const polygonCoords = geom.getCoordinates()[0];
    let area = 0;
    const n = polygonCoords.length;
    for (let i = 0; i < n; i++) {
      const p1 = transform(polygonCoords[i], map.getView().getProjection(), "EPSG:4326");
      const p2 = transform(polygonCoords[(i + 1) % n], map.getView().getProjection(), "EPSG:4326");
      area += ((p2[0] - p1[0]) * (p1[1] + p2[1])) / 2;
    }
    return Math.abs(area) * 111139 * 111139;
  }

  const startMeasurement = (type) => {
    if (!map) return;
  
    // Reset the measurement value when switching measurement types
    setMeasurementValue(null);
  
    setMeasureType(type);
    setShowMenu(false);
    setShowMeasurementBox(true);
    if (draw) map.removeInteraction(draw);
  
    const drawInteraction = new Draw({
      source: vectorSource.current,
      type: type === "line" ? "LineString" : "Polygon",
    });
  
    let sketchFeature = null;
  
    drawInteraction.on("drawstart", (event) => {
      sketchFeature = event.feature;
      setHasMeasurements(true);
      
      const geometry = sketchFeature.getGeometry();
      const isLine = type === "line";
  
      // Listen for geometry changes during drawing
      geometry.on("change", () => {
        const measuredValue = isLine ? getLength(geometry) : getArea(geometry);
        const unit = isLine ? currentLengthUnitRef.current : currentAreaUnitRef.current;
  
        // Update the measurementValue state dynamically
        setMeasurementValue(measuredValue);
  
        const formattedValue = `${(measuredValue * (isLine ? lengthUnits[unit] : areaUnits[unit])).toFixed(2)} ${unit}`;
  
        // Dynamically update the feature's style
        sketchFeature.setStyle(
          new Style({
            stroke: new Stroke({
              color: "rgba(0, 0, 255, 0.7)",
              width: 2,
            }),
            fill: !isLine
              ? new Fill({
                  color: "rgba(0, 0, 255, 0.1)",
                })
              : undefined,
            text: new Text({
              text: formattedValue,
              font: "14px Arial",
              fill: new Fill({
                color: "#000",
              }),
              stroke: new Stroke({
                color: "#fff",
                width: 3,
              }),
              overflow: true,
              offsetY: -10,
            }),
          })
        );
      });
    });
  
    drawInteraction.on("drawend", (event) => {
      const geom = event.feature.getGeometry();
      const isLine = type === "line";
      const measuredValue = isLine ? getLength(geom) : getArea(geom);
  
      // Use the currently selected unit for the new measurement
      const unit = isLine ? currentLengthUnitRef.current : currentAreaUnitRef.current;
      const formattedValue = `${(measuredValue * (isLine ? lengthUnits[unit] : areaUnits[unit])).toFixed(2)} ${unit}`;
  
      // Finalize the feature's style
      event.feature.setStyle(
        new Style({
          stroke: new Stroke({
            color: "rgba(0, 0, 255, 0.7)",
            width: 2,
          }),
          fill: !isLine
            ? new Fill({
                color: "rgba(0, 0, 255, 0.1)",
              })
            : undefined,
          text: new Text({
            text: formattedValue,
            font: "14px Arial",
            fill: new Fill({
              color: "#000",
            }),
            stroke: new Stroke({
              color: "#fff",
              width: 3,
            }),
            overflow: true,
            offsetY: -10,
          }),
        })
      );
  
      // Update the measurementValue state to reflect the measured value
      setMeasurementValue(measuredValue);
      sketchFeature = null; // Clear the reference to the sketch feature
    });
  
    map.addInteraction(drawInteraction);
    setDraw(drawInteraction);
  };

  const clearMeasurements = () => {
    vectorSource.current.clear();
    if (draw) map.removeInteraction(draw);
    setMeasureType(null);
    setShowMeasurementBox(false);
    setMeasurementValue(null);
    setHasMeasurements(false);

  };

  const convertedMeasurement = measurementValue 
    ? measurementValue * (measureType === "line" ? lengthUnits[selectedLengthUnit] : areaUnits[selectedAreaUnit])
    : 0;

  const currentUnit = measureType === "line" ? selectedLengthUnit : selectedAreaUnit;

  const handleMouseDown = (e) => {
    e.preventDefault();
    isDragging.current = true;
    dragOffset.current = { x: e.clientX - boxPosition.x, y: e.clientY - boxPosition.y };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    const newX = e.clientX - dragOffset.current.x;
    const newY = e.clientY - dragOffset.current.y;
  
    // Ensure the box stays within the viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const boxWidth = measurementBoxRef.current.offsetWidth;
    const boxHeight = measurementBoxRef.current.offsetHeight;
  
    setBoxPosition({
      x: Math.max(0, Math.min(newX, viewportWidth - boxWidth)),
      y: Math.max(0, Math.min(newY, viewportHeight - boxHeight)),
    });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  // Update all feature styles when units change
  useEffect(() => {
    if (!vectorSource.current) return;

    // Update the style of all features in the vector source
    vectorSource.current.forEachFeature((feature) => {
      const geometry = feature.getGeometry();
      const type = geometry.getType();
      let measurement = 0;
      let unit = "";
      let formattedValue = "";

      if (type === "LineString") {
        measurement = getLength(geometry) * lengthUnits[selectedLengthUnit];
        unit = selectedLengthUnit;
        formattedValue = `${measurement.toFixed(2)} ${unit}`;
      } else if (type === "Polygon") {
        measurement = getArea(geometry) * areaUnits[selectedAreaUnit];
        unit = selectedAreaUnit;
        formattedValue = `${measurement.toFixed(2)} ${unit}`;
      }

      feature.setStyle(
        new Style({
          stroke: new Stroke({
            color: "rgba(0, 0, 255, 0.7)",
            width: 2,
          }),
          fill: type === "Polygon"
            ? new Fill({
                color: "rgba(0, 0, 255, 0.1)",
              })
            : undefined,
          text: new Text({
            text: formattedValue,
            font: "14px Arial",
            fill: new Fill({
              color: "#000",
            }),
            stroke: new Stroke({
              color: "#fff",
              width: 3,
            }),
            overflow: true,
            offsetY: -10,
          }),
        })
      );
    });
  }, [selectedLengthUnit, selectedAreaUnit]);

  return (
    <div>
      <div className={styles.measurementToolContainer} ref={menuRef}>
        <button className={styles.measurementIcon} onClick={() => {
            setShowMenu(!showMenu);
            // Ensure measurements are enabled when clicking the icon
            if (!showMenu && !measureType) {
              setHasMeasurements(true);
            }
          }}
        >
          <FaRulerCombined size={24} />
        </button>
        {showMenu && (
          <div className={styles.measurementMenu}>
            <button onClick={() => startMeasurement("line")}>Measure Line</button>
            <button onClick={() => startMeasurement("area")}>Measure Area</button>
            <button onClick={clearMeasurements}>Clear Measurements</button>
          </div>
        )}
      </div>
      {showMeasurementBox && (
        <div
          ref={measurementBoxRef}
          className={styles.measurementDisplay}
          style={{ left: `${boxPosition.x}px`, top: `${boxPosition.y}px` }}
          onMouseDown={handleMouseDown}
        >
          <div className={styles.measurementHeader}>
            Current Measurement{" "}
            <button className={styles.Closebutton} onClick={() => setShowMeasurementBox(false)}>
              X
            </button>
          </div>
          <div>
            {convertedMeasurement.toFixed(2)} {currentUnit}
          </div>
          <Select
            value={{ value: currentUnit, label: currentUnit }}
            options={Object.keys(measureType === "line" ? lengthUnits : areaUnits).map((unit) => ({
              value: unit,
              label: unit,
            }))}
            onChange={(selectedOption) => {
              if (measureType === "line") {
                setSelectedLengthUnit(selectedOption.value);
              } else {
                setSelectedAreaUnit(selectedOption.value);
              }
            }}
          />
        </div>
      )}
      {contextMenu.visible && (draw || hasMeasurements) && (
  <div
    ref={menuRef} // Attach the ref here
    className={styles.contextMenu}
    style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
  >
    <button onClick={handleClearLines}>Clear Lines</button>
    <button onClick={handleClearAreas}>Clear Areas</button>
    <button onClick={handleClearMeasurements}>Clear Measurements</button>
    {draw && (
      <button onClick={handleExitMeasurementMode}>Exit Editing Mode</button>
    )}
  </div>
)}
    </div>
  );
};

export default MeasurementTool;