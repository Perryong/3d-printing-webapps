
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

// Checkout uses a separate named app; emulator mode never uses legacy project credentials.
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { connectStorageEmulator } from 'firebase/storage';
export const checkoutMode = import.meta.env.VITE_CHECKOUT_MODE || 'disabled';
if (!['disabled','emulator','live'].includes(checkoutMode)) throw new Error('Invalid checkout mode');
const emulator = checkoutMode === 'emulator';
const checkoutConfig = emulator ? { apiKey:'demo-key', projectId:'demo-print-checkout', authDomain:'localhost', storageBucket:'demo-print-checkout.firebasestorage.app' } : {
 apiKey:import.meta.env.VITE_CHECKOUT_API_KEY, projectId:import.meta.env.VITE_CHECKOUT_PROJECT_ID, authDomain:import.meta.env.VITE_CHECKOUT_AUTH_DOMAIN, storageBucket:import.meta.env.VITE_CHECKOUT_STORAGE_BUCKET,
};
if (checkoutMode==='live' && Object.values(checkoutConfig).some(v=>!v)) throw new Error('Live checkout configuration is incomplete');
const checkoutApp=checkoutMode==='disabled'?null:initializeApp(checkoutConfig,'checkout');
export const checkoutAuth=checkoutApp?getAuth(checkoutApp):null;
export const checkoutDb=checkoutApp?getFirestore(checkoutApp):null;
export const checkoutFunctions=checkoutApp?getFunctions(checkoutApp,'asia-southeast1'):null;
export const checkoutStorage=checkoutApp?getStorage(checkoutApp):null;
if(emulator){connectAuthEmulator(checkoutAuth!,'http://127.0.0.1:9099',{disableWarnings:true});connectFirestoreEmulator(checkoutDb!,'127.0.0.1',8088);connectFunctionsEmulator(checkoutFunctions!,'127.0.0.1',5001);connectStorageEmulator(checkoutStorage!,'127.0.0.1',9199);}
let session:Promise<string>|undefined;
export async function ensureCustomerSession():Promise<string>{
 if(!checkoutAuth)throw new Error('Checkout is disabled.');
 await checkoutAuth.authStateReady();
 if(checkoutAuth.currentUser)return checkoutAuth.currentUser.uid;
 if(!session)session=signInAnonymously(checkoutAuth).then(c=>c.user.uid).finally(()=>{session=undefined;});
 return session;
}
