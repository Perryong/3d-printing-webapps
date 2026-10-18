import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calculateQuote, publicQuote, DEFAULT_PRICING_SETTINGS} from '../shared/pricing';
const settings = {...DEFAULT_PRICING_SETTINGS, filamentPerKg:20, averageWatts:0, printerCost:0, maintenancePerHour:0, handlingMinutes:0, packagingCost:0, reserveRate:0};
const job = {source:'bambu-studio-confirmed' as const, hours:1, grams:600, quantity:2, scope:'batch' as const};
test('margin, minimum and delivery are per order; courier is an expense',()=>{
 assert.equal(calculateQuote(job,settings,'collection').totalCents,2000);
 const q=calculateQuote(job,settings,'delivery');
 assert.equal(q.totalCents,2500); assert.equal(q.profitCents,800);
 assert.equal(calculateQuote(job,{...settings,courierCost:7},'delivery').profitCents,600);
 assert.equal(calculateQuote({...job,grams:1},settings,'collection').totalCents,1000);
});
test('quantity scope and measured energy replace rather than duplicate totals',()=>{
 const per={...job,source:'preliminary' as const,scope:'per-item' as const};
 assert.equal(calculateQuote(per,settings,'collection').totalCents,4000);
 const q=calculateQuote({...job,measuredKwh:2},{...settings,averageWatts:150,tariffPerKwh:.3},'collection');
 assert.equal(q.lines.energyCents,60);
 assert.throws(()=>calculateQuote({...job,scope:'per-item'},settings,'collection'));
});
test('round half cents, reconcile lines and keep costs private',()=>{
 const q=calculateQuote({...job,grams:1},{...settings,filamentPerKg:5},'collection');
 assert.equal(q.lines.materialCents,1);
 assert.equal(Object.values(q.lines).reduce((a:number,b:number)=>a+b,0)+q.roundingAdjustmentCents,q.costCents);
 assert.deepEqual(Object.keys(publicQuote(q)).sort(),['currency','fulfilment','fulfilmentCents','printCents','quantity','requiresConfirmation','source','totalCents','warnings'].sort());
 assert.ok(calculateQuote(job,settings,'collection','2027-01-01').warnings.length);
});
test('invalid financial and job inputs rejected',()=>{
 for(const value of [NaN,-1,Infinity]) assert.throws(()=>calculateQuote(job,{...settings,filamentPerKg:value},'collection'));
 for(const value of [1,2]) assert.throws(()=>calculateQuote(job,{...settings,marginRate:value},'collection'));
 assert.throws(()=>calculateQuote({...job,hours:0},settings,'collection'));
 assert.throws(()=>calculateQuote({...job,quantity:0},settings,'collection'));
});
