import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "rdesk-demo.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "rdesk-demo",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "rdesk-demo.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Connect to Firestore Emulator if enabled
const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';

if (useEmulator) {
  const emulatorHost = import.meta.env.VITE_FIREBASE_EMULATOR_HOST || 'localhost';
  const emulatorPort = parseInt(import.meta.env.VITE_FIREBASE_EMULATOR_PORT || '8080', 10);
  
  // Only connect if not already connected (prevents reconnection errors)
  try {
    connectFirestoreEmulator(db, emulatorHost, emulatorPort);
    console.log(`🔧 Connected to Firestore Emulator at ${emulatorHost}:${emulatorPort}`);
  } catch (error) {
    // Emulator already connected, ignore error
    if (error.message?.includes('already been called')) {
      console.log('🔧 Firestore Emulator already connected');
    } else {
      console.warn('⚠️ Failed to connect to Firestore Emulator:', error.message);
    }
  }
} else {
  console.log('🌐 Connected to Firebase Firestore (Production)');
}

export default app;
