import React, { useState, useRef, useEffect } from "react";
import { Layers, X, Move, Maximize2, Minimize2, ChevronUp, ChevronDown } from "lucide-react";
import styles from "./App.module.css";
import * as olExtent from "ol/extent";

const LayerPanel = ({
  map,
  layers,
  layerVisibility,
  toggleLayerVisibility,
  setContextMenu,
  contextMenu,
  closeContextMenu,
  setAttributeTable,
}) => {
  const [isPanelVisible, setPanelVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [activeTab, setActiveTab] = useState("layers");
  const panelRef = useRef(null);

  // Initialize position when panel first becomes visible
  useEffect(() => {
    if (isPanelVisible && panelRef.current) {
      const panelWidth = isExpanded ? 700 : 350;
      const panelHeight = isExpanded ? 550 : 400;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
  
      const initialPosition = isExpanded 
        ? {
            x: (windowWidth - panelWidth) / 2,
            y: (windowHeight - panelHeight) / 2
          }
        : {
            x: 100,
            y: windowHeight - panelHeight - 20
          };
  
      const constrainedPosition = getBoundaryConstraints(
        initialPosition.x,
        initialPosition.y,
        panelWidth,
        panelHeight
      );
  
      setPosition(constrainedPosition);
    }
  }, [isPanelVisible, isExpanded]);

  // Handle minimized position
// Update the useEffect for minimized position
useEffect(() => {
  if (isMinimized) {
    setPosition({
      x: 20, // Left side with 20px margin
      y: window.innerHeight - 60 // Bottom with 20px margin (40px height + 20px margin)
    });
  } else {
    // Return to original position when restored
    const panelWidth = isExpanded ? 700 : 350;
    const panelHeight = isExpanded ? 550 : 400;
    setPosition({
      x: (window.innerWidth - panelWidth) / 2,
      y: (window.innerHeight - panelHeight) / 2
    });
  }
}, [isMinimized, isExpanded]);

  const getBoundaryConstraints = (x, y, width, height) => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const buffer = 30;
    
    const constrainedX = Math.max(buffer, Math.min(x, windowWidth - width - buffer));
    const constrainedY = Math.max(buffer, Math.min(y, windowHeight - height - buffer));
    
    return { x: constrainedX, y: constrainedY };
  };

  const handleMouseDown = (e) => {
    if (e.target.closest('input, button') || isMinimized) return;

    setIsDragging(true);
    const rect = panelRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging || isMinimized) return;

    const panelWidth = isExpanded ? 700 : 350;
    const panelHeight = isExpanded ? 550 : 400;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    const constrainedPosition = getBoundaryConstraints(
      newX, 
      newY, 
      panelWidth, 
      panelHeight
    );

    setPosition(constrainedPosition);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  const [prevPosition, setPrevPosition] = useState({ x: 0, y: 0 });

  const toggleMinimize = () => {
    if (!isMinimized) {
      // Store current position before minimizing
      setPrevPosition(position);
      setIsMinimized(true);
    } else {
      // Restore from minimized state
      setIsMinimized(false);
      // Use the stored position or center if none exists
      setPosition(prevPosition.x ? prevPosition : {
        x: (window.innerWidth - (isExpanded ? 700 : 350)) / 2,
        y: (window.innerHeight - (isExpanded ? 550 : 400)) / 2
      });
    }
  };
  const togglePanelSize = () => {
    setIsExpanded(!isExpanded);
    setIsMinimized(false);
  };

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
        const wfsUrl = `http://192.168.2.36:8084/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=${layerName}&outputFormat=application/json`;
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
    setIsExpanded(false);

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

  const handleContextMenu = (layerName, e) => {
    e.preventDefault();
    if (!layerVisibility[layerName]) return;

    const panelRect = panelRef.current.getBoundingClientRect();
    const contextMenuWidth = 200;
    const contextMenuHeight = 100;

    let menuX = e.clientX - panelRect.left;
    let menuY = e.clientY - panelRect.top;

    menuX = Math.max(0, Math.min(menuX, panelRect.width - contextMenuWidth));
    menuY = Math.max(0, Math.min(menuY, panelRect.height - contextMenuHeight));

    setContextMenu({
      visible: true,
      layer: layerName,
      x: menuX + panelRect.left,
      y: menuY + panelRect.top,
    });
  };

  return (
    <>
      <button
        onClick={() => {
          setPanelVisible(!isPanelVisible);
          setIsExpanded(true);
          setIsMinimized(false);
          setActiveTab("layers");
        }}
        className={styles.layerIcon}
      >
        <Layers size={30} />
      </button>

      {isPanelVisible && (
        <div
          ref={panelRef}
          className={styles.layerOverlay}
          style={{
            position: "fixed",
            top: `${position.y}px`,
            left: `${position.x}px`,
            width: isMinimized ? "40px" : isExpanded ? "700px" : "350px",
            height: isMinimized ? "40px" : isExpanded ? "75vh" : "400px",
            maxHeight: isMinimized ? "40px" : isExpanded ? "750px" : "400px",
            background: isMinimized ? "transparent" : "rgba(255, 255, 255, 0.98)",
            padding: isMinimized ? "0" : "20px",
            borderRadius: isMinimized ? "50%" : "12px",
            boxShadow: isMinimized ? "0 0 10px rgba(0,0,0,0.2)" : "0 0 25px rgba(0,0,0,0.25)",
            zIndex: 1000,
            transition: isDragging ? "none" : "all 0.3s ease",
            display: "flex",
            flexDirection: "column",
            border: isMinimized ? "none" : "1px solid #e0e0e0",
            cursor: isDragging ? "grabbing" : "default",
            overflow: "hidden",
            
          }}
          onMouseDown={handleMouseDown}
        >
          {isMinimized ? (
            <div
            style={{
              position: "fixed",
              left: `${position.x}px`,
              bottom: "20%", // Explicitly position at bottom
              width: "40px",
              height: "40px",
              background: "rgba(255, 255, 255, 0.95)",
              borderRadius: "50%",
              boxShadow: "0 0 10px rgba(0,0,0,0.3)",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              border: "2px solid #0056b3",
              transition: "all 0.3s ease",
            }}
            >
              <button
                onClick={toggleMinimize}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "5px",
                  borderRadius: "50%",
                  color: "#0056b3",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  height: "100%",


                }}
              >
                <ChevronUp size={24} />
              </button>
            </div>
          ) : (
            <>
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
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Move size={18} style={{ cursor: 'move' }} />
                  <div style={{ display: "flex", gap: "5px" }}>
                    <button
                      onClick={() => setActiveTab("layers")}
                      style={{
                        padding: "5px 10px",
                        background: activeTab === "layers" ? "#e6f2ff" : "transparent",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontWeight: activeTab === "layers" ? "600" : "normal",
                        color: activeTab === "layers" ? "#0056b3" : "#495057",
                        transition: "all 0.2s",
                      }}
                    >
                      Layers
                    </button>
                    <button
                      onClick={() => setActiveTab("attributes")}
                      style={{
                        padding: "5px 10px",
                        background: activeTab === "attributes" ? "#e6f2ff" : "transparent",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontWeight: activeTab === "attributes" ? "600" : "normal",
                        color: activeTab === "attributes" ? "#0056b3" : "#495057",
                        transition: "all 0.2s",
                      }}
                    >
                      Attributes
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <button
                    onClick={toggleMinimize}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "5px",
                      borderRadius: "4px",
                      color: "#666",
                    }}
                  >
                    <ChevronDown size={18} />
                  </button>
                  <button
                    onClick={togglePanelSize}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "5px",
                      borderRadius: "4px",
                      color: "#666",
                    }}
                  >
                    {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                  </button>
                  <button
                    onClick={() => {
                      setPanelVisible(false);
                      setSearchQuery("");
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "5px",
                      borderRadius: "4px",
                      color: "#666",
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {activeTab === "layers" && (
                <>
                  {isExpanded && (
                    <div style={{ marginBottom: "15px" }}>
                      <input
                        type="text"
                        placeholder="Search layers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                          padding: "10px 15px",
                          borderRadius: "20px",
                          border: "1px solid #ddd",
                          width: "100%",
                          outline: "none",
                          fontSize: "14px",
                        }}
                      />
                    </div>
                  )}

                  <div
                    style={{
                      flex: 1,
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div
                      style={{
                        overflow: "auto",
                        flex: 1,
                        scrollbarWidth: "thin",
                        msOverflowStyle: "none",
                      }}
                    >
                      {isExpanded ? (
                        <div
                          style={{
                            width: "100%",
                            overflowX: "hidden",
                          }}
                        >
                          <table
                            style={{
                              width: "100%",
                              borderCollapse: "separate",
                              borderSpacing: "0",
                              tableLayout: "fixed",
                            }}
                          >
                            <colgroup>
                              <col style={{ width: "60px" }} />
                              <col style={{ width: "80px" }} />
                              <col style={{ width: "150px" }} />
                              <col />
                            </colgroup>
                            <thead>
                              <tr
                                style={{
                                  backgroundColor: "#f8f9fa",
                                  position: "sticky",
                                  top: 0,
                                  zIndex: 10,
                                }}
                              >
                                <th
                                  style={{
                                    padding: "12px 15px",
                                    textAlign: "left",
                                    fontWeight: "600",
                                    color: "#495057",
                                    borderBottom: "2px solid #e9ecef",
                                  }}
                                >
                                  S.No
                                </th>
                                <th
                                  style={{
                                    padding: "12px 15px",
                                    textAlign: "left",
                                    fontWeight: "600",
                                    color: "#495057",
                                    borderBottom: "2px solid #e9ecef",
                                  }}
                                >
                                  Visible
                                </th>
                                <th
                                  style={{
                                    padding: "12px 15px",
                                    textAlign: "left",
                                    fontWeight: "600",
                                    color: "#495057",
                                    borderBottom: "2px solid #e9ecef",
                                  }}
                                >
                                  Route
                                </th>
                                <th
                                  style={{
                                    padding: "12px 15px",
                                    textAlign: "left",
                                    fontWeight: "600",
                                    color: "#495057",
                                    borderBottom: "2px solid #e9ecef",
                                  }}
                                >
                                  Layer Name
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredLayers.map((layer) => (
                                <tr
                                  key={layer.fullName}
                                  onContextMenu={(e) => handleContextMenu(layer.fullName, e)}
                                  style={{
                                    backgroundColor: layerVisibility[layer.fullName]
                                      ? "#f0f7ff"
                                      : "transparent",
                                    transition: "background-color 0.2s",
                                  }}
                                  onClick={() => handleToggleLayer(layer.fullName)}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = layerVisibility[
                                      layer.fullName
                                    ]
                                      ? "#e6f2ff"
                                      : "#f8f9fa";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = layerVisibility[
                                      layer.fullName
                                    ]
                                      ? "#f0f7ff"
                                      : "transparent";
                                  }}
                                >
                                  <td
                                    style={{
                                      padding: "12px 15px",
                                      borderBottom: "1px solid #e9ecef",
                                      color: "#495057",
                                    }}
                                  >
                                    {layer.id}
                                  </td>
                                  <td
                                    style={{
                                      padding: "12px 15px",
                                      borderBottom: "1px solid #e9ecef",
                                    }}
                                  >
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
                                  <td
                                    style={{
                                      padding: "12px 15px",
                                      borderBottom: "1px solid #e9ecef",
                                      color: "#495057",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {layer.routeName}
                                  </td>
                                  <td
                                    style={{
                                      padding: "12px 15px",
                                      borderBottom: "1px solid #e9ecef",
                                      color: "#495057",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {layer.layerName}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {filteredLayers
                            .filter((layer) => layerVisibility[layer.fullName])
                            .map((layer) => (
                              <div
                                key={layer.fullName}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  padding: "10px",
                                  borderRadius: "6px",
                                  backgroundColor: "#f0f7ff",
                                  cursor: "pointer",
                                }}
                                onClick={() => handleToggleLayer(layer.fullName)}
                                onContextMenu={(e) => handleContextMenu(layer.fullName, e)}
                              >
                                <input
                                  type="checkbox"
                                  checked={layerVisibility[layer.fullName]}
                                  onChange={() => handleToggleLayer(layer.fullName)}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    cursor: "pointer",
                                    width: "16px",
                                    height: "16px",
                                    marginRight: "10px",
                                  }}
                                />
                                <span
                                  style={{
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {layer.layerName}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {activeTab === "attributes" && (
                <div style={{ flex: 1, overflow: "auto" }}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      padding: "5px",
                    }}
                  >
                    {filteredLayers.map((layer) => (
                      <div
                        key={layer.fullName}
                        style={{
                          padding: "12px 15px",
                          borderRadius: "6px",
                          backgroundColor: layerVisibility[layer.fullName] ? "#f0f7ff" : "#f8f9fa",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          borderLeft: `4px solid ${
                            layerVisibility[layer.fullName] ? "#0056b3" : "#adb5bd"
                          }`,
                        }}
                        onClick={() => handleOpenAttributeTable(layer.fullName)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = layerVisibility[layer.fullName]
                            ? "#e6f2ff"
                            : "#e9ecef";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = layerVisibility[layer.fullName]
                            ? "#f0f7ff"
                            : "#f8f9fa";
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: "500",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              color: layerVisibility[layer.fullName] ? "#0056b3" : "#495057",
                            }}
                          >
                            {layer.layerName}
                          </span>
                          {!layerVisibility[layer.fullName] && (
                            <span
                              style={{
                                fontSize: "12px",
                                color: "#6c757d",
                                fontStyle: "italic",
                              }}
                            >
                              (Layer hidden)
                            </span>
                          )}
                        </div>
                        {layer.routeName && (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#6c757d",
                              marginTop: "4px",
                            }}
                          >
                            {layer.routeName}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {contextMenu.visible && (
                <div
                  style={{
                    position: "absolute",
                    top: `${contextMenu.y - position.y - 20}px`,
                    left: `${contextMenu.x - position.x - 20}px`,
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
            </>
          )}
        </div>
      )}
    </>
  );
};

export default LayerPanel;