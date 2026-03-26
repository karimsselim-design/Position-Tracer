import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * Robust Suppression for ResizeObserver loop errors
 * These warnings are commonly triggered by TradingView widgets and other complex layouts.
 * We suppress them globally to prevent console noise and UI overlay issues.
 */
if (typeof window !== 'undefined') {
  const isResizeError = (msg: string) => 
    msg.includes('ResizeObserver') || 
    msg.includes('loop completed') || 
    msg.includes('loop limit exceeded');

  window.addEventListener('error', (e) => {
    if (e.message && isResizeError(e.message)) {
      e.stopImmediatePropagation();
      e.preventDefault();
      console.debug('Suppressed ResizeObserver warning');
    }
  });

  window.addEventListener('unhandledrejection', (e) => {
    const msg = e.reason?.message || '';
    if (isResizeError(msg)) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  });

  // Patching ResizeObserver directly is the ultimate fallback
  const RO = window.ResizeObserver;
  window.ResizeObserver = class extends RO {
    constructor(callback: ResizeObserverCallback) {
      super((entries, observer) => {
        window.requestAnimationFrame(() => {
          try {
            callback(entries, observer);
          } catch (e) {
            // Silently swallow errors inside the microtask to prevent loop limit exceeded
          }
        });
      });
    }
  };
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}