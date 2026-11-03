
import STLViewer from "../components/STLViewer";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";

const Index = () => {
  const [params] = useSearchParams();
  const productId = params.get("product");
  const collectionUrl = productId ? `/singapore-gallery#${encodeURIComponent(productId)}` : "/singapore-gallery";
  const model = useQuery({
    queryKey: ["gallery-stl", productId],
    enabled: !!productId,
    staleTime: Infinity,
    retry: false,
    queryFn: async ({ signal }) => {
      const catalog = await fetch("/singapore-products/catalog.json", { signal });
      if (!catalog.ok) throw new Error("The collection could not be loaded.");
      const products: { id: string; stl?: string }[] = await catalog.json();
      const path = products.find(product => product.id === productId)?.stl;
      if (!path) throw new Error("This product has no available STL.");
      const response = await fetch(path, { signal });
      if (!response.ok) throw new Error("The product STL could not be loaded.");
      return new File([await response.blob()], path.split("/").pop()!);
    },
  });

  if (productId && !model.data) return (
    <main className="grid min-h-dvh place-content-center gap-4 text-center">
      {model.isError ? <>
        <p role="alert">{model.error.message}</p>
        <button onClick={() => model.refetch()}>Try again</button>
      </> : <p role="status">Opening the STL in the print workspace…</p>}
      <Link to={collectionUrl} className="underline">Back to collection</Link>
    </main>
  );

  return (
    <STLViewer key={productId} initialFile={model.data} collectionLink={
      <Link to={collectionUrl} className="rounded-lg border border-emerald-200 bg-emerald-950 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-900">
        {productId ? "Back to collection" : "Singapore collection ↗"}
      </Link>
    } />
  );
};

export default Index;
