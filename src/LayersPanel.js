import React, { useState } from "react";
import { Layers, X } from "lucide-react";
import styles from "./App.module.css";
import * as olExtent from "ol/extent";

const LayerPanel = ({
  map,
  layers,
  layerVisibility,
  toggleLayerVisibility,
  onLayerClick,
  contextMenu,
  closeContextMenu,
  setAttributeTable,
}) => {
  const [isPanelVisible, setPanelVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLayers = layers
    .filter((layer) => layer.toLowerCase().includes(searchQuery.toLowerCase()))
    .map((layer, index) => {
      const parts = layer.split(':');
      return {
        id: index + 1,
        routeName: parts.length > 1 ? parts[0] : '',
        layerName: parts.length > 1 ? parts.slice(1).join(':') : layer,
        fullName: layer
      };
    });

  const zoomToLayers = (visibleLayers) => {
    if (!map || !visibleLayers.length) return;

    let extent = olExtent.createEmpty();
    Promise.all(
      visibleLayers.map(async (layerName) => {
        const wfsUrl = `http://10.185.41.59:8084/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=${layerName}&outputFormat=application/json`;
        const response = await fetch(wfsUrl);
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          data.features.forEach((feature) => {
            const geometry = feature.geometry;
            if (geometry) {
              const coords = geometry.coordinates;
              if (geometry.type === "Point") {
                olExtent.extend(extent, [coords[0], coords[1], coords[0], coords[1]]);
              }
            }
          });
        }
      })
    ).then(() => {
      if (!olExtent.isEmpty(extent)) {
        map.getView().fit(extent, { 
          padding: [50, 50, 50, 50], 
          duration: 800,
          maxZoom: 30
        });
      }
    });
  };

  const handleToggleLayer = (layer) => {
    const newVisibility = { ...layerVisibility, [layer]: !layerVisibility[layer] };
    toggleLayerVisibility(layer);

    const visibleLayers = Object.keys(newVisibility).filter((l) => newVisibility[l]);
    if (visibleLayers.length > 0) {
      zoomToLayers(visibleLayers);
    }
  };

  const handleOpenAttributeTable = (layerName) => {
    setAttributeTable((prev) => ({
      ...prev,
      visible: true,
      layerName: layerName,
      loading: true,
      error: null,
    }));
    closeContextMenu();
  };

  return (
    <>
      <button
        onClick={() => setPanelVisible(!isPanelVisible)}
        className={styles.layerIcon}
      >
        <Layers size={30} />
      </button>

      {isPanelVisible && (
        <div
          className={styles.layerOverlay}
          style={{
            position: "fixed",
            top: "53%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "700px",
            background: "rgba(255, 255, 255, 0.98)",
            padding: "20px",
            borderRadius: "12px",
            boxShadow: "0 0 25px rgba(0,0,0,0.25)",
            zIndex: 1000,
            height: "75vh",
            display: "flex",
            flexDirection: "column",
            border: "1px solid #e0e0e0",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingBottom: "15px",
              borderBottom: "1px solid #eee",
              marginBottom: "15px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", color: "#333" }}>Layers Panel</h3>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="Search layers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: "10px 15px",
                    borderRadius: "20px",
                    border: "1px solid #ddd",
                    width: "200px",
                    outline: "none",
                    fontSize: "14px",
                   marginLeft: "100px",
                  }}
                />
              </div>
            </div>
            <button 
              onClick={() => {
                setPanelVisible(false)
                setSearchQuery("");
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "5px",
                borderRadius: "50%",
                color: "#666",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f5f5f5";
                e.currentTarget.style.color = "#333";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#666";
              }}
            >
              <X size={20} />
            </button>
          </div>

          <div
            style={{
              flex: 1,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ overflow: "auto", flex: 1 }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "separate",
                  borderSpacing: "0",
                }}
              >
                <thead>
                  <tr style={{ 
                    backgroundColor: "#f8f9fa",
                    position: "sticky",
                    top: 0,
                    zIndex: 10,
                  }}>
                    <th style={{ 
                      padding: "12px 15px",
                      textAlign: "left",
                      fontWeight: "600",
                      color: "#495057",
                      borderBottom: "2px solid #e9ecef",
                    }}>S.No</th>
                    <th style={{ 
                      padding: "12px 15px",
                      textAlign: "left",
                      fontWeight: "600",
                      color: "#495057",
                      borderBottom: "2px solid #e9ecef",
                      width: "80px",
                    }}>Visible</th>
                    <th style={{ 
                      padding: "12px 15px",
                      textAlign: "left",
                      fontWeight: "600",
                      color: "#495057",
                      borderBottom: "2px solid #e9ecef",
                      width: "150px",
                    }}>Route</th>
                    <th style={{ 
                      padding: "12px 15px",
                      textAlign: "left",
                      fontWeight: "600",
                      color: "#495057",
                      borderBottom: "2px solid #e9ecef",
                    }}>Layer Name</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLayers.map((layer) => (
                    <tr
                      key={layer.fullName}
                      onContextMenu={(e) => {
                        if (layerVisibility[layer.fullName]) {
                          onLayerClick(layer.fullName, e);
                        }
                      }}
                      style={{
                        backgroundColor: layerVisibility[layer.fullName] ? "#f0f7ff" : "transparent",
                        transition: "background-color 0.2s",
                      }}
                      onClick={() => handleToggleLayer(layer.fullName)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = layerVisibility[layer.fullName] 
                          ? "#e6f2ff" 
                          : "#f8f9fa";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = layerVisibility[layer.fullName] 
                          ? "#f0f7ff" 
                          : "transparent";
                      }}
                    >
                      <td style={{ 
                        padding: "12px 15px",
                        borderBottom: "1px solid #e9ecef",
                        color: "#495057",
                      }}>{layer.id}</td>
                      <td style={{ 
                        padding: "12px 15px",
                        borderBottom: "1px solid #e9ecef",
                      }}>
                        <input
                          type="checkbox"
                          checked={layerVisibility[layer.fullName]}
                          onChange={() => handleToggleLayer(layer.fullName)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ 
                            cursor: "pointer",
                            width: "16px",
                            height: "16px",
                          }}
                        />
                      </td>
                      <td style={{ 
                        padding: "12px 15px",
                        borderBottom: "1px solid #e9ecef",
                        color: "#495057",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}>{layer.routeName}</td>
                      <td style={{ 
                        padding: "12px 15px",
                        borderBottom: "1px solid #e9ecef",
                        color: "#495057",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}>{layer.layerName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {contextMenu.visible && (
            <div
              style={{
                position: "absolute",
                top: contextMenu.y,
                left: contextMenu.x,
                backgroundColor: "white",
                border: "1px solid #ddd",
                borderRadius: "8px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                zIndex: 1001,
                overflow: "hidden",
                minWidth: "200px",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  padding: "12px 20px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  color: "#495057",
                  fontSize: "14px",
                }}
                onClick={() => handleOpenAttributeTable(contextMenu.layer)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f8f9fa";
                  e.currentTarget.style.color = "#0056b3";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "#495057";
                }}
              >
                Open Attribute Table
              </div>
              <div
                style={{
                  padding: "12px 20px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  color: "#495057",
                  fontSize: "14px",
                  borderTop: "1px solid #eee",
                }}
                onClick={closeContextMenu}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f8f9fa";
                  e.currentTarget.style.color = "#dc3545";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "#495057";
                }}
              >
                Close Menu
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default LayerPanel;