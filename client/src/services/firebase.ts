import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Varsayılan veya localStorage'da kayıtlı Firebase ayarları
const getFirebaseConfig = () => {
  const saved = localStorage.getItem('erp_firebase_config');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
  }
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDemoDummyKeyForAntigravityErp1234',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'beecursor-erp-cloud.firebaseapp.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'beecursor-erp-cloud',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'beecursor-erp-cloud.appspot.com',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1234567890:web:abcdef12345678',
  };
};

export const getFirebaseApp = () => {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(getFirebaseConfig());
};

export const getFirestoreDb = () => {
  try {
    const app = getFirebaseApp();
    return getFirestore(app);
  } catch (err) {
    console.warn('Firestore başlatılamadı:', err);
    return null;
  }
};
