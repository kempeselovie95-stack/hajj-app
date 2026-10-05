import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { applyWebTheme } from './styles/applyTheme.js';
import './styles/index.css';

applyWebTheme(); // lit la préférence mémorisée (clair / sombre / automatique)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
