import {z} from 'zod';
import {pricingSchema,jobSchema,calculateQuote} from '../../shared/pricing';
import {businessSchema,setupReady} from '../../shared/orders';
import {callable,guard,mutate,db,id,bucket} from './core';
import {readOrder} from './orderService';
export const saveSettings=callable(z.object({requestId:z.string().uuid(),expectedVersion:z.number().int().nonnegative(),settings:pricingSchema,businessConfig:businessSchema}).strict(),async(d,r)=>{
 guard(!d.businessConfig.liveEnabled||setupReady(d.businessConfig),'Live checkout requires a verified recipient, collection details and non-GST declaration');
 if(d.businessConfig.qrPath){guard(/^payment-qr\/[a-zA-Z0-9_-]+\.(png|jpg)$/.test(d.businessConfig.qrPath),'Use an uploaded bank-issued PNG/JPEG QR');const file=bucket().file(d.businessConfig.qrPath);const [m]=await file.getMetadata();guard(Number(m.size)<=2*1024*1024,'QR exceeds 2 MiB');const [bytes]=await file.download();guard(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||(bytes[0]===255&&bytes[1]===216&&bytes[2]===255),'QR must contain PNG/JPEG image data');}
 return mutate(r.auth!.uid,'saveSettings',d,async tx=>{const ref=db.doc('config/business'),s=await tx.get(ref);guard((s.get('settings.version')??0)===d.expectedVersion,'Settings changed. Reload before saving');const settings={...d.settings,version:d.expectedVersion+1};tx.set(ref,{settings,businessConfig:d.businessConfig});return {settings,businessConfig:d.businessConfig};});
},true);
export const getPrivateOrder=callable(z.object({orderId:id}).strict(),async(d,r)=>db.runTransaction(async tx=>(await readOrder(tx,d.orderId,r.auth!.uid,true)).p),true);
export const recordActualCosts=callable(z.object({requestId:z.string().uuid(),orderId:id,job:jobSchema,handlingMinutes:z.number().finite().nonnegative().max(100000),reprintsCostCents:z.number().int().nonnegative().max(1e9),courierCostCents:z.number().int().nonnegative().max(1e9)}).strict(),async(d,r)=>mutate(r.auth!.uid,'recordActualCosts',d,async tx=>{
 const {o,p,priv}=await readOrder(tx,d.orderId,r.auth!.uid,true);guard(o.acceptedQuote&&o.paymentState==='paid'&&!o.cancelled,'Actual profit requires an active paid order');guard(d.job.scope==='batch'&&d.job.source==='bambu-studio-confirmed'&&d.job.quantity===o.quantity,'Actuals must cover the entire ordered batch');
 const q=calculateQuote(d.job,{...p.settings,handlingMinutes:d.handlingMinutes,reserveRate:0},o.fulfilment);
 const costCents=q.costCents+d.reprintsCostCents,courierCents=o.fulfilment==='delivery'?d.courierCostCents:0;
 const actual={costCents,courierCents,profitCents:o.acceptedQuote.totalCents-costCents-courierCents,complete:o.fulfilmentState==='completed'};
 tx.update(priv,{actual,actualInputs:d,audit:[...p.audit,{action:'actual_costs_recorded',uid:r.auth!.uid,at:new Date().toISOString()}]});return actual;
}),true);
