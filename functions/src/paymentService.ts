import {z} from 'zod';
import {requireVersion} from '../../shared/orders';
import {callable,guard,mutate,mutationFields,db,hash,id} from './core';
import {readOrder} from './orderService';
export const claimPayment=callable(z.object({...mutationFields,transferReference:z.string().trim().max(100).optional()}).strict(),async(d,r)=>mutate(r.auth!.uid,'claimPayment',d,async tx=>{
 const {o,ref,p,priv}=await readOrder(tx,d.orderId,r.auth!.uid);requireVersion(o,d.expectedQuoteVersion);guard(!o.cancelled&&o.quoteState==='accepted'&&o.paymentState==='awaiting_payment','Accept the current quote before claiming payment');const now=new Date().toISOString();tx.update(ref,{paymentState:'verification_pending',transferReference:d.transferReference??'',updatedAt:now});tx.update(priv,{audit:[...p.audit,{action:'payment_claimed',uid:r.auth!.uid,at:now}]});return {ok:true};
}));
export const verifyPayment=callable(z.object({...mutationFields,decision:z.enum(['approve','reject']),bankReference:z.string().trim().min(1).max(100).optional(),reason:z.string().trim().min(1).max(500).optional()}).strict(),async(d,r)=>mutate(r.auth!.uid,'verifyPayment',d,async tx=>{
 const {o,ref,p,priv}=await readOrder(tx,d.orderId,r.auth!.uid,true);requireVersion(o,d.expectedQuoteVersion);guard(!o.cancelled&&o.paymentState==='verification_pending','No payment awaits verification');const now=new Date().toISOString();
 if(d.decision==='reject'){guard(d.reason,'Explain why payment was not verified');tx.update(ref,{paymentState:'awaiting_payment',paymentRejection:d.reason,updatedAt:now});tx.update(priv,{audit:[...p.audit,{action:'payment_rejected',uid:r.auth!.uid,at:now,reference:d.reason}]});}
 else {guard(d.bankReference&&o.acceptedQuote&&o.paymentConfig,'Bank reference and accepted quote required');const reference=d.bankReference.toUpperCase().replace(/\s/g,'');const account=o.paymentConfig.paynowIdentifier||o.paymentConfig.qrPath;const registry=db.doc('bankReferences/'+hash([account,reference]));guard(!(await tx.get(registry)).exists,'Bank reference already used');tx.create(registry,{orderId:o.id});tx.update(ref,{paymentState:'paid',paymentRejection:'',updatedAt:now});tx.update(priv,{verification:{ownerUid:r.auth!.uid,verifiedAt:now,bankReference:reference,amountCents:o.acceptedQuote.totalCents,quoteVersion:o.quoteVersion},audit:[...p.audit,{action:'payment_verified',uid:r.auth!.uid,at:now,reference}]});}
 return {ok:true};
}),true);
export const recordRefund=callable(z.object({requestId:z.string().uuid(),orderId:id,reference:z.string().trim().min(1).max(100)}).strict(),async(d,r)=>mutate(r.auth!.uid,'recordRefund',d,async tx=>{
 const {o,ref,p,priv}=await readOrder(tx,d.orderId,r.auth!.uid,true);guard(o.cancelled&&o.refundState==='required','No refund awaiting recording');const now=new Date().toISOString();tx.update(ref,{refundState:'recorded',updatedAt:now});tx.update(priv,{audit:[...p.audit,{action:'refund_recorded',uid:r.auth!.uid,at:now,reference:d.reference}]});return {ok:true};
}),true);
