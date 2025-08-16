import React, { useEffect, useState, useRef } from "react";
import { Draw, Modify } from "ol/interaction";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import { transform } from "ol/proj";
import { getLength as getGeodesicLength, getArea as getGeodesicArea } from "ol/sphere";
import Feature from "ol/Feature";
import Polygon from "ol/geom/Polygon";
import Point from "ol/geom/Point";
import LineString from "ol/geom/LineString";
import { Style, Stroke, Fill, Text, Circle as CircleStyle } from "ol/style";
import { FaRulerCombined } from "react-icons/fa";
import styles from "./App.module.css";

const Measurement = ({ map }) => {
  const [draw, setDraw] = useState(null);
  const [modify, setModify] = useState(null);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurement, setMeasurement] = useState({ value: 0, type: "line" });
  const [showMeasurementBox, setShowMeasurementBox] = useState(false);
  const measurementBoxRef = useRef(null);
  const [boxPosition, setBoxPosition] = useState({ x: 100, y: 100 });
  const vectorSource = useRef(new VectorSource());
  const pointSource = useRef(new VectorSource());
  const dragOffset = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const activeFeature = useRef(null);
  const firstPoint = useRef(null);
  const closeThreshold = useRef(0);
  const previousFeatures = useRef([]);
  const mapRef = useRef();

  useEffect(() => {
    mapRef.current = map;
  }, [map]);

  const vectorLayer = useRef(
    new VectorLayer({
      source: vectorSource.current,
      style: (feature) => {
        const currentMap = mapRef.current;
        if (!currentMap) return [];
        
        const geometry = feature.getGeometry();
        const type = geometry.getType();
        const styles = [];

        if (type === "LineString") {
          const coords = geometry.getCoordinates();
          const projection = currentMap.getView().getProjection();
          let total = 0;

          styles.push(new Style({
            stroke: new Stroke({ color: "blue", width: 2 })
          }));

          for (let i = 0; i < coords.length - 1; i++) {
            const p1 = transform(coords[i], projection, "EPSG:4326");
            const p2 = transform(coords[i + 1], projection, "EPSG:4326");
            const segmentLength = getGeodesicLength(
              new LineString([p1, p2]),
              { projection: "EPSG:4326" }
            );
            total += segmentLength;

            const midpoint = [
              (coords[i][0] + coords[i + 1][0]) / 2,
              (coords[i][1] + coords[i + 1][1]) / 2
            ];

            styles.push(new Style({
              text: new Text({
                text: `${segmentLength.toFixed(2)} m`,
                font: "12px Arial",
                fill: new Fill({ color: "#000" }),
                stroke: new Stroke({ color: "#fff", width: 2 }),
                offsetY: -10,
                placement: "line",
              }),
              geometry: new Point(midpoint)
            }));
          }

          if (coords.length > 1) {
            styles.push(new Style({
              text: new Text({
                text: `Total: ${total.toFixed(2)} m`,
                font: "14px Arial",
                fill: new Fill({ color: "#000" }),
                stroke: new Stroke({ color: "#fff", width: 3 }),
                offsetY: -20
              }),
              geometry: new Point(coords[coords.length - 1])
            }));
          }
        } else if (type === "Polygon") {
          const area = getGeodesicArea(geometry, {
            projection: currentMap.getView().getProjection()
          });

          styles.push(
            new Style({
              stroke: new Stroke({ color: "blue", width: 2 }),
              fill: new Fill({ color: "rgba(0, 0, 255, 0.2)" }),
              text: new Text({
                text: `${area.toFixed(2)} m²`,
                font: "14px Arial",
                fill: new Fill({ color: "#000" }),
                stroke: new Stroke({ color: "#fff", width: 3 }),
                offsetY: -10,
              }),
            })
          );
        }

        return styles;
      },
    })
  );

  const pointLayer = useRef(
    new VectorLayer({
      source: pointSource.current,
      style: (feature) => {
        const coord = feature.getGeometry().getCoordinates();
        const isFirst = firstPoint.current &&
          coord[0] === firstPoint.current[0] &&
          coord[1] === firstPoint.current[1];

        return new Style({
          image: new CircleStyle({
            radius: isFirst ? 8 : 6,
            fill: new Fill({ color: isFirst ? "red" : "blue" }),
            stroke: new Stroke({ color: "white", width: 2 }),
          }),
        });
      },
    })
  );

  useEffect(() => {
    if (!map) return;
    
    map.addLayer(vectorLayer.current);
    map.addLayer(pointLayer.current);

    const handleFeatureChange = (e) => {
      const feature = e.feature;
      if (feature === activeFeature.current) {
        const geom = feature.getGeometry();
        let value = 0, type = "line";
        
        if (geom instanceof LineString) {
          value = getGeodesicLength(geom, {
            projection: mapRef.current?.getView().getProjection()
          }) || 0;
        } else if (geom instanceof Polygon) {
          value = getGeodesicArea(geom, {
            projection: mapRef.current?.getView().getProjection()
          }) || 0;
          type = "polygon";
        }
        setMeasurement({ value, type });
      }
    };

    vectorSource.current.on("changefeature", handleFeatureChange);

    return () => {
      map.removeLayer(vectorLayer.current);
      map.removeLayer(pointLayer.current);
      vectorSource.current.un("changefeature", handleFeatureChange);
    };
  }, [map]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging.current) return;
      setBoxPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y
      });
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const updatePointMarkers = (coords) => {
    pointSource.current.clear();
    coords.forEach(coord => {
      pointSource.current.addFeature(new Feature(new Point(coord)));
    });
  };

  const convertToPolygon = () => {
    if (!activeFeature.current || !mapRef.current) return;
    const lineCoords = activeFeature.current.getGeometry().getCoordinates();
    if (lineCoords.length < 3) return;
    
    const closed = [...lineCoords, lineCoords[0]];
    const polygon = new Feature(new Polygon([closed]));
    
    vectorSource.current.removeFeature(activeFeature.current);
    vectorSource.current.addFeature(polygon);
    updatePointMarkers(closed);
    previousFeatures.current.push(polygon);
    activeFeature.current = null;
    firstPoint.current = null;
  };

  const enableModify = () => {
    if (!mapRef.current) return;
    const modifyInteraction = new Modify({ source: vectorSource.current });
    mapRef.current.addInteraction(modifyInteraction);
    setModify(modifyInteraction);
  };

  const startMeasurement = () => {
    if (!mapRef.current) return;

    pointSource.current.clear();
    activeFeature.current = null;
    firstPoint.current = null;
    setShowMeasurementBox(true);
    setIsMeasuring(true);

    const drawInteraction = new Draw({
      source: vectorSource.current,
      type: "LineString",
    });

    drawInteraction.on("drawstart", (event) => {
      activeFeature.current = event.feature;
      const geom = event.feature.getGeometry();

      geom.on("change", () => {
        const coords = geom.getCoordinates();
        if (!firstPoint.current && coords.length > 0) {
          firstPoint.current = coords[0];
        }
        updatePointMarkers(coords);
      });
    });

    drawInteraction.on("drawend", () => {
      if (activeFeature.current) {
        previousFeatures.current.push(activeFeature.current);
      }
      enableModify();
    });

    mapRef.current.on("pointermove", (evt) => {
      if (!activeFeature.current || !firstPoint.current) return;
      const coords = activeFeature.current.getGeometry().getCoordinates();
      if (coords.length < 3) return;
      
      const dx = evt.coordinate[0] - firstPoint.current[0];
      const dy = evt.coordinate[1] - firstPoint.current[1];
      closeThreshold.current = mapRef.current.getView().getResolution() * 10;
      const dist = Math.sqrt(dx * dx + dy * dy);
      mapRef.current.getTargetElement().style.cursor = dist < closeThreshold.current ? "pointer" : "default";
    });

    mapRef.current.on("click", (evt) => {
      if (!activeFeature.current || !firstPoint.current) return;
      const coords = activeFeature.current.getGeometry().getCoordinates();
      if (coords.length < 3) return;
      
      const dx = evt.coordinate[0] - firstPoint.current[0];
      const dy = evt.coordinate[1] - firstPoint.current[1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < closeThreshold.current) {
        convertToPolygon();
        drawInteraction.finishDrawing();
      }
    });

    mapRef.current.addInteraction(drawInteraction);
    setDraw(drawInteraction);
  };

  const stopMeasurement = () => {
    if (!mapRef.current) return;
    if (draw) mapRef.current.removeInteraction(draw);
    if (modify) mapRef.current.removeInteraction(modify);
    setDraw(null);
    setModify(null);
    setIsMeasuring(false);
    setShowMeasurementBox(false);
    mapRef.current.getTargetElement().style.cursor = "default";
  };

  const toggleMeasurement = () => {
    isMeasuring ? stopMeasurement() : startMeasurement();
  };

  return (
    <div>
      <button className={styles.measureButton} onClick={toggleMeasurement}>
        <FaRulerCombined /> {isMeasuring ? "Stop Measuring" : "Start Measuring"}
      </button>

      {showMeasurementBox && (
        <div
          ref={measurementBoxRef}
          className={styles.measurementBox}
          style={{ left: boxPosition.x, top: boxPosition.y }}
          onMouseDown={(e) => {
            e.preventDefault();
            dragOffset.current = {
              x: e.clientX - boxPosition.x,
              y: e.clientY - boxPosition.y
            };
            isDragging.current = true;
          }}
        >
          <strong>Measurement:</strong><br />
          {measurement.type === "line"
            ? `${measurement.value.toFixed(2)} m`
            : `${measurement.value.toFixed(2)} m²`}
        </div>
      )}
    </div>
  );
};

export default Measurement;