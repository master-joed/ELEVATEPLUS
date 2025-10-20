// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBLkvrmzu--1fB7UhPgUpdzI6OhmNvs_eE",
  authDomain: "elevateplus-app.firebaseapp.com",
  projectId: "elevateplus-app",
  storageBucket: "elevateplus-app.firebasestorage.app",
  messagingSenderId: "549966017223",
  appId: "1:549966017223:web:ce3338b95524e414d044e2",
  measurementId: "G-KQSS49C483"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the services you'll need
export const auth = getAuth(app);
export const db = getFirestore(app);