import React, { useEffect, useState, useRef } from 'react';
import styles from './App.module.css';
import {IoClose} from 'react-icons/io5';
import { FiMinimize2 } from 'react-icons/fi';
import { fromLonLat } from 'ol/proj';

const FeatureInfo = ({ map, wmsLayer, layerVisibility, showModal, setShowModal, draw }) => {
  const [featureData, setFeatureData] = useState(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [minimized, setMinimized] = useState(false);
  const modalRef = useRef(null);
  const minimizedRef = useRef(null);

  // Function to center the modal
  const centerModal = () => {
    const element = minimized ? minimizedRef.current : modalRef.current;
    if (element) {
      const elementWidth = element.offsetWidth;
      const elementHeight = element.offsetHeight;
      setPosition({
        x: window.innerWidth / 2 - elementWidth / 2,
        y: window.innerHeight / 2 - elementHeight / 2
      });
    }
  };

  useEffect(() => {
    if (!map || !wmsLayer) return;

    const clickHandler = async (evt) => {
      const viewResolution = map.getView().getResolution();
      const visibleLayers = Object.keys(layerVisibility).filter(layer => layerVisibility[layer]);
      
      if (visibleLayers.length === 0) return;

      const url = wmsLayer.getSource().getFeatureInfoUrl(
        evt.coordinate,
        viewResolution,
        'EPSG:4326',
        { 
          'INFO_FORMAT': 'application/json',
          'QUERY_LAYERS': visibleLayers.join(','),
          'FEATURE_COUNT': 1
        }
      );

      if (!url) return;

      try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.features && data.features.length > 0) {
          const feature = data.features[0];
          const coords = fromLonLat(evt.coordinate);
          
          setFeatureData({
            layerName: visibleLayers[0],
            coordinates: {
              x: coords[0].toFixed(4),
              y: coords[1].toFixed(4),
              longitude: evt.coordinate[0].toFixed(6),
              latitude: evt.coordinate[1].toFixed(6)
            },
            properties: feature.properties
          });

          setShowModal(true);
          setMinimized(false);
        }
      } catch (error) {
        console.error("Error fetching feature info:", error);
      }
    };

    map.on('click', clickHandler);

    return () => {
      if (map) {
        map.un('click', clickHandler);
      }
    };
  }, [map, wmsLayer, layerVisibility]);

  // Center modal when it becomes visible or when minimized state changes
  useEffect(() => {
    if (showModal) {
      centerModal();
    }
  }, [showModal, minimized]);

  const closeModal = () => {
    setShowModal(false);
    setFeatureData(null);
    setMinimized(false);
  };

  const handleMouseDown = (e) => {
    // Don't start dragging if clicking on interactive elements
    if (
      e.target.tagName === 'BUTTON' || 
      e.target.tagName === 'INPUT' || 
      e.target.tagName === 'A' ||
      (e.target.classList && e.target.classList.contains('noDrag'))
    ) {
      return;
    }
    
    const rect = (minimized ? minimizedRef.current : modalRef.current).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const toggleMinimize = (e) => {
    e.stopPropagation();
    setMinimized(!minimized);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  if (!showModal || !featureData || draw) return null;

  if (minimized) {
    return (
      <div 
        ref={minimizedRef}
        className={styles.minimizedFeatureInfo}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'move'
        }}
        onMouseDown={handleMouseDown}
      >
        <div className={styles.minimizedHeader}>
          <span onClick={() => setMinimized(false)}>📋 {featureData.layerName}</span>
          <button 
            className={`${styles.minimizedCloseButton} noDrag`}
            onClick={(e) => {
              e.stopPropagation();
              closeModal();
            }}
          >
            <IoClose />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={styles.featureModalOverlay} 
      onClick={closeModal}
    >
      <div 
        ref={modalRef}
        className={styles.featureModal} 
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'move',
          transform: 'translate(0, 0)'
        }}
      >
        <div className={styles.modalHeader}>
          <h3>{featureData.layerName}</h3>
          <div className={styles.modalButtons}>
            <button 
              className={`${styles.minimizeButton} noDrag`}
              onClick={toggleMinimize}
              title="Minimize"
            >
              <FiMinimize2 />
            </button>
            <button 
              className={`${styles.closeButton} noDrag`}
              onClick={(e) => {
                e.stopPropagation();
                closeModal();
              }}
              title="Close"
            >
              <IoClose />
            </button>
          </div>
        </div>
        
        <div className={styles.coordinatesInfo}>
          <p><strong>Coordinates:</strong> X: {featureData.coordinates.x}, Y: {featureData.coordinates.y}</p>
          <p><strong>Lat/Long:</strong> {featureData.coordinates.latitude}, {featureData.coordinates.longitude}</p>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.featureTable}>
            <thead>
              <tr>
                <th>Property</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(featureData.properties).map(([key, value]) => (
                <tr key={key}>
                  <td>{key}</td>
                  <td>{value !== null ? value.toString() : 'NULL'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FeatureInfo;