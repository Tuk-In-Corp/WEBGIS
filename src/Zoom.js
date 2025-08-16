import React, { useState, useRef } from "react";
import { FaPlus, FaMinus } from "react-icons/fa";
import styles from "./App.module.css";

const Zoom = ({ mapInstance, zoomIn, zoomOut }) => {
    const intervalRef = useRef(null);
    const speedRef = useRef(100); 

    const handleMouseDown = (action) => {
        const performAction = () => {
            action();
            speedRef.current = Math.min(speedRef.current + 10, 300); 
            intervalRef.current = setTimeout(performAction, speedRef.current);
        };
        performAction();
    };

    const handleMouseUp = () => {
        if (intervalRef.current) {
            clearTimeout(intervalRef.current);
            intervalRef.current = null;
        }
        speedRef.current = 90;
    };

    return (
        <div className={styles.zoomContainer}>
            <button
                className={styles.zoomButton}
                onMouseDown={() => handleMouseDown(zoomIn)}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp} 
            >
                <FaPlus />
            </button>
            <button
                className={styles.zoomButton}
                onMouseDown={() => handleMouseDown(zoomOut)}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp} 
            >
                <FaMinus />
            </button>
        </div>
    );
};

export default Zoom;