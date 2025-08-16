import React from 'react';
import styles from './App.module.css';

const Sidebar = ({ title, children, isOpen, onClose }) => {
  return (
    <div className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
      <div className={styles.sidebarHeader}>
        <h3 className={styles.sidebarTitle}>{title}</h3>
        <button onClick={onClose} className={styles.closeButton}>
          ×
        </button>
      </div>
      <div className={styles.sidebarContent}>
        {children}
      </div>
    </div>
  );
};

export default Sidebar;