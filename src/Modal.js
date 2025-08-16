import React from "react";
import styles from "./App.module.css"; // ✅ Import separate CSS

const Modal = ({ availableLayers, setShowLayersModal, wmsLayer }) => {
  const loadLayerOnMap = (layerName) => {
    wmsLayer.getSource().updateParams({ LAYERS: layerName });
    setShowLayersModal(false);
  };

  return (
    <div className={styles.modalContainer}> {/* ✅ Use unique class */}
      <h3 style={{ textAlign: "center" }}>Available Layers</h3>
      <div className={styles.modalTableContainer}> {/* ✅ Use unique class */}
        <table className={styles.modalTable} style={{ width: "100%", textAlign: "left" }}>
          <thead>
            <tr>
              <th>S.No</th>
              <th>Layer Name</th>
            </tr>
          </thead>
          <tbody>
            {availableLayers.map((layer, index) => (
              <tr key={index} onClick={() => loadLayerOnMap(layer.name)} style={{ cursor: "pointer" }}>
                <td>{index + 1}</td>
                <td>{layer.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={() => setShowLayersModal(false)} className={styles.modalCloseButton}>
        Close
      </button>
    </div>
  );
};

export default Modal;
