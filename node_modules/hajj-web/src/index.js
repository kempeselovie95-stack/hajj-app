import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';

function App() {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: 24 }}>
      <h1>Hajj App</h1>
      <p>Bienvenue sur l’application web de gestion du Hajj.</p>
      <p>Le backend est prêt à répondre sur http://localhost:5000/api/health.</p>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
