// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCo_6uSe775002QKSOwHRhvPqFMhplsYw0",
  authDomain: "copier-52186.firebaseapp.com",
  databaseURL: "https://copier-52186-default-rtdb.firebaseio.com",
  projectId: "copier-52186",
  storageBucket: "copier-52186.firebasestorage.app",
  messagingSenderId: "328209823944",
  appId: "1:328209823944:web:ea6aa0bc947efd70368dfd",
  measurementId: "G-983FKLRDV9",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Realtime Database
export const database = getDatabase(app);
