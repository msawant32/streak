import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline support in the browser. The Android app ships its files inside the package instead.
if ('serviceWorker' in navigator && import.meta.env.PROD && location.protocol.startsWith('http') && location.hostname !== 'localhost') {
  void navigator.serviceWorker.register('./sw.js');
}
