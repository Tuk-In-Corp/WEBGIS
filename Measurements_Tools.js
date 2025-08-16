import React, { useEffect, useState, useRef } from "react";
import { Draw, Modify, Select } from "ol/interaction";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import { transform } from "ol/proj";
import { Style, Stroke, Fill, Text, Circle } from "ol/style";
import Point from "ol/geom/Point";
import LineString from "ol/geom/LineString";
import SelectComponent from "react-select";
import { Ruler } from "lucide-react";
import "ol/ol.css";
import styles from "./App.module.css";

const MeasurementTool = ({ map, draw, setDraw, setShowModal }) => {
  const [measureType, setMeasureType] = useState(null);
  const [selectedLengthUnit, setSelectedLengthUnit] = useState("km");
  const selectedLengthUnitRef = useRef("km");
  const [selectedAreaUnit, setSelectedAreaUnit] = useState("km²");
  const selectedAreaUnitRef = useRef("km²");
  const [currentMeasurement, setCurrentMeasurement] = useState({
    value: null,
    featureId: null,
    type: null,
  });
  const [showMenu, setShowMenu] = useState(false);
  const [hasMeasurements, setHasMeasurements] = useState(false);
  const [showMeasurementBox, setShowMeasurementBox] = useState(false);
  const [boxPosition, setBoxPosition] = useState({ x: 100, y: 100 });
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
  });

  const menuRef = useRef(null);
  const measurementBoxRef = useRef(null);
  const vectorSource = useRef(new VectorSource());
  const vectorLayer = useRef(
    new VectorLayer({
      source: vectorSource.current,
      style: createFeatureStyle,
    })
  );
  const dragOffset = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const modifyInteraction = useRef(null);
  const selectInteraction = useRef(null);
  const featureChangeListener = useRef(null);

  const lengthUnits = {
    meters: 1,
    km: 0.001,
    miles: 0.000621371,
    feet: 3.28084,
  };
  const areaUnits = {
    sqmeters: 1,
    "km²": 1 / 1_000_000,
    acres: 0.000247105,
    sqfeet: 10.7639,
  };

  function createFeatureStyle(feature) {
    const geometry = feature.getGeometry();
    if (!geometry) return null;

    const type = geometry.getType();
    const isLine = type === "LineString";
    const isPolygon = type === "Polygon";

    if (!isLine && !isPolygon) return null;

    let measurement = 0;
    let unit = "";
    let formattedValue = "";

    if (isLine) {
      unit = selectedLengthUnitRef.current;
      measurement = getLength(geometry) * lengthUnits[unit];
      formattedValue = `${measurement.toFixed(2)} ${unit}`;
    } else if (isPolygon) {
      unit = selectedAreaUnitRef.current;
      measurement = getArea(geometry) * areaUnits[unit];
      formattedValue = `${measurement.toFixed(2)} ${unit}`;
    }

    const baseStyle = new Style({
      stroke: new Stroke({
        color: "rgba(0, 0, 255, 0.7)",
        width: 2,
      }),
      fill: isPolygon
        ? new Fill({
            color: "rgba(0, 0, 255, 0.1)",
          })
        : undefined,
      text: new Text({
        text: formattedValue,
        font: "14px Arial",
        backgroundFill: new Fill({ color: "#ffcc33" }),
        padding: [5, 5, 5, 5],
        fill: new Fill({ color: "black" }),
        stroke: new Stroke({ color: "black", width: 0.5 }),
        overflow: true,
        offsetY: -10,
      }),
    });

    const endpointStyles = [];
    const coords = isPolygon
      ? geometry.getCoordinates()[0]
      : geometry.getCoordinates();

    coords.forEach((coord, index) => {
      if (isLine || (isPolygon && index < coords.length - 1)) {
        endpointStyles.push(
          new Style({
            geometry: new Point(coord),
            image: new Circle({
              radius: 5,
              fill: new Fill({
                color: "rgba(13, 61, 219, 0.7)",
              }),
              stroke: new Stroke({ color: "#fff", width: 1 }),
            }),
          })
        );
      }
    });

    return [baseStyle, ...endpointStyles];
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setContextMenu({ visible: false, x: 0, y: 0 });
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!map) return;
    map.addLayer(vectorLayer.current);

    modifyInteraction.current = new Modify({
      source: vectorSource.current,
    });
    map.addInteraction(modifyInteraction.current);
    modifyInteraction.current.setActive(false);

    modifyInteraction.current.on("modifystart", (event) => {
      const feature = event.features.getArray()[0];
      if (feature) {
        if (featureChangeListener.current) {
          feature.getGeometry().un("change", featureChangeListener.current);
        }

        featureChangeListener.current = () => {
          const geometry = feature.getGeometry();
          const newValue =
            geometry.getType() === "LineString"
              ? getLength(geometry)
              : getArea(geometry);

          setCurrentMeasurement((prev) => ({
            ...prev,
            value: newValue,
          }));
          feature.setStyle(createFeatureStyle(feature));
        };

        feature.getGeometry().on("change", featureChangeListener.current);
      }
    });

    modifyInteraction.current.on("modifyend", (event) => {
      const feature = event.features.getArray()[0];
      if (feature && featureChangeListener.current) {
        feature.getGeometry().un("change", featureChangeListener.current);
        featureChangeListener.current = null;
      }
    });

    selectInteraction.current = new Select({
      layers: [vectorLayer.current],
    });
    map.addInteraction(selectInteraction.current);
    selectInteraction.current.setActive(false);

    const selectHandler = selectInteraction.current.on("select", (event) => {
      if (event.selected.length > 0) {
        const feature = event.selected[0];
        const geometry = feature.getGeometry();
        const type = geometry.getType() === "LineString" ? "line" : "area";
        const value = type === "line" ? getLength(geometry) : getArea(geometry);

        setCurrentMeasurement({
          value: value,
          featureId: feature.getId(),
          type: type,
        });
      } else {
        setCurrentMeasurement({ value: null, featureId: null, type: null });
      }
    });

    const mapElement = map.getTargetElement();
    mapElement.addEventListener("contextmenu", handleContextMenu);

    return () => {
      map.removeLayer(vectorLayer.current);
      map.removeInteraction(modifyInteraction.current);
      map.removeInteraction(selectInteraction.current);
      selectInteraction.current.un("select", selectHandler);
      mapElement.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [map]);

  useEffect(() => {
    vectorSource.current.getFeatures().forEach((feature) => {
      feature.setStyle(createFeatureStyle(feature));
    });

    if (currentMeasurement.featureId) {
      const feature = vectorSource.current.getFeatureById(
        currentMeasurement.featureId
      );
      if (feature) {
        const geometry = feature.getGeometry();
        const newValue =
          geometry.getType() === "LineString"
            ? getLength(geometry)
            : getArea(geometry);
        setCurrentMeasurement((prev) => ({
          ...prev,
          value: newValue,
        }));
      }
    }
  }, [selectedLengthUnit, selectedAreaUnit]);

  const handleContextMenu = (e) => {
    e.preventDefault();
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
    checkCurrentMeasurement();
  };

  const handleClearAreas = () => {
    vectorSource.current.getFeatures().forEach((feature) => {
      if (feature.getGeometry().getType() === "Polygon") {
        vectorSource.current.removeFeature(feature);
      }
    });
    setContextMenu({ visible: false, x: 0, y: 0 });
    checkCurrentMeasurement();
  };

  const handleClearMeasurements = () => {
    vectorSource.current.clear();
    setContextMenu({ visible: false, x: 0, y: 0 });
    setCurrentMeasurement({ value: null, featureId: null, type: null });
  };

  const checkCurrentMeasurement = () => {
    if (
      currentMeasurement.featureId &&
      !vectorSource.current.getFeatureById(currentMeasurement.featureId)
    ) {
      setCurrentMeasurement({ value: null, featureId: null, type: null });
    }
  };

  const exitMeasurementMode = () => {
    if (draw) map.removeInteraction(draw);
    setMeasureType(null);
    setShowMeasurementBox(false);
    modifyInteraction.current.setActive(false);
    selectInteraction.current.setActive(false);
    setDraw(null);
    setShowModal(false);
  };

  const handleExitMeasurementMode = () => {
    exitMeasurementMode();
    setContextMenu({ visible: false, x: 0, y: 0 });
    setHasMeasurements(false);
    setDraw(null);
  };

  function getLength(geom) {
    const coords = geom.getCoordinates();
    let totalLength = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = transform(
        coords[i],
        map.getView().getProjection(),
        "EPSG:4326"
      );
      const p2 = transform(
        coords[i + 1],
        map.getView().getProjection(),
        "EPSG:4326"
      );
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
      const p1 = transform(
        polygonCoords[i],
        map.getView().getProjection(),
        "EPSG:4326"
      );
      const p2 = transform(
        polygonCoords[(i + 1) % n],
        map.getView().getProjection(),
        "EPSG:4326"
      );
      area += ((p2[0] - p1[0]) * (p1[1] + p2[1])) / 2;
    }
    area = Math.abs(area);

    const center = transform(
      geom.getInteriorPoint().getCoordinates(),
      map.getView().getProjection(),
      "EPSG:4326"
    );

    const latAdjustment = Math.cos((Math.PI / 180) * center[1]);
    return area * 111320 * 111320 * latAdjustment;
  }

  const startMeasurement = (type) => {
    if (!map) return;

    setCurrentMeasurement({ value: null, featureId: null, type });
    setMeasureType(type);
    setShowMenu(false);
    setShowMeasurementBox(true);
    if (draw) map.removeInteraction(draw);

    modifyInteraction.current.setActive(true);
    selectInteraction.current.setActive(true);

    const drawInteraction = new Draw({
      source: vectorSource.current,
      type: type === "line" ? "LineString" : "Polygon",
      condition: (event) => {
        return event.originalEvent.button === 0; // Left mouse button
      },
    });
    setDraw(drawInteraction);

    drawInteraction.on("drawstart", (event) => {
      setHasMeasurements(true);
      const feature = event.feature;
      feature.setId(Date.now().toString());
      feature.setStyle(createFeatureStyle(feature));

      feature.getGeometry().on("change", () => {
        const geometry = feature.getGeometry();
        const newValue =
          type === "line" ? getLength(geometry) : getArea(geometry);
        setCurrentMeasurement({
          value: newValue,
          featureId: feature.getId(),
          type,
        });
        feature.setStyle(createFeatureStyle(feature));
      });
    });

    drawInteraction.on("drawend", (event) => {
      const feature = event.feature;
      const geom = feature.getGeometry();
      const measuredValue = type === "line" ? getLength(geom) : getArea(geom);

      setCurrentMeasurement({
        value: measuredValue,
        featureId: feature.getId(),
        type,
      });
      feature.setStyle(createFeatureStyle(feature));
    });

    map.addInteraction(drawInteraction);
  };

  const clearMeasurements = () => {
    vectorSource.current.clear();
    if (draw) map.removeInteraction(draw);
    setMeasureType(null);
    setShowMeasurementBox(false);
    setCurrentMeasurement({ value: null, featureId: null, type: null });
    setHasMeasurements(false);
    modifyInteraction.current.setActive(false);
    selectInteraction.current.setActive(false);
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    isDragging.current = true;
    dragOffset.current = {
      x: e.clientX - boxPosition.x,
      y: e.clientY - boxPosition.y,
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    const newX = e.clientX - dragOffset.current.x;
    const newY = e.clientY - dragOffset.current.y;

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

  return (
    <div>
      <div className={styles.measurementToolContainer} ref={menuRef}>
        <button
          className={styles.measurementIcon}
          onClick={() => {
            setShowMenu(!showMenu);
            if (!showMenu && !measureType) {
              setHasMeasurements(true);
            }
          }}
        >
          <Ruler size={24} />
        </button>
        {showMenu && (
          <div className={styles.measurementMenu}>
            <button
              className={styles.measurementbutton}
              onClick={() => startMeasurement("line")}
            >
              Measure Line
            </button>
            <button
              className={styles.measurementbutton}
              onClick={() => startMeasurement("area")}
            >
              Measure Area
            </button>
            <button className={styles.clearbutton} onClick={clearMeasurements}>
              Clear Measurements
            </button>
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
            <button
              className={styles.Closebutton}
              onClick={() => setShowMeasurementBox(false)}
            >
              X
            </button>
          </div>
          <div>
            {currentMeasurement.value
              ? (
                  currentMeasurement.value *
                  (currentMeasurement.type === "line"
                    ? lengthUnits[selectedLengthUnit]
                    : areaUnits[selectedAreaUnit])
                ).toFixed(2)
              : "0.00"}{" "}
            {currentMeasurement.type === "line"
              ? selectedLengthUnit
              : selectedAreaUnit}
          </div>
          <SelectComponent
            value={{
              value:
                currentMeasurement.type === "line"
                  ? selectedLengthUnit
                  : selectedAreaUnit,
              label:
                currentMeasurement.type === "line"
                  ? selectedLengthUnit
                  : selectedAreaUnit,
            }}
            options={Object.keys(
              currentMeasurement.type === "line" ? lengthUnits : areaUnits
            ).map((unit) => ({
              value: unit,
              label: unit,
            }))}
            onChange={(selectedOption) => {
              if (currentMeasurement.type === "line") {
                setSelectedLengthUnit(selectedOption.value);
                selectedLengthUnitRef.current = selectedOption.value;
              } else {
                setSelectedAreaUnit(selectedOption.value);
                selectedAreaUnitRef.current = selectedOption.value;
              }
            }}
          />
        </div>
      )}

      {contextMenu.visible && (draw || hasMeasurements) && (
        <div
          ref={menuRef}
          className={styles.contextMenu}
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
        >
          <button onClick={handleClearLines}>Clear Lines</button>
          <button onClick={handleClearAreas}>Clear Areas</button>
          <button onClick={handleClearMeasurements}>Clear Measurements</button>
          {draw && (
            <button onClick={handleExitMeasurementMode}>
              Exit Editing Mode
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MeasurementTool;