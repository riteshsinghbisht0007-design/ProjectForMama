import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './context/AuthContext';
import { SummonProvider } from './context/SummonContext';
import { NotificationProvider } from './context/NotificationContext';
import { ToastProvider } from './components/Toast';
import './index.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ToastProvider>
        <AuthProvider>
          <SummonProvider>
            <NotificationProvider>
            <App />
          </NotificationProvider>
          </SummonProvider>
        </AuthProvider>
      </ToastProvider>
    </React.StrictMode>
  );
}
