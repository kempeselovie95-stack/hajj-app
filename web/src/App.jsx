import { useEffect, useState } from 'react';

function App() {
  const [message, setMessage] = useState('Chargement...');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setMessage(data.message || 'API accessible'))
      .catch(() => setMessage('API non disponible'));
  }, []);

  return (
    <div className="app">
      <h1>Hawa Hajj App</h1>
      <p>Interface web prête à être développée.</p>
      <p>{message}</p>
    </div>
  );
}

export default App;
