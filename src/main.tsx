import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './context/AuthContext';
import { SummonProvider } from './context/SummonContext';
import './index.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <AuthProvider>
        <SummonProvider>
          <App />
        </SummonProvider>
      </AuthProvider>
    </React.StrictMode>
  );
}
