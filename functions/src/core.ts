import {initializeApp} from 'firebase-admin/app';
import {getFirestore, type Transaction} from 'firebase-admin/firestore';
import {getStorage} from 'firebase-admin/storage';
import {HttpsError, onCall, type CallableRequest} from 'firebase-functions/v2/https';
import {createHash} from 'node:crypto';
import {z} from 'zod';
initializeApp({storageBucket:process.env.GCLOUD_PROJECT+'.firebasestorage.app'});
export const db=getFirestore();
export const bucket=()=>getStorage().bucket();
export const demo=process.env.FUNCTIONS_EMULATOR==='true';
export const id=z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
export const mutationFields={requestId:z.string().uuid(),orderId:id,expectedQuoteVersion:z.number().int().nonnegative()};
export function owner(r:CallableRequest){if(r.auth?.token.owner!==true)throw new HttpsError('permission-denied','Owner access required');}
export function guard(ok:unknown,message:string):asserts ok {if(!ok)throw new HttpsError('failed-precondition',message);}
export function callable<T extends z.ZodTypeAny>(schema:T,fn:(data:z.infer<T>,r:CallableRequest)=>Promise<unknown>,ownerOnly=false){
 return onCall({region:'asia-southeast1',maxInstances:5},async r=>{
  if(!r.auth)throw new HttpsError('unauthenticated','Sign in first');
  if(ownerOnly)owner(r);
  try{return await fn(schema.parse(r.data),r);}catch(e){if(e instanceof HttpsError)throw e;if(e instanceof z.ZodError)throw new HttpsError('invalid-argument',e.issues.map(i=>i.path.join('.')+': '+i.message).join('; '));throw new HttpsError('failed-precondition',e instanceof Error?e.message:'Request failed');}
 });
}
function canonical(value:unknown):string {if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',')+'}';return JSON.stringify(value);}
export const hash=(value:unknown)=>createHash('sha256').update(canonical(value)).digest('hex');
export async function mutate<T>(uid:string,operation:string,data:{requestId:string},fn:(tx:Transaction)=>Promise<T>):Promise<T>{
 const ref=db.doc('requests/'+hash([uid,data.requestId]));const digest=hash([operation,data]);
 return db.runTransaction(async tx=>{const old=await tx.get(ref);if(old.exists){guard(old.get('digest')===digest,'Request ID already used with different data');return old.get('result') as T;}const result=await fn(tx);tx.create(ref,{digest,result,createdAt:new Date().toISOString()});return result;});
}
export async function validateModel(path:string,uid:string){
 guard(new RegExp('^models/'+uid+'/[a-zA-Z0-9_-]+\\.stl$').test(path),'Upload an STL belonging to this customer');
 const file=bucket().file(path);const [meta]=await file.getMetadata();
 guard(Number(meta.size)>0&&Number(meta.size)<=50*1024*1024,'STL must be between 1 byte and 50 MiB');
 const [data]=await file.download();
 const binary=data.length>=84&&data.readUInt32LE(80)>0&&84+data.readUInt32LE(80)*50===data.length;
 const ascii=data.toString('utf8');
 const text=/^\s*solid\b/.test(ascii)&&/endsolid\b/.test(ascii)&&/facet\s+normal/.test(ascii)&&/vertex\s+[-+\d.eE]+\s+[-+\d.eE]+\s+[-+\d.eE]+/.test(ascii);
 guard(binary||text,'File content is not a supported STL');
}
