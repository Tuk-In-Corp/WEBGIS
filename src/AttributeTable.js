import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { CircleLoader as Circles} from "react-spinners";
import styles from "./App.module.css";
import { FaTable } from "react-icons/fa6";
import { IoClose } from "react-icons/io5";
import { FiMinimize2 } from "react-icons/fi";

const AttributeTable = ({ attributeTable, setAttributeTable, onFeatureSelect,setWMSlayer,setMinimized,minimized,setIsMinimized }) => {
  // const [minimized, setMinimized] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredFeatures, setFilteredFeatures] = useState([]);

  useEffect(() => {
    const fetchAttributeData = async () => {
      if (attributeTable.loading && attributeTable.layerName) {
        try {
          const wfsUrl = `https://dev-gs.webgis.ttic.shop/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=${attributeTable.layerName}&outputFormat=application/json`;
          const response = await fetch(wfsUrl);
          const data = await response.json();

          if (data.features && data.features.length > 0) {
            const firstFeature = data.features[0];
            const columns = Object.keys(firstFeature.properties).map((key) => ({
              field: key,
              headerName: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
              width: 150,
            }));
            setAttributeTable({
              ...attributeTable,
              features: data.features,
              columns,
              loading: false,
              error: null,
            });
            setFilteredFeatures(data.features);
          } else {
            setAttributeTable({
              ...attributeTable,
              loading: false,
              error: "No features found in this layer",
            });
            setFilteredFeatures([]);
          }
        } catch (error) {
          console.error("Error fetching attribute data:", error);
          setAttributeTable({
            ...attributeTable,
            loading: false,
            error: "Failed to load attribute data",
          });
          setFilteredFeatures([]);
        }
      }
    };

    fetchAttributeData();
  }, [attributeTable.loading, attributeTable.layerName, setAttributeTable]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredFeatures(attributeTable.features);
    } else {
      const filtered = attributeTable.features.filter((feature) => {
        return Object.values(feature.properties).some(
          (value) =>
            value !== null &&
            String(value).toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
      setFilteredFeatures(filtered);
    }
  }, [searchTerm, attributeTable.features]);

  const closeAttributeTable = () => {
    setAttributeTable({
      visible: false,
      layerName: "",
      features: [],
      columns: [],
      loading: false,
      error: null,
    });
    setMinimized(false);
    setSearchTerm("");
  };

  const exportToExcel = () => {
    setDownloading(true);
    setTimeout(() => {
      const wsData = [
        attributeTable.columns.map((col) => col.headerName),
        ...filteredFeatures.map((feature) =>
          attributeTable.columns.map((col) =>
            feature.properties[col.field] !== null ? feature.properties[col.field] : "NULL"
          )
        ),
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Attribute Data");
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const data = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(data, `${attributeTable.layerName}_attributes.xlsx`);
      setDownloading(false);
    }, 1000);
  };

  const handleRowClick = (feature) => {
    if (feature.geometry && onFeatureSelect) {
      onFeatureSelect(feature);
      setMinimized(true); // Automatically minimize when a feature is selected
      setIsMinimized(true); // Set the minimized state in the parent component
    }
  };

  const highlightText = (text, term) => {
    if (!term || !text || term.trim() === "") {
      console.log("No highlighting applied:", { text, term });
      return String(text);
    }
    const regex = new RegExp(`(${term.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")})`, "gi");
    const highlighted = String(text).replace(regex, '<span style="background-color: yellow; font-weight: bold;">$1</span>');
    console.log("Highlighted output:", highlighted);
    return highlighted;
  };

  if (!attributeTable.visible) return null;

  if (minimized) {
    return (
      <div
        className={styles.minimizedBox}
        onClick={() => setMinimized(false)}
      >
        <FaTable className={styles.attributeicon}/> Attribute Table (Click to Maximize)
      </div>
    );
  }

  return (
    <div className={styles.attributeTableOverlay} onClick={closeAttributeTable}>
      <div className={styles.attributeTableModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}> {attributeTable.layerName}</h2>
          <div className={styles.buttonGroup}>
          <button onClick={() => setMinimized(true)} className={styles.minimizeButton} title="Minimize"><FiMinimize2 /></button>
            <button onClick={closeAttributeTable} className={styles.AttributeTablecloseButton} title="Close"><IoClose />
            </button>
          </div>
        </div>

        {attributeTable.loading ? (
          <div className={styles.loadingContainer}>
            <Circles height="80" width="80" color="#5c9ded" ariaLabel="loading" />
            <p>Loading attribute data...</p>
          </div>
        ) : attributeTable.error ? (
          <div className={styles.errorContainer}>{attributeTable.error}</div>
        ) : (
          <>
            <div className={styles.searchContainer}>
              <input
                type="text"
                placeholder="Search in table..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className={styles.clearSearchButton}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            <div className={styles.tableContainer}>
              <table className={styles.attributeTable}>
                <thead>
                  <tr>
                    {attributeTable.columns.map((column) => (
                      <th key={column.field}>{column.headerName}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredFeatures.map((feature, index) => (
                    <tr key={index} onClick={() => handleRowClick(feature)}>
                      {attributeTable.columns.map((column) => (
                        <td
                          key={column.field}
                          dangerouslySetInnerHTML={{
                            __html:
                              feature.properties[column.field] !== null
                                ? highlightText(String(feature.properties[column.field]), searchTerm)
                                : `<span class="${styles.nullValue}">NULL</span>`,
                          }}
                        />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.footer}>
              <span>
                {filteredFeatures.length} of {attributeTable.features.length} records found
                {searchTerm && ` matching "${searchTerm}"`}
              </span>
              <button
                onClick={exportToExcel}
                className={styles.exportButton}
                disabled={attributeTable.loading || attributeTable.error || downloading}
              >
                {downloading ? "Downloading..." : " Download Table"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AttributeTable;