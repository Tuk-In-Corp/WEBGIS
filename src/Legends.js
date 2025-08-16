import React from "react";
import styles from "./App.module.css";

const Legend = ({ setIsLegendVisible, isLegendVisible }) => {
  const toggleLegend = () => {
    setIsLegendVisible(!isLegendVisible);
  };

  const iconMap = {
    AXLE_COUNTER: "/icons/AXLE_COUNTER.png",
    BOUNDARY:"/icons/BOUNDARY.png",
    BRIDGE: "/icons/BRIDGE.png",
    CABLE_PATH:"/icons/CABLE_PATH.png",
    CULVERT: "/icons/CULVERT.png",
    FOB:"/icons/FOB.png",
    IBP:"/icons/IBP.png",
    KM_STONE: "/icons/KM_STONE.png",
    LC_GATE: "/icons/LC_GATE.png",
    LUS: "/icons/LUS.png",
    MAST: "/icons/MAST.png",
    POINT_SWITCHES:"/icons/Point_Switches.png",
    RAIL_OVER_RAIL: "/icons/RAIL_OVER_RAIL.png",
    RIVER_UNDER_BRIDGE: "/icons/RIVER_UNDER_BRIDGE.png",
    ROB: "/icons/ROB.png",
    RUB: "/icons/RUB.png",
    SIGNAL: "/icons/SIGNAL.png",
    SIGNAL_BOX:"/icons/SIGNAL_BOX.png",
    STATION: "/icons/STATION.png",
    LTE_TOWERS:"/icons/LTE.png",
    TCAS_TOWERS: "/icons/TCAS_TOWER.png",
    LTE_AND_TCAS_TOWERS:"/icons/LTE&TCAS.png",
    
  };

  const allLayers = Object.keys(iconMap).map((key) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
    icon: iconMap[key],
  }));

  return (
    <div className={styles.legendContainer}>
      {!isLegendVisible && (
        <button className={styles.toggleButton} onClick={toggleLegend}>
          Show Legend ▲
        </button>
      )}

      {isLegendVisible && (
        <div className={styles.legendWrapper}>
          <button className={styles.closeLegendButton} onClick={toggleLegend}>
            ▼
          </button>

          <div className={styles.legend}>
            <div className={styles.legendHeader}>
              <h3>Legend</h3>
            </div>
            
            <div className={styles.legendContent}>
              <ul className={styles.legendList}>
                {allLayers.map((layer, index) => (
                  <li key={index} className={styles.legendItem}>
                    <div className={styles.legendItemRow}>
                      <img
                        src={layer.icon}
                        alt={`${layer.name} icon`}
                        className={styles.legendImage}
                        onError={(e) => {
                          console.error(`Icon not found: ${layer.icon}`);
                          e.target.src = "/icons/default.png";
                        }}
                      />
                      <span className={styles.legendLabel}>{layer.name}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Legend;