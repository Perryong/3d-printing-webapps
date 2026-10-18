import { useState } from 'react';
import PaymentReceipt from '../components/checkout/PaymentReceipt';
import type { Order } from '../../shared/orders';

// In-memory fixture only: this preview never reads or writes checkout data.
const demo = {
  id: 'DEMO-RECEIPT-001', quantity: 1, material: 'PLA', fulfilment: 'delivery',
  fulfilmentState: 'not_started', paymentState: 'paid', cancelled: false, refundState: 'none',
  acceptedQuote: { printCents: 1000, fulfilmentCents: 500, totalCents: 1500 },
  paymentConfig: { name: 'Ong Wen Qing', collectionInstructions: 'Collection by appointment in Woodlands South, after 6:30 pm.' },
} as Order;
export default function ReceiptDemo() {
  const [replay, setReplay] = useState(0);
  const [collection, setCollection] = useState(false);
  return <main className="min-h-screen bg-slate-100 px-4 py-8">
    <div className="mx-auto max-w-sm">
      <p className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><strong>DEMO ONLY — NOT A REAL PAYMENT</strong><br />Fictional order DEMO-RECEIPT-001. No money was received. This preview does not read or write customer orders.</p>
      <div className="flex justify-between gap-3 text-sm">
        <button className="rounded-lg border bg-white px-3 py-2" onClick={() => setReplay(replay + 1)}>Replay animation</button>
        <label className="flex items-center gap-2"><input type="checkbox" checked={collection} onChange={e => setCollection(e.target.checked)} />Self-collection</label>
      </div>
      <PaymentReceipt key={`${replay}-${collection}`} order={{...demo, fulfilment: collection ? 'collection' : 'delivery', acceptedQuote:{...demo.acceptedQuote!,fulfilmentCents:collection ? 0 : 500,totalCents:collection ? 1000 : 1500}}} />
    </div>
  </main>;
}
