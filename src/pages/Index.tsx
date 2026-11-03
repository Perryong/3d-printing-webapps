
import STLViewer from "../components/STLViewer";
import { Link } from "react-router-dom";

const Index = () => {
  return <>
    <Link to="/singapore-gallery" className="fixed bottom-5 right-5 z-50 rounded-full border border-emerald-200 bg-emerald-950 px-5 py-3 text-sm font-medium text-white shadow-lg hover:bg-emerald-900">Singapore collection ↗</Link>
    <STLViewer />
  </>;
};

export default Index;
