import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './index.css';
import { initPrintHeaderInjection } from './services/printHeaderInjector';
import { DensityProvider } from './components/common/CompactDensityContext';

// Initialize global window.onbeforeprint letterhead injection
initPrintHeaderInjection();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DensityProvider>
      <App />
    </DensityProvider>
  </StrictMode>,
);

// Register service worker for Offline-First app execution
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('Offline ServiceWorker registered successfully:', reg.scope);
      })
      .catch((err) => {
        console.warn('ServiceWorker registration error:', err);
      });
  });
}



