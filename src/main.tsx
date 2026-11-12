import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProviders } from './app/providers';
import { installIosViewportSync } from './shared/lib/pwa';
import './styles/global.css';

installIosViewportSync();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProviders />
  </React.StrictMode>
);
