
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyApn4txSJN29ZRle9hOqMli0zfkya8Uh-Q",
  authDomain: "sunvolt-admin.firebaseapp.com",
  projectId: "sunvolt-admin",
  storageBucket: "sunvolt-admin.firebasestorage.app",
  messagingSenderId: "759944928251",
  appId: "1:759944928251:web:602607c4d46d04bf86c95e",
  measurementId: "G-Y6X03PP9EV"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();