import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { TaskProvider } from './context/TaskContext';
import { Toaster } from 'react-hot-toast';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <TaskProvider>
          <App />
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 3000,
              style: {
                borderRadius: '12px',
                background: '#1e293b',
                color: '#f1f5f9',
                fontSize: '14px',
                fontFamily: 'Inter, system-ui, sans-serif',
              },
              success: {
                iconTheme: {
                  primary: '#6366f1',
                  secondary: '#f1f5f9',
                },
              },
            }}
          />
        </TaskProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
