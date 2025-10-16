import React, { useEffect, useRef, useState } from "react";
import "ol/ol.css";
import "./default.css";
import { Map, View } from "ol";
import { Tile as TileLayer, Image as ImageLayer } from "ol/layer";
import { OSM, ImageWMS, XYZ } from "ol/source";
import { addMapControls } from "./Controls";
import styles from "./App.module.css";
import FeatureInfo from "./FeatureInfo";
import LayerPanel from "./LayersPanelUpdated";
import Measurement from "./Measurements_Tools";
import Legend from "./Legends";
import RotationButton from "./RotateButtons";
import LayerToggle from "./LayerToggle";
import AttributeTable from "./AttributeTable";
import Zoom from "./Zoom";
import { GeoJSON } from "ol/format";
import srLogo from "./SR.jpg";
import watermarkImage from "./Tukincorp.png";
import ImageryYearContainer from "./ImageryYearContainer";
import infologo from "./info.png";
import userManual from "./Manual.pdf";

const WebGIS = () => {
  const mapRef = useRef(null);
  const [layers, setLayers] = useState([]);
  const [wmsLayer, setWmsLayer] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [layerVisibility, setLayerVisibility] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLegendVisible, setIsLegendVisible] = useState(false);
  const [draw, setDraw] = useState(null);
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    layer: null,
  });
  const [attributeTable, setAttributeTable] = useState({
    visible: false,
    layerName: "",
    features: [],
    columns: [],
    loading: false,
    error: null,
  });
  const [infoModeActive, setInfoModeActive] = useState(false);

  const DEFAULT_RASTER_LAYERS = ["TCAS DATA"];

  useEffect(() => {
    if (mapRef.current) return;

    const view = new View({
      projection: "EPSG:4326",
      center: [79.9804, 12.6944], 
      zoom: 18,
    });

    const baseLayer = new TileLayer({
      source: new XYZ({
        url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&key=YOUR_GOOGLE_MAPS_API_KEY",
        maxZoom: 20,
      }),
      title: "Satellite",
      type: "base",
    });

    const newWmsLayer = new ImageLayer({
      source: new ImageWMS({
        url: "https://dev-gs.webgis.ttic.shop/wms",
        params: { LAYERS: DEFAULT_RASTER_LAYERS.join(","), TILED: true },
        ratio: 1,
        serverType: "geoserver",
        crossOrigin: "anonymous",
      }),
      title: "GeoServer WMS",
      visible: true,
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

  const zoomIn = () => {
    if (mapInstance) {
      const currentZoom = mapInstance.getView().getZoom();
      mapInstance.getView().setZoom(currentZoom + 1);
    }
  };

  const zoomOut = () => {
    if (mapInstance) {
      const currentZoom = mapInstance.getView().getZoom();
      mapInstance.getView().setZoom(currentZoom - 1);
    }
  };
  const fetchGeoServerLayers = async () => {
    try {
      const response = await fetch(
        "https://dev-gs.webgis.ttic.shop/wms?service=WMS&version=1.3.0&request=GetCapabilities"
      );
      const text = await response.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "text/xml");
      // Get only top-level layers
      const capability = xml.getElementsByTagName("Capability")[0];
      if (!capability) return;

      const topLayers = capability.getElementsByTagName("Layer")[0];
      if (!topLayers) return;

      const layerElements = topLayers.getElementsByTagName("Layer");
      const layerSet = new Set();

      for (let i = 0; i < layerElements.length; i++) {
        const nameElement = layerElements[i].getElementsByTagName("Name")[0];
        const restrictedElements = ["SA-ED:1-1", "SA-ED:1-10", "SA-ED:1-11", "SA-ED:1-12", "SA-ED:1-13", "SA-ED:1-14", "SA-ED:1-15",
          "SA-ED:1-16", "SA-ED:1-17", "SA-ED:1-18", "SA-ED:1-19", "SA-ED:1-2", "SA-ED:1-20", "SA-ED:1-21", "SA-ED:1-22", "SA-ED:1-23",
          "SA-ED:1-24", "SA-ED:1-25", "SA-ED:1-26", "SA-ED:1-27", "SA-ED:1-28", "SA-ED:1-29", "SA-ED:1-3", "SA-ED:1-30", "SA-ED:1-31",
          "SA-ED:1-32", "SA-ED:1-33", "SA-ED:1-34", "SA-ED:1-35", "SA-ED:1-4", "SA-ED:1-5", "SA-ED:1-6", "SA-ED:1-7", "SA-ED:1-8",
          "SA-ED:1-9", "SA-KRR:1-A1", "JTJ-PTJ:1-AA_59", "JTJ-PTJ:1-AA_60", "JTJ-PTJ:1-AB_58,JTJ-PTJ:1-AB_59",
          "JTJ-PTJ:1-AB_60,JTJ-PTJ:1-AC_57", "JTJ-PTJ:1-AC_58", "JTJ-PTJ:1-AD_55,JTJ-PTJ:1-AD_56", "JTJ-PTJ:1-AD_57",
          "SA-KRR:1-B1", "SA-KRR:1-C1", "SA-ED:2-AA_11", "SA-ED:2-AA_12", "SA-ED:2-AB_10", "SA-ED:2-AB_11", "SA-ED:2-AC_09",
          "SA-ED:2-AC_10", "SA-ED:2-AD_08", "SA-ED:2-AD_09", "SA-ED:2-AE_05", "SA-ED:2-AE_06", "SA-ED:2-AE_07", "SA-ED:2-AE_08", "JTJ-PTJ:2-AE_54",
          "JTJ-PTJ:2-AE_55", "SA-ED:2-AF_05", "SA-ED:2-AF_06", "SA-ED:2-AF_07", "JTJ-PTJ:2-AF_52", "JTJ-PTJ:2-AF_53", "JTJ-PTJ:2-AF_54",
          "SA-ED:2-AG_03", "SA-ED:2-AG_04", "SA-ED:2-AG_05", "SA-ED:2-AG_06", "JTJ-PTJ:2-AG_51", "JTJ-PTJ:2-AG_52", "JTJ-PTJ:2-AG_53",
          "SA-ED:2-AH_02", "SA-ED:2-AH_03", "SA-ED:2-AH_04", "JTJ-PTJ:2-AH_49", "JTJ-PTJ:2-AH_50", "JTJ-PTJ:2-AH_51", "SA-ED:2-AI_02",
          "JTJ-PTJ:2-AI_47", "JTJ-PTJ:2-AI_48", "JTJ-PTJ:2-AI_49", "JTJ-PTJ:2-AJ_44", "JTJ-PTJ:2-AJ_45", "JTJ-PTJ:2-AJ_46", "JTJ-PTJ:2-AJ_47",
          "JTJ-PTJ:2-AK_42", "JTJ-PTJ:2-AK_43", "JTJ-PTJ:2-AK_44", "JTJ-PTJ:2-AL_41", "JTJ-PTJ:2-AL_42", "JTJ-PTJ:3-AM_39", "JTJ-PTJ:3-AM_40",
          "JTJ-PTJ:3-AM_41", "vm-ten:DM_Tile_01", "vm-ten:DM_Tile_02", "vm-ten:DM_Tile_03", "vm-ten:DM_Tile_04", "vm-ten:DM_Tile_05",
          "vm-ten:DM_Tile_06", "vm-ten:DM_Tile_07", "vm-ten:DM_Tile_08,vm-ten:DM_Tile_09", "vm-ten:DM_Tile_10", "vm-ten:DM_Tile_11", "vm-ten:DM_Tile_12",
          "vm-ten:DM_Tile_13", "vm-ten:DM_Tile_14", "vm-ten:DM_Tile_15", "vm-ten:DM_Tile_16", "vm-ten:DM_Tile_17", "vm-ten:DM_Tile_18", "vm-ten:DM_Tile_19",
          "JTJ-PTJ:ED-PTJ 38", "JTJ-PTJ:ED-PTJ", "PTJ-TEN:EK_Tile_01", "PTJ-TEN:EK_Tile_02", "PTJ-TEN:EK_Tile_03", "PTJ-TEN:EK_Tile_04", "PTJ-TEN:EK_Tile_05",
          "PTJ-TEN:EK_Tile_06", "PTJ-TEN:EK_Tile_07", "PTJ-TEN:EK_Tile_08", "PTJ-TEN:EK_Tile_09", "PTJ-TEN:EK_Tile_10", "PTJ-TEN:EK_Tile_11",
          "PTJ-TEN:EK_Tile_12", "PTJ-TEN:EK_Tile_13", "PTJ-TEN:EK_Tile_14", "PTJ-TEN:EK_Tile_15", "PTJ-TEN:EK_Tile_16", "PTJ-TEN:EK_Tile_17",
          "PTJ-TEN:EK_Tile_18", "PTJ-TEN:EK_Tile_19", "PTJ-TEN:EK_Tile_20", "PTJ-TEN:EK_Tile_21", "PTJ-TEN:EK_Tile_22", "PTJ-TEN:EK_Tile_23",
          "PTJ-TEN:EK_Tile_24", "PTJ-TEN:EK_Tile_25", "PTJ-TEN:EK_Tile_26", "PTJ-TEN:EK_Tile_27", "PTJ-TEN:EK_Tile_28", "PTJ-TEN:EK_Tile_29",
          "PTJ-TEN:EK_Tile_30", "PTJ-TEN:KE_Tile_01", "PTJ-TEN:KE_Tile_02", "PTJ-TEN:KE_Tile_03", "PTJ-TEN:KE_Tile_04", "PTJ-TEN:KE_Tile_05",
          "PTJ-TEN:KE_Tile_06", "PTJ-TEN:KE_Tile_07", "PTJ-TEN:KE_Tile_08", "PTJ-TEN:KE_Tile_09", "PTJ-TEN:KE_Tile_10", "PTJ-TEN:KE_Tile_11",
          "PTJ-TEN:KE_Tile_12", "PTJ-TEN:KE_Tile_13", "PTJ-TEN:KE_Tile_14", "PTJ-TEN:KE_Tile_15", "PTJ-TEN:KE_Tile_16", "PTJ-TEN:KE_Tile_17",
          "PTJ-TEN:KE_Tile_18", "PTJ-TEN:KE_Tile_19", "PTJ-TEN:KE_Tile_20", "PTJ-TEN:KE_Tile_21", "PTJ-TEN:KE_Tile_22", "PTJ-TEN:KE_Tile_23",
          "PTJ-TEN:KE_Tile_24", "PTJ-TEN:KE_Tile_25", "PTJ-TEN:KE_Tile_26", "PTJ-TEN:KE_Tile_27", "PTJ-TEN:KE_Tile_28", "PTJ-TEN:KE_Tile_29",
          "PTJ-TEN:KT_Tile_01", "PTJ-TEN:KT_Tile_02", "PTJ-TEN:KT_Tile_03", "PTJ-TEN:KT_Tile_05", "PTJ-TEN:KT_Tile_06", "PTJ-TEN:KT_Tile_07",
          "vm-ten:MT_Tile_01", "vm-ten:MT_Tile_02", "vm-ten:MT_Tile_03", "vm-ten:MT_Tile_04", "vm-ten:MT_Tile_05", "vm-ten:MT_Tile_06",
          "vm-ten:MT_Tile_07", "vm-ten:MT_Tile_08", "vm-ten:MT_Tile_09", "vm-ten:MT_Tile_10", "vm-ten:MT_Tile_11", "vm-ten:MT_Tile_12",
          "vm-ten:MT_Tile_13", "vm-ten:MT_Tile_14", "vm-ten:MT_Tile_15", "vm-ten:MT_Tile_16", "vm-ten:MT_Tile_17", "vm-ten:MT_Tile_18",
          "vm-ten:MT_Tile_19", "vm-ten:MT_Tile_20", "vm-ten:MT_Tile_21", "vm-ten:MT_Tile_22", "vm-ten:MT_Tile_23", "vm-ten:MT_Tile_24",
          "vm-ten:MT_Tile_25", "vm-ten:MT_Tile_26", "vm-ten:MT_Tile_27", "vm-ten:MT_Tile_28", "vm-ten:MT_Tile_29", "vm-ten:MT_Tile_30",
          "vm-ten:MT_Tile_31", "vm-ten:MT_Tile_32", "vm-ten:MT_Tile_33", "PTJ-TEN:NT-Tile_01", "PTJ-TEN:NT-Tile_02", "PTJ-TEN:NT-Tile_03",
          "vm-ten:NT_Tile_03", "PTJ-TEN:NT-Tile_04", "PTJ-TEN:NT-Tile_05", "PTJ-TEN:NT-Tile_06", "PTJ-TEN:NT-Tile_07", "PTJ-TEN:PS_Tile-1",
          "PTJ-TEN:PS_Tile-10", "PTJ-TEN:PS_Tile-11", "PTJ-TEN:PS_Tile-13", "PTJ-TEN:PS_Tile-14", "PTJ-TEN:PS_Tile-15", "PTJ-TEN:PS_Tile-16",
          "PTJ-TEN:PS_Tile-17", "PTJ-TEN:PS_Tile-18", "PTJ-TEN:PS_Tile-19", "PTJ-TEN:PS_Tile-2", "PTJ-TEN:PS_Tile-20", "PTJ-TEN:PS_Tile-21",
          "PTJ-TEN:PS_Tile-22", "PTJ-TEN:PS_Tile-23", "PTJ-TEN:PS_Tile-24", "PTJ-TEN:PS_Tile-3", "PTJ-TEN:PS_Tile-4", "PTJ-TEN:PS_Tile-5",
          "PTJ-TEN:PS_Tile-6", "PTJ-TEN:PS_Tile-7", "PTJ-TEN:PS_Tile-8", "PTJ-TEN:PS_Tile-9", "vm-ten:TD_Tile_01", "vm-ten:TD_Tile_02",
          "vm-ten:TD_Tile_03", "vm-ten:TD_Tile_04", "vm-ten:TD_Tile_05", "vm-ten:TD_Tile_06", "vm-ten:TD_Tile_07", "vm-ten:TD_Tile_08",
          "PTJ-TEN:TK_Tile_01", "PTJ-TEN:TK_Tile_02", "PTJ-TEN:TK_Tile_03", "PTJ-TEN:TK_Tile_04", "PTJ-TEN:TK_Tile_05", "PTJ-TEN:TK_Tile_06",
          "PTJ-TEN:TK_Tile_07", "PTJ-TEN:TK_Tile_08", "vm-ten:VT_Tile_01", "vm-ten:VT_Tile_02", "vm-ten:VT_Tile_03", "vm-ten:VT_Tile_04",
          "vm-ten:VT_Tile_05", "vm-ten:VT_Tile_06", "vm-ten:VT_Tile_07", "vm-ten:VT_Tile_08", "vm-ten:VT_Tile_09", "vm-ten:VT_Tile_10",
          "vm-ten:VT_Tile_11", "vm-ten:VT_Tile_12", "vm-ten:VT_Tile_13", "vm-ten:VT_Tile_14", "vm-ten:VT_Tile_15", "vm-ten:VT_Tile_16",
          "vm-ten:VT_Tile_17", "vm-ten:VT_Tile_18", "vm-ten:VT_Tile_19", "vm-ten:VT_Tile_20", "vm-ten:VT_Tile_21", "vm-ten:VT_Tile_22",
          "vm-ten:VT_Tile_23", "vm-ten:VT_Tile_24", "vm-ten:VT_Tile_25", "vm-ten:VT_Tile_26", "vm-ten:VT_Tile_27", "vm-ten:VT_Tile_28",
          "vm-ten:VT_Tile_29", "vm-ten:VT_Tile_30", "vm-ten:VT_Tile_31", "vm-ten:VT_Tile_32", "vm-ten:VT_Tile_33", "vm-ten:VT_Tile_34",
          "vm-ten:VT_Tile_35", "vm-ten:VT_Tile_36", "vm-ten:VT_Tile_37", "vm-ten:VT_Tile_38", "vm-ten:VT_Tile_39", "vm-ten:VT_Tile_40",
          "vm-ten:VT_Tile_41", "vm-ten:VT_Tile_42", "vm-ten:VT_Tile_4", "vm-ten:VT_Tile_44", "vm-ten:VT_Tile_45", "vm-ten:VT_Tile_46",
          "vm-ten:VT_Tile_47", "vm-ten:VT_Tile_48", "vm-ten:VT_Tile_49", "JTJ-SA:tile 1", "JTJ-SA:tile 2", "JTJ-SA:tile 3", "JTJ-SA:tile 4",
          "JTJ-SA:tile 5", "JTJ-SA:tile 6", "JTJ-PTJ:1-AB_58", "JTJ-PTJ:1-AB_59", "JTJ-PTJ:1-AB_60", "JTJ-PTJ:1-AD_55", "JTJ-PTJ:1-AD_56",
          "JTJ-PTJ:1-AC_57", "vm-ten:DM_Tile_08", "vm-ten:DM_Tile_09", "PTJ-TEN:NT_Tile_01", "PTJ-TEN:NT_Tile_02", "PTJ-TEN:NT_Tile_03",
          "PTJ-TEN:NT_Tile_04", "PTJ-TEN:NT_Tile_05", "PTJ-TEN:NT_Tile_06", "PTJ-TEN:NT_Tile_07", "vm-ten:VT_Tile_43", "SA-KRR:ecw-1", "ED-KRR:ortho",
          "vm-ten ORTHO"];
        if (nameElement && !restrictedElements.includes(nameElement.textContent)) {
          layerSet.add(nameElement.textContent);
        }
      }

      const fetchedLayers = Array.from(layerSet);
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
      const newVisibility = {
        ...prevVisibility,
        [layerName]: !prevVisibility[layerName],
      };
      const activeLayers = Object.keys(newVisibility).filter(
        (name) => newVisibility[name]
      );
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
      layer: layerName,
    });
  };

  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, layer: null });
  };

  const toggleInfoMode = () => {
    setInfoModeActive((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = () => closeContextMenu();
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleFeatureSelect = (feature) => {
    if (!mapInstance || !feature.geometry) {
      console.error("Map not initialized or feature has no geometry:", feature);
      return;
    }
    console.log(feature);
    try {
      const format = new GeoJSON();
      const olFeature = format.readFeature(feature, {
        featureProjection: "EPSG:4326", // Match your map's projection
      });
      console.log("OL Feature:", olFeature.getProperties());
      const geometry = olFeature.getGeometry();

      if (geometry) {
        const view = mapInstance.getView();
        if (geometry.getType() === "Point") {
          const coordinates = geometry.getCoordinates();
          view.setCenter(coordinates);
          view.setZoom(18); // Set a high zoom level for precise point focus
        } else {
          // For non-point geometries, use fit but with a high maxZoom
          view.fit(geometry, {
            maxZoom: 18,
            duration: 500,
          });
        }
      } else {
        console.error("No valid geometry found in feature:", feature);
      }
    } catch (error) {
      console.error("Error zooming to feature:", error);
    }
  };
  const openUserManual = () => {
    window.open(userManual, "_blank");
  };

  const activeLayers = layers.filter((layer) => layerVisibility[layer]);

  return (
    <div className={styles.container}>
      {/* header section */}
      <header className={styles.southernRailwaysHeader}>
        <img
          src={srLogo}
          alt="Southern Railways Logo"
          className={styles.logo}
        />
        <h1 className={styles.infoimage}>
          Tukincorp Pvt. Ltd.
        </h1>
        <img
          title="User manual"
          src={infologo}
          alt="Info Logo"
          className={styles.infoLogo}
          onClick={openUserManual} // Open user manual on click
          style={{ cursor: "pointer" }}
        />
      </header>
      <div id="map" className={styles.map}></div>
      <FeatureInfo
        map={mapInstance}
        wmsLayer={wmsLayer}
        layerVisibility={layerVisibility}
        showModal={showModal}
        setShowModal={setShowModal}
        draw={draw}
      />
      <LayerPanel
        layers={layers}
        layerVisibility={layerVisibility}
        toggleLayerVisibility={toggleLayerVisibility}
        onLayerClick={handleLayerClick}
        setContextMenu={setContextMenu}
        contextMenu={contextMenu}
        closeContextMenu={closeContextMenu}
        infoModeActive={infoModeActive}
        toggleInfoMode={toggleInfoMode}
        setAttributeTable={setAttributeTable}
        map={mapInstance}
        setMinimized={setMinimized}
        isMinimized={isMinimized}
        setIsMinimized={setIsMinimized}
      />

      <Measurement
        map={mapInstance}
        setShowModal={setShowModal}
        setDraw={setDraw}
        draw={draw}
      />

      <div className={styles.watermarkContainer}>
        <div className={styles.developedBy}>Developed by</div>
        <img
          src={watermarkImage}
          alt="Watermark"
          className={styles.watermarkImage}
        />
      </div>
      <ImageryYearContainer isLegendVisible={isLegendVisible} />
      <Legend
        setIsLegendVisible={setIsLegendVisible}
        isLegendVisible={isLegendVisible}
        onLegenedToggle={(visible) => setIsLegendVisible(visible)}
      />
      <LayerToggle mapRef={mapRef} />
      <Zoom mapInstance={mapInstance} zoomIn={zoomIn} zoomOut={zoomOut} />
      <RotationButton
        mapRef={mapRef}
        defaultView={{
          center: [78.96, 10.5],
          zoom: 8,
          rotation: 0,
        }}
      />
      <AttributeTable
        attributeTable={attributeTable}
        setAttributeTable={setAttributeTable}
        onFeatureSelect={handleFeatureSelect}
        setLayers={setLayers}
        setWmsLayer={setWmsLayer}
        setMinimized={setMinimized}
        minimized={minimized}
        setIsMinimized={setIsMinimized}
      />
    </div>
  );
};

export default WebGIS;
