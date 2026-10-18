import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canAdvance,canConfirm,requireVersion,boundsSchema,setupReady,type Order} from '../shared/orders';
const o={cancelled:false,quoteVersion:2,paymentState:'awaiting_payment',fulfilmentState:'not_started',fulfilment:'collection'} as Order;
test('versions, payment and fulfilment guards',()=>{assert.throws(()=>requireVersion(o,1));assert.equal(canAdvance(o,'printing'),false);assert.equal(canAdvance({...o,paymentState:'paid'},'printing'),true);assert.equal(canAdvance({...o,paymentState:'paid',fulfilmentState:'ready'},'dispatched'),false);assert.equal(canConfirm({...o,paymentState:'verification_pending'}),false);});
test('A1 build limits and missing business setup blocked',()=>{assert.throws(()=>boundsSchema.parse({x:257,y:100,z:10}));assert.equal(setupReady({name:'Demo',recipientName:'Demo',paynowIdentifier:'',qrPath:'',recipientConfirmed:false,collectionInstructions:'Later',taxStatus:'unknown',liveEnabled:false}),false);});
