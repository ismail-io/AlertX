import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import SplashScreen from './components/SplashScreen.tsx';
import './index.css';

function Root() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <>
      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
      {splashDone && <App />}
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
