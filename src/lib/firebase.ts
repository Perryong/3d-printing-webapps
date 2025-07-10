
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDFWxsEWktHNJxpAwm_zpEnyxp4JrczyWc",
  authDomain: "task-list-6a69a.firebaseapp.com",
  projectId: "task-list-6a69a",
  storageBucket: "task-list-6a69a.firebasestorage.app",
  messagingSenderId: "627122100646",
  appId: "1:627122100646:web:4c7646782e26aaf2ce9767",
  measurementId: "G-YK2C98LD9M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Storage and get a reference to the service
export const storage = getStorage(app);
export default app;
