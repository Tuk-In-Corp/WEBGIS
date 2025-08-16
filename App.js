import React, { useEffect, useRef, useState } from "react";
import "ol/ol.css";
import { Map, View } from "ol";
import { Tile as TileLayer, Image as ImageLayer } from "ol/layer";
import { OSM, ImageWMS } from "ol/source";
import { addMapControls } from "./Controls";
import styles from "./App.module.css";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import FeatureInfo from './FeatureInfo';
import LayerPanel from './LayersPanel';
import MeasurementTool from "./MeasurementTool"; // Already imported
import Legend from "./Legends";

const WebGIS = () => {
  const mapRef = useRef(null);
  const [layers, setLayers] = useState([]);
  const [wmsLayer, setWmsLayer] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [layerVisibility, setLayerVisibility] = useState({});
  const [selectedLayer, setSelectedLayer] = useState(null);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, layer: null });
  const [attributeTable, setAttributeTable] = useState({ 
    visible: false, 
    layerName: "", 
    features: [], 
    columns: [],
    loading: false,
    error: null
  });
  const [infoModeActive, setInfoModeActive] = useState(false);

  const DEFAULT_RASTER_LAYERS = [
    "VM_TEN:NT_Tile_03",
  ];

  useEffect(() => {
    if (mapRef.current) return;

    const view = new View({
      projection: "EPSG:4326",
      center: [78.96, 10.5],
      zoom: 8,
    });

    const baseLayer = new TileLayer({ source: new OSM(), title: "OSM", type: "base" });

    const newWmsLayer = new ImageLayer({
      source: new ImageWMS({
        url: "http://localhost:8084/geoserver/wms",
        params: { 
          LAYERS: DEFAULT_RASTER_LAYERS.join(","),
          TILED: true
        },
        ratio: 1,
        serverType: "geoserver",
        crossOrigin: 'anonymous'
      }),
      title: "GeoServer WMS",
      visible: true
    });

    const newMap = new Map({
      target: "map",
      view: view,
      layers: [baseLayer, newWmsLayer],
      controls: [],
    });

    addMapControls(newMap);
    mapRef.current = newMap;
    setWmsLayer(newWmsLayer);
    setMapInstance(newMap);

    fetchGeoServerLayers();
  }, []);

  const fetchGeoServerLayers = async () => {
    try {
      const response = await fetch("http://localhost:8084/geoserver/wms?service=WMS&version=1.3.0&request=GetCapabilities");
      const text = await response.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "text/xml");
      const layerElements = xml.getElementsByTagName("Layer");
      let fetchedLayers = [];

      for (let i = 0; i < layerElements.length; i++) {
        const nameElement = layerElements[i].getElementsByTagName("Name")[0];
        if (nameElement) {
          fetchedLayers.push(nameElement.textContent);
        }
      }

      setLayers(fetchedLayers);
      const initialVisibility = fetchedLayers.reduce((acc, layer) => {
        acc[layer] = DEFAULT_RASTER_LAYERS.includes(layer);
        return acc;
      }, {});
      setLayerVisibility(initialVisibility);
    } catch (error) {
      console.error("Error fetching layers from GeoServer:", error);
    }
  };

  const toggleLayerVisibility = (layerName) => {
    setLayerVisibility((prevVisibility) => {
      const newVisibility = { ...prevVisibility, [layerName]: !prevVisibility[layerName] };
      const activeLayers = Object.keys(newVisibility).filter((name) => newVisibility[name]);
      
      if (wmsLayer) {
        if (activeLayers.length > 0) {
          wmsLayer.getSource().updateParams({ LAYERS: activeLayers.join(",") });
          wmsLayer.setVisible(true);
        } else {
          wmsLayer.setVisible(false);
        }
      }
      
      return newVisibility;
    });
  };

  const handleLayerClick = (layerName, e) => {
    e.preventDefault();
    const layerPanel = document.querySelector(`.${styles.layerOverlay}`);
    const rect = layerPanel.getBoundingClientRect();
    setContextMenu({
      visible: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      layer: layerName
    });
  };

  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, layer: null });
  };

  const openAttributeTable = async (layerName) => {
    console.log("Opening attribute table for layer:", layerName);
    closeContextMenu();
    
    setAttributeTable({
      ...attributeTable,
      visible: true,
      layerName,
      loading: true,
      error: null
    });

    try {
      const wfsUrl = `http://localhost:8084/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=${layerName}&outputFormat=application/json`;
      const response = await fetch(wfsUrl);
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const firstFeature = data.features[0];
        const columns = Object.keys(firstFeature.properties).map(key => ({
          field: key,
          headerName: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          width: 150
        }));

        setAttributeTable({
          visible: true,
          layerName,
          features: data.features,
          columns,
          loading: false,
          error: null
        });
      } else {
        setAttributeTable(prev => ({
          ...prev,
          loading: false,
          error: "No features found in this layer"
        }));
      }
    } catch (error) {
      console.error("Error fetching attribute data:", error);
      setAttributeTable(prev => ({
        ...prev,
        loading: false,
        error: "Failed to load attribute data"
      }));
    }
  };

  const closeAttributeTable = () => {
    setAttributeTable({
      visible: false,
      layerName: "",
      features: [],
      columns: [],
      loading: false,
      error: null
    });
  };

  const exportToExcel = () => {
    const wsData = [
      attributeTable.columns.map(col => col.headerName),
      ...attributeTable.features.map(feature => 
        attributeTable.columns.map(col => 
          feature.properties[col.field] !== null ? feature.properties[col.field] : 'NULL'
        )
      )
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attribute Data");
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    saveAs(data, `${attributeTable.layerName}_attributes.xlsx`);
  };

  const toggleInfoMode = () => {
    setInfoModeActive(prev => !prev);
  };

  useEffect(() => {
    const handleClickOutside = () => closeContextMenu();
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);
  const activeLayers = layers.filter((layer) => layerVisibility[layer]);


  return (
    <div className={styles.container}>
      <div id="map" className={styles.map}></div>
      
      <FeatureInfo 
        map={mapInstance}
        wmsLayer={wmsLayer}
        layerVisibility={layerVisibility}
        isActive={infoModeActive}
        onClose={() => setInfoModeActive(false)}
      />

      <LayerPanel 
        layers={layers}
        layerVisibility={layerVisibility}
        toggleLayerVisibility={toggleLayerVisibility}
        onLayerClick={handleLayerClick}
        contextMenu={contextMenu}
        closeContextMenu={closeContextMenu}
        openAttributeTable={openAttributeTable}
        infoModeActive={infoModeActive}
        toggleInfoMode={toggleInfoMode}
      />

      {/* Add MeasurementTool here */}
      <MeasurementTool map={mapInstance} />
      <Legend vectorLayers={activeLayers} mapRef={mapRef} />

      {attributeTable.visible && (
        <div className={styles.attributeTableOverlay} onClick={closeAttributeTable}>
          <div className={styles.attributeTableModal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Attribute Table: {attributeTable.layerName}</h2>
              <div className={styles.buttonGroup}>
                <button 
                  onClick={exportToExcel}
                  className={styles.exportButton}
                >
                  Download Table
                </button>
                <button 
                  onClick={closeAttributeTable}
                  className={styles.closeButton}
                >
                  ×
                </button>
              </div>
            </div>
            
            {attributeTable.loading ? (
              <div className={styles.loadingContainer}>
                <div>Loading data...</div>
              </div>
            ) : attributeTable.error ? (
              <div className={styles.errorContainer}>
                {attributeTable.error}
              </div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.attributeTable}>
                  <thead>
                    <tr className={styles.tableHeaderRow}>
                      {attributeTable.columns.map(column => (
                        <th key={column.field} className={styles.tableHeaderCell}>
                          {column.headerName}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {attributeTable.features.map((feature, index) => (
                      <tr key={index} className={styles.tableRow}>
                        {attributeTable.columns.map(column => (
                          <td key={column.field} className={styles.tableCell}>
                            {feature.properties[column.field] !== null ? 
                              String(feature.properties[column.field]) : 
                              <span className={styles.nullValue}>NULL</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className={styles.footer}>
              {!attributeTable.loading && !attributeTable.error && 
                `${attributeTable.features.length} records found`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebGIS;