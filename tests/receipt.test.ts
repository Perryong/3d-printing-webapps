import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server.browser';
import PaymentReceipt from '../src/components/checkout/PaymentReceipt';
import type { Order } from '../shared/orders';
const order = { id:'TEST-RECEIPT', quantity:1, material:'PLA', fulfilment:'delivery', fulfilmentState:'not_started', paymentState:'paid', cancelled:false, refundState:'none', acceptedQuote:{printCents:1000,fulfilmentCents:500,totalCents:1500}, paymentConfig:{name:'Demo shop'} } as Order;
const render = (o:Order) => renderToStaticMarkup(createElement(PaymentReceipt,{order:o}));
test('receipt requires verified payment and accepted quote, excluding cancelled or refunded orders',()=>{
 for (const paymentState of ['not_requested','awaiting_payment','verification_pending'] as const) assert.equal(render({...order,paymentState}), '');
 assert.equal(render({...order,cancelled:true}), '');
 assert.equal(render({...order,refundState:'required'}), '');
 assert.equal(render({...order,acceptedQuote:undefined}), '');
 assert.match(render(order), /Payment verified/);
});
test('receipt shows accepted total, delivery cost and production status, not order completion',()=>{
 const html=render(order);
 for(const text of ['TEST-RECEIPT','15.00','5.00','Awaiting printing']) assert.ok(html.includes(text));
 assert.ok(!html.includes('Order complete'));
 assert.match(render({...order,fulfilment:'collection',paymentConfig:{...order.paymentConfig!,collectionInstructions:'Woodlands after 6:30 pm'}}),/Woodlands after 6:30 pm/);
});
