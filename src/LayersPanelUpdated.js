import React, { useState, useEffect, useRef } from "react";
import {
  Layers,
  X,
  ChevronLeft,
  ChevronRight,
  Table,
  Search,
  Eye,
  EyeOff,
} from "lucide-react";
import styles from "./App.module.css";
import * as olExtent from "ol/extent";

const LayerPanel = ({
  map,
  layers,
  layerVisibility,
  toggleLayerVisibility,
  setAttributeTable,
  onPanelStateChange,
}) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const panelRef = useRef(null);
  const searchRef = useRef(null);
  const RESTRICTED_LAYERS = ["CGL_VM:CGL-VM", "ED-KRR:ED-KRR"];

  useEffect(() => {
    if (onPanelStateChange) {
      onPanelStateChange({ isPanelOpen, isExpanded });
    }
  }, [isPanelOpen, isExpanded, onPanelStateChange]);

  const togglePanel = () => {
    setIsPanelOpen(!isPanelOpen);
    if (!isPanelOpen) {
      setIsExpanded(true);
      setTimeout(() => {
        if (searchRef.current) searchRef.current.focus();
      }, 300);
    }
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    setSearchQuery("");
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      setTimeout(() => {
        if (searchRef.current) searchRef.current.focus();
      }, 300);
    }
  };

  const filteredLayers = layers
    .filter((layer) => layer.toLowerCase().includes(searchQuery.toLowerCase()))
    .map((layer, index) => {
      const parts = layer.split(":");
      return {
        id: index + 1,
        routeName: parts.length > 1 ? parts[0] : "",
        layerName: parts.length > 1 ? parts.slice(1).join(":") : layer,
        fullName: layer,
      };
    });

  const zoomToLayers = (visibleLayers) => {
    if (!map || !visibleLayers.length) return;

    let extent = olExtent.createEmpty();
    Promise.all(
      visibleLayers.map(async (layerName) => {
        const wfsUrl = `https://dev-gs.webgis.ttic.shop/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=${layerName}&outputFormat=application/json`;
        const response = await fetch(wfsUrl);
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          data.features.forEach((feature) => {
            const geometry = feature.geometry;
            if (geometry) {
              const coords = geometry.coordinates;
              if (geometry.type === "Point") {
                olExtent.extend(extent, [
                  coords[0],
                  coords[1],
                  coords[0],
                  coords[1],
                ]);
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
          maxZoom: 30,
        });
      }
    });
  };

  const handleToggleLayer = (layer) => {
    const newVisibility = {
      ...layerVisibility,
      [layer]: !layerVisibility[layer],
    };
    toggleLayerVisibility(layer);

    const visibleLayers = Object.keys(newVisibility).filter(
      (l) => newVisibility[l]
    );
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
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        
         
          closePanel();
        
      }
    };

    if (isPanelOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isPanelOpen]);

  return (
    <>
      <button
        onClick={togglePanel}
        className={styles.layerIcon}
        style={{
          position: "absolute",
          top: "80px",
          zIndex: 1,
          transition: "left 0.3s ease",
          border: "none",
          borderRadius: "20%",
          padding: "15px",
          boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          
        }}
        aria-label={isPanelOpen ? "Close layers panel" : "Open layers panel"}
      >
        <Layers size={24} />
      </button>

      <div
        ref={panelRef}
        className={styles.layerPanel}
        style={{
          position: "absolute",
          left: isPanelOpen ? "0" : "-35%",
          top: "0",
          width: "35%",
          height: "100vh",
          backgroundColor: "#fff",
          boxShadow: "2px 0 10px rgba(0,0,0,0.15)",
          zIndex: 999,
          transition: "left 0.3s ease",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "15px",
            borderBottom: "1px solid #eee",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#f8f9fa",
          }}
        >
          <h3 style={{ margin: 0, color: "#1976D2", fontSize: "18px" }}>
            Layers Panel
          </h3>
          <button
            onClick={closePanel}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#666",
              padding: "4px",
              borderRadius: "4px",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f0f0")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            aria-label="Close panel"
          >
            <X size={20} />
          </button>
        </div>

        <div
          style={{
            padding: "15px",
            borderBottom: "1px solid #eee",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Search
              size={18}
              color="#666"
              style={{
                position: "absolute",
                left: "12px",
                pointerEvents: "none",
              }}
            />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search layers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              style={{
                width: "100%",
                padding: "10px 15px 10px 40px",
                borderRadius: "20px",
                border: `1px solid ${isSearchFocused ? "#1976D2" : "#ddd"}`,
                outline: "none",
                fontSize: "14px",
                transition: "border 0.2s",
              }}
            />
          </div>
        </div>

        <div
          style={{
            height: "calc(100vh - 180px)",
            overflowY: "auto",
          }}
        >
          {filteredLayers.length > 0 ? (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "#f5f5f5",
                    position: "sticky",
                    top: 0,
                  }}
                >
                  <th
                    style={{
                      padding: "12px 15px",
                      textAlign: "left",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#555",
                    }}
                  >
                    Route
                  </th>
                  <th
                    style={{
                      padding: "12px 15px",
                      textAlign: "left",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#555",
                    }}
                  >
                    Layer Name
                  </th>
                  <th
                    style={{
                      padding: "12px 15px",
                      textAlign: "center",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#555",
                      width: "80px",
                    }}
                  >
                    Layer Table
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLayers.map((layer) => (
                  <tr
                    key={layer.fullName}
                    style={{
                      borderBottom: "1px solid #eee",
                      backgroundColor: layerVisibility[layer.fullName]
                        ? "#f0f7ff"
                        : "transparent",
                      transition: "background 0.2s",
                    }}
                  >
                    <td
                      style={{
                        padding: "12px 15px",
                        fontSize: "13px",
                        color: "#333",
                        maxWidth: "120px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={layer.routeName}
                    >
                      {layer.routeName}
                    </td>
                    <td
                      style={{
                        padding: "12px 15px",
                        fontSize: "13px",
                        color: "#333",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <button
                          onClick={() => handleToggleLayer(layer.fullName)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "0",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          aria-label={
                            layerVisibility[layer.fullName]
                              ? "Hide layer"
                              : "Show layer"
                          }
                        >
                          {layerVisibility[layer.fullName] ? (
                            <Eye size={16} color="#1976D2" />
                          ) : (
                            <EyeOff size={16} color="#666" />
                          )}
                        </button>
                        <span>{layer.layerName}</span>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "12px 15px",
                        textAlign: "center",
                      }}
                    >
                      {!RESTRICTED_LAYERS.includes(layer.fullName) && (
                        <button
                          onClick={() =>
                            handleOpenAttributeTable(layer.fullName)
                          }
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#1976D2",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "100%",
                            padding: "4px",
                            borderRadius: "4px",
                            transition: "background 0.2s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = "#f0f7ff")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "none")
                          }
                          aria-label="Open attribute table"
                        >
                          <Table size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                padding: "20px",
                color: "#666",
                textAlign: "center",
              }}
            >
              <Search size={40} color="#ddd" style={{ marginBottom: "10px" }} />
              <p>No layers found matching your search</p>
            </div>
          )}
        </div>
      </div>

  
      <div
        style={{
          position: "absolute",
          left: isPanelOpen ? "35%" : "0",
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 1001,
          transition: "left 0.3s ease",
        }}
      >
        <button
          onClick={togglePanel}
          style={{
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: "0 4px 4px 0",
            width: "24px",
            height: "48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "2px 0 5px rgba(0,0,0,0.1)",
            padding: "0",
            margin: "0",
          }}
          aria-label={isPanelOpen ? "Collapse panel" : "Expand panel"}
        >
          {isPanelOpen ? (
            <ChevronLeft onClick={closePanel} size={18} color="#666" />
          ) : (
            <ChevronRight size={18} color="#666" />
          )}
        </button>
      </div>
    </>
  );
};

export default LayerPanel;