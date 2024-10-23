// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBPi0zR8flB8EDbRxMEpAEsqrIV_PVqUao",
  authDomain: "mapapp-58008.firebaseapp.com",
  projectId: "mapapp-58008",
  storageBucket: "mapapp-58008.appspot.com",
  messagingSenderId: "875487584741",
  appId: "1:875487584741:web:abb1ba89ad370205360f0c",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getFirestore(app);
const storage = getStorage(app);
export { app, database, storage };
