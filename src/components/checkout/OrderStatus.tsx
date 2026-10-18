import {useEffect,useRef,useState} from 'react';
import type {Order} from '../../../shared/orders';
import {callCheckout,watchOrder,sgd} from '../../services/checkoutService';
import PaymentInstructions from './PaymentInstructions';
export default function OrderStatus({orderId}:{orderId:string}){
 const [order,setOrder]=useState<Order>(),[error,setError]=useState(''),[busy,setBusy]=useState(false),[reference,setReference]=useState('');const attempt=useRef<{key:string;id:string}>();
 useEffect(()=>watchOrder(orderId,setOrder,e=>setError(e.message)),[orderId]);
 async function act(name:string,extra:object={}){if(!order)return;const payload={orderId,...(['acceptQuote','claimPayment'].includes(name)?{expectedQuoteVersion:order.quoteVersion}:{}),...extra},key=JSON.stringify([name,payload]);if(attempt.current?.key!==key)attempt.current={key,id:crypto.randomUUID()};setBusy(true);setError('');try{await callCheckout(name,{...payload,requestId:attempt.current.id});attempt.current=undefined;}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 if(!order)return <p>{error||'Loading order…'}</p>;
 return <article className="space-y-3 border-t pt-4"><h3 className="font-semibold break-all">Order {order.id}</h3><p>{order.quantity} × PLA · {order.fulfilment==='delivery'?'Delivery (+S$5)':'Free self-collection'}</p><p>Print: {sgd(order.quote.printCents)} · Fulfilment: {sgd(order.quote.fulfilmentCents)} · <strong>Total {sgd(order.quote.totalCents)}</strong></p>
 <p role="status">{order.cancelled?`Cancelled · refund ${order.refundState}`:order.paymentState==='verification_pending'?'Awaiting verification':order.paymentState==='paid'?`Paid · ${order.fulfilmentState}`:order.quoteState==='requested'?'Awaiting owner slicing and quote confirmation':order.quoteState==='confirmed'?'Confirmed quote — review before accepting':'Awaiting payment'}</p>
 {error&&<p role="alert" className="text-red-700">{error}</p>}
 {!order.cancelled&&order.quoteState==='confirmed'&&<button disabled={busy} onClick={()=>act('acceptQuote')}>Accept quote {sgd(order.quote.totalCents)}</button>}
 {!order.cancelled&&order.quoteState==='accepted'&&['awaiting_payment','verification_pending'].includes(order.paymentState)&&<PaymentInstructions order={order}/>}
 {!order.cancelled&&order.paymentState==='awaiting_payment'&&<><p className="text-amber-800">{order.paymentRejection}</p><label>Transfer reference (optional)<input value={reference} onChange={e=>setReference(e.target.value)} maxLength={100}/></label><button disabled={busy} onClick={()=>act('claimPayment',{transferReference:reference})}>I've paid — request verification</button></>}
 {!order.cancelled&&order.fulfilmentState==='not_started'&&order.paymentState!=='verification_pending'&&<button className="secondary" disabled={busy} onClick={()=>act('cancelOrder',{reason:'Customer requested cancellation'})}>Cancel order{order.paymentState==='paid'?' and request refund':''}</button>}
 </article>;
}
