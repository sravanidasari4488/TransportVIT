import { initializeApp, getApps } from 'firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDIMc3SNDIslvaQ0MTMvCqy56z7K22boTE",
  authDomain: "tracking-app-fb09c.firebaseapp.com",
  projectId: "tracking-app-fb09c",
  storageBucket: "tracking-app-fb09c.appspot.com",
  messagingSenderId: "67297876813",
  appId: "1:67297876813:web:8e0feb3f66b9f9804d7504",
  measurementId: "G-L601BTYGTF"
};

let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

const storage = getStorage(app);
const db = getFirestore(app);

export { auth, storage, db };
