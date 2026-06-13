import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ReconciliationProvider } from './context/ReconciliationContext';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ReconciliationProvider>
      <App />
    </ReconciliationProvider>
  </StrictMode>,
);
