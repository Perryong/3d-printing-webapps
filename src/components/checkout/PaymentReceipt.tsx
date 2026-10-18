import React from "react";

import type { Order } from '../../../shared/orders';
import { CheckCircle2, Printer } from 'lucide-react';

const money = (cents: number) => `S$${(cents / 100).toFixed(2)}`;
const progress: Record<Order['fulfilmentState'], string> = {
  not_started: 'Awaiting printing', printing: 'Your model is being printed',
  ready: 'Ready for collection or dispatch', collected: 'Collected',
  dispatched: 'Dispatched', completed: 'Fulfilment completed',
};

export default function PaymentReceipt({ order }: { order: Order }) {
  if (order.cancelled || order.paymentState !== 'paid' || order.refundState !== 'none' || !order.acceptedQuote) return null;
  const quote = order.acceptedQuote;
  return (
    <section aria-label="Verified payment receipt" className="mx-auto w-full max-w-sm py-4">
      <div className="relative rounded-3xl border border-slate-700 bg-slate-800 p-5 pb-9 text-white shadow-xl">
        <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-widest text-slate-300"><span>3D Print Services</span><Printer size={20} aria-hidden="true" /></div>
        <div className="rounded-xl bg-slate-950 p-4">
          <div role="status" className="flex items-center gap-2 font-semibold text-emerald-300"><CheckCircle2 size={22} aria-hidden="true" />Payment verified</div>
          <p className="mt-2 text-sm text-slate-300">Thank you! Your payment has been checked by the owner.</p>
        </div>
        <div aria-hidden="true" className="absolute bottom-4 left-6 right-6 h-2 rounded-full bg-black shadow-inner" />
      </div>
      <div className="relative -mt-5 overflow-hidden px-5 pb-4">
        <article className="payment-receipt-paper relative bg-white px-5 py-7 font-mono text-sm text-slate-800 shadow-lg">
          <h4 className="text-center font-bold uppercase tracking-widest">Payment receipt</h4>
          <p className="mt-1 text-center text-xs">{order.paymentConfig?.name || '3D Print Services'}</p>
          <p className="my-4 break-all border-y border-dashed border-slate-300 py-3 text-xs">Order {order.id}</p>
          <dl className="space-y-3">
            <div className="flex justify-between gap-3"><dt>{order.quantity} × {order.material} printing</dt><dd>{money(quote.printCents)}</dd></div>
            <div className="flex justify-between gap-3"><dt>{order.fulfilment === 'delivery' ? 'Delivery' : 'Self-collection'}</dt><dd>{money(quote.fulfilmentCents)}</dd></div>
            <div className="flex justify-between gap-3 border-t border-dashed border-slate-300 pt-3 text-lg font-bold"><dt>Total paid</dt><dd>{money(quote.totalCents)}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-slate-500">PayNow · manually verified</p>
          <div className="mt-5 border-t border-dashed border-slate-300 pt-4">
            <p className="font-semibold">{progress[order.fulfilmentState]}</p>
            {order.fulfilment === 'collection' ? <p className="mt-2 text-xs leading-relaxed">{order.paymentConfig?.collectionInstructions}</p> : <p className="mt-2 text-xs leading-relaxed">Delivery selected. Follow this order for production and dispatch updates.</p>}
          </div>
          <p className="mt-5 text-center text-xs text-slate-500">Keep your order reference for enquiries.</p>
        </article>
      </div>
    </section>
  );
}
