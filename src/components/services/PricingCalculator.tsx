import PricingDisplay from '../PricingDisplay';
export default function PricingCalculator({modelVolume=0,modelWeight=0,printTime=0}:{modelVolume?:number;modelWeight?:number;printTime?:number}) {
 return <PricingDisplay modelVolume={modelVolume} modelWeight={modelWeight} printTime={printTime}/>;
}
