// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDhASmSKmJSBbYK-76W7uSGrFmPEz1-MdE",
  authDomain: "chat-cd0b5.firebaseapp.com",
  projectId: "chat-cd0b5",
  storageBucket: "chat-cd0b5.appspot.com",
  messagingSenderId: "1096805749755",
  appId: "1:1096805749755:web:2d6bbe8cb854db263cb15e",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export default db;
export { app,db, auth, storage };
