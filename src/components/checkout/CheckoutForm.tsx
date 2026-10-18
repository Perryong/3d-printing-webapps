import {useState} from 'react';
import type {QuoteRequest} from '../../../shared/orders';
export type CheckoutDetails=Pick<QuoteRequest,'contact'|'deliveryAddress'>;
export default function CheckoutForm({delivery,busy,onSubmit}:{delivery:boolean;busy:boolean;onSubmit:(d:CheckoutDetails)=>void}){
 const [name,setName]=useState(''),[email,setEmail]=useState(''),[phone,setPhone]=useState(''),[line,setLine]=useState(''),[postal,setPostal]=useState('');
 return <form onSubmit={e=>{e.preventDefault();onSubmit({contact:{name,email,phone},...(delivery?{deliveryAddress:{line,postal}}:{})});}} className="checkout-form">
 <label>Name<input required maxLength={300} value={name} onChange={e=>setName(e.target.value)}/></label>
 <label>Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
 <label>Phone<input required pattern="\+?[0-9 ()-]{8,20}" value={phone} onChange={e=>setPhone(e.target.value)}/></label>
 {delivery&&<><label>Delivery address<input required value={line} onChange={e=>setLine(e.target.value)}/></label><label>Singapore postal code<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={postal} onChange={e=>setPostal(e.target.value)}/></label></>}
 <p className="text-xs text-slate-500">Submitting uploads this STL for owner review. You will review a confirmed quote before paying.</p>
 <button disabled={busy} type="submit">{busy?'Saving…':'Request confirmed quote'}</button>
 </form>;
}
