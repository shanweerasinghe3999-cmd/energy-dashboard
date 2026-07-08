import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyARdW5Wnm7vEihafy_Z-V3TJjJIjywdgQE",
  authDomain: "smart-energy-system-b9c57.firebaseapp.com",
  databaseURL: "https://smart-energy-system-b9c57-default-rtdb.firebaseio.com",
  projectId: "smart-energy-system-b9c57",
  storageBucket: "smart-energy-system-b9c57.firebasestorage.app",
  messagingSenderId: "725738323878",
  appId: "1:725738323878:web:a77ac065f0d4612d309967"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
export const firestore = getFirestore(app);