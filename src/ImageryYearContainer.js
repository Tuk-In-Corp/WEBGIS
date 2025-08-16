import React from "react";
import { Camera } from 'lucide-react';
import styles from "./App.module.css";

const ImageryYearContainer = ({ isLegendVisible }) => {
  return (
    <div 
      className={`${styles.imageryYearContainer} ${isLegendVisible ? styles.legendVisible : ''}`}
    >
      <div className={styles.imageryYearContent}>
        <span className={styles.imageryYearText}>
          Imagery year : Jan-Sep 2023<Camera size={15}></Camera> <strong>RAJINISH CONSTRUCTIONS</strong> 
        </span>
      </div>
    </div>
  );
};

export default ImageryYearContainer;