/**
 * popup/main.jsx
 * React entry point for the extension popup.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import PopupApp from './App.jsx';
import './popup.css';

const root = createRoot(document.getElementById('popup-root'));
root.render(React.createElement(PopupApp));
