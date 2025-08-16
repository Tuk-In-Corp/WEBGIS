import React, { useState, useEffect, useRef } from 'react';
import { FaUndo } from 'react-icons/fa';
import styles from './App.module.css';

const RotateButton = ({ mapRef }) => {
  const [rotation, setRotation] = useState(0);
  const joystickRef = useRef(null);
  const outerCircleRef = useRef(null);
  const northMarkerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const animationFrameRef = useRef(null);
  const longPressTimeoutRef = useRef(null);
  const longPressIntervalRef = useRef(null);
  const longPressActionRef = useRef(null);
  const rotationSpeedRef = useRef(2); 

  useEffect(() => {
    if (!mapRef.current) return;

    const updateRotation = () => {
      const view = mapRef.current.getView();
      const degrees = (view.getRotation() * 180 / Math.PI) % 360;
      setRotation(degrees < 0 ? 360 + degrees : degrees);
    };

    mapRef.current.on('postrender', updateRotation);

    return () => {
      mapRef.current.un('postrender', updateRotation);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      clearLongPress();
    };
  }, [mapRef]);

  const panMap = (direction) => {
    if (!mapRef.current) return;

    const view = mapRef.current.getView();
    const currentCenter = view.getCenter();
    const resolution = view.getResolution();
    const panStep = 50 * resolution; 

    let newCenter;
    switch (direction) {
      case 'up':
        newCenter = [currentCenter[0], currentCenter[1] + panStep];
        break;
      case 'down':
        newCenter = [currentCenter[0], currentCenter[1] - panStep];
        break;
      default:
        return;
    }

    view.setCenter(newCenter);
  };

  const rotateMap = (direction) => {
    if (!mapRef.current) return;

    const view = mapRef.current.getView();
  
    const stepDegrees = 0.9 * rotationSpeedRef.current; 
    const newRotation = (rotation + direction * stepDegrees + 360) % 360;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(() => {
      setRotation(newRotation);
      view.setRotation(newRotation * (Math.PI / 180));
    });
  };

  const startContinuousAction = (action, direction) => {
   
    rotationSpeedRef.current = 1;
    
    action(direction);
  
   
    longPressIntervalRef.current = setInterval(() => {
   
      if (rotationSpeedRef.current < 100) {
        rotationSpeedRef.current += 0.9;
      }
      action(direction);
    }, 100); 
  };

  const clearLongPress = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    if (longPressIntervalRef.current) {
      clearInterval(longPressIntervalRef.current);
      longPressIntervalRef.current = null;
    }
    longPressActionRef.current = null;
    rotationSpeedRef.current = 1; 
  };

  const handleDirectionButtonMouseDown = (action, direction, e) => {
    e.stopPropagation();
    longPressActionRef.current = { action, direction };

   
    longPressTimeoutRef.current = setTimeout(() => {
      startContinuousAction(action, direction);
    }, 300);
  };

  const handleButtonMouseUp = (e) => {
    e.stopPropagation();
    
    
    if (longPressTimeoutRef.current && !longPressIntervalRef.current && longPressActionRef.current) {
      longPressActionRef.current.action(longPressActionRef.current.direction);
    }
    
    clearLongPress();
  };

  const handleButtonMouseLeave = (e) => {
    e.stopPropagation();
    clearLongPress();
  };

  const updateMapRotation = (newRotation) => {
    if (mapRef.current) {
      const view = mapRef.current.getView();
      view.setRotation(newRotation * (Math.PI / 180));
    }
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;

    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = e.clientX - centerX;
    const y = e.clientY - centerY;
    
    let angle = Math.atan2(y, x) * (180 / Math.PI);
    angle = (angle + 90 + 360) % 360;

    if (Math.abs(angle - rotation) < 1) return;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      setRotation(angle);
      updateMapRotation(angle);
    });
  };

  const handleMouseUp = (e) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDoubleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const outerCircle = outerCircleRef.current;
    outerCircle.classList.remove('doubleClick');
    outerCircle.classList.add('doubleClick');
  };

  const handleReset = (e) => {
    e.stopPropagation();
    if (mapRef.current) {
      const view = mapRef.current.getView();
      view.setRotation(0);
      setRotation(0);
    }
  };

  return (
    <div className={styles.joystickContainer}>
      <div
        ref={joystickRef}
        className={styles.joystickBase}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          ref={outerCircleRef}
          className={styles.outerCircle}
          style={{ transform: `rotate(${rotation}deg)` }}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
        >
          <div className={styles.northMarkerContainer}>
            <div
              ref={northMarkerRef}
              className={styles.northMarkerCircle}
              onMouseDown={handleMouseDown}
            >
              N
            </div>
          </div>
        </div>

        <div className={styles.innerRing}>
          <button
            className={`${styles.directionButton} ${styles.upButton}`}
            onClick={(e) => {
              e.stopPropagation();
              panMap('up');
            }}
            onMouseDown={(e) => handleDirectionButtonMouseDown(panMap, 'up', e)}
            onMouseUp={handleButtonMouseUp}
            onMouseLeave={handleButtonMouseLeave}
          >
            ▲
          </button>
          <button
            className={`${styles.directionButton} ${styles.rightButton}`}
            onClick={(e) => {
              e.stopPropagation();
              rotateMap(1); 
            }}
            onMouseDown={(e) => handleDirectionButtonMouseDown(rotateMap, 1, e)}
            onMouseUp={handleButtonMouseUp}
            onMouseLeave={handleButtonMouseLeave}
          >
            ▶
          </button>
          <button
            className={styles.resetButton}
            onClick={handleReset}
          >
            <FaUndo />
          </button>
          <button
            className={`${styles.directionButton} ${styles.downButton}`}
            onClick={(e) => {
              e.stopPropagation();
              panMap('down');
            }}
            onMouseDown={(e) => handleDirectionButtonMouseDown(panMap, 'down', e)}
            onMouseUp={handleButtonMouseUp}
            onMouseLeave={handleButtonMouseLeave}
          >
            ▼
          </button>
          <button
            className={`${styles.directionButton} ${styles.leftButton}`}
            onClick={(e) => {
              e.stopPropagation();
              rotateMap(-1); 
            }}
            onMouseDown={(e) => handleDirectionButtonMouseDown(rotateMap, -1, e)}
            onMouseUp={handleButtonMouseUp}
            onMouseLeave={handleButtonMouseLeave}
          >
            ◀
          </button>
        </div>
      </div>
    </div>
  );
};

export default RotateButton;