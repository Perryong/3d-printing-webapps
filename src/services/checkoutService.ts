import {httpsCallable} from 'firebase/functions';
import {collection,doc,onSnapshot,query,where} from 'firebase/firestore';
import {ref,uploadBytes,getDownloadURL} from 'firebase/storage';
import {checkoutFunctions,checkoutDb,checkoutStorage,ensureCustomerSession} from '../lib/firebase';
import type {Order} from '../../shared/orders';
export async function callCheckout<T>(name:string,data:unknown):Promise<T>{if(!checkoutFunctions)throw new Error('Checkout is disabled.');await ensureCustomerSession();return (await httpsCallable<unknown,T>(checkoutFunctions,name)(data)).data;}
export function watchOrders(uid:string,owner:boolean,next:(orders:Order[])=>void,error:(e:Error)=>void){if(!checkoutDb)return ()=>{};const c=collection(checkoutDb,'orders');return onSnapshot(owner?query(c):query(c,where('customerUid','==',uid)),s=>next(s.docs.map(d=>d.data() as Order).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))),error);}
export function watchOrder(id:string,next:(o:Order)=>void,error:(e:Error)=>void){if(!checkoutDb)return ()=>{};return onSnapshot(doc(checkoutDb,'orders',id),s=>{if(s.exists())next(s.data() as Order);},error);}
export async function uploadModel(file:File,requestId:string){const uid=await ensureCustomerSession();if(!file.name.toLowerCase().endsWith('.stl')||file.size<=0||file.size>50*1024*1024)throw new Error('Choose an STL up to 50 MiB');const path=`models/${uid}/${requestId}.stl`;try{await uploadBytes(ref(checkoutStorage!,path),file,{contentType:'application/octet-stream'});}catch(e){ // Retrying an immutable upload is safe only when the object already exists.
 try{await getDownloadURL(ref(checkoutStorage!,path));}catch{throw e;}
 }return path;}
export async function uploadQr(file:File){if(!['image/png','image/jpeg'].includes(file.type)||file.size>2*1024*1024)throw new Error('Choose a bank-issued PNG/JPEG up to 2 MiB');const path=`payment-qr/${crypto.randomUUID()}.${file.type==='image/png'?'png':'jpg'}`;await uploadBytes(ref(checkoutStorage!,path),file);return path;}
export async function assetUrl(path:string){return getDownloadURL(ref(checkoutStorage!,path));}
export const sgd=(cents:number)=>new Intl.NumberFormat('en-SG',{style:'currency',currency:'SGD'}).format(cents/100);
