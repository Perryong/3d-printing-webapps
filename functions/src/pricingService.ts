import {z} from 'zod';
import {calculateQuote,publicQuote,jobSchema,type PricingSettings} from '../../shared/pricing';
import {setupReady,type BusinessConfig,type PublicPaymentConfig} from '../../shared/orders';
import {callable,db,demo,guard} from './core';
export function paymentConfig(b:BusinessConfig):PublicPaymentConfig {return {name:b.name,recipientName:b.recipientName,paynowIdentifier:b.paynowIdentifier,qrPath:b.qrPath,collectionInstructions:b.collectionInstructions,ready:setupReady(b)&&(demo||b.liveEnabled),demo};}
export const previewQuote=callable(z.object({job:jobSchema,fulfilment:z.enum(['collection','delivery'])}).strict(),async d=>{
 const snap=await db.doc('config/business').get();guard(snap.exists,'Owner setup is not ready');
 return publicQuote(calculateQuote({...d.job,source:'preliminary'},snap.get('settings') as PricingSettings,d.fulfilment));
});
export const getPaymentConfig=callable(z.object({}).strict(),async()=>{const s=await db.doc('config/business').get();guard(s.exists,'Owner setup is not ready');return paymentConfig(s.get('businessConfig') as BusinessConfig);});
