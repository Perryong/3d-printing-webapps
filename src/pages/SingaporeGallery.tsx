import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowLeft, ArrowUpRight, Box, Download } from "lucide-react";
import "./SingaporeGallery.css";

interface Product {
  id: string;
  title: string;
  dimensions: string;
  status: "Printable prototype" | "Concept only";
  description: string;
  viewer: string;
  preview: string;
  blend: string;
  stl?: string;
  updated: boolean;
  printNote: string;
}

export default function SingaporeGallery() {
  const [products, setProducts] = useState<Product[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/singapore-products/catalog.json", { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error("Catalog unavailable");
        return response.json();
      })
      .then(setProducts)
      .catch(error => { if (error.name !== "AbortError") setFailed(true); });
    return () => controller.abort();
  }, []);

  return (
    <div className="sg-gallery">
      <header className="sg-nav">
        <Link to="/" className="sg-brand"><span className="sg-mark">SG</span><span>Singapore<br /><strong>Little Objects</strong></span></Link>
        <Link to="/" className="sg-workspace"><ArrowLeft size={16} /> Print workspace</Link>
      </header>
      <main className="sg-main">
        <section className="sg-intro" aria-labelledby="gallery-title">
          <div>
            <p className="sg-eyebrow">A collection of everyday Singapore</p>
            <h1 id="gallery-title">Small objects.<br /><em>Very Singapore.</em></h1>
            <p className="sg-lead">Kueh, kopitiams and familiar neighbourhood icons. Little pieces of home, reimagined for your desk — and your keyring.</p>
            <a href="#collection" className="sg-explore">Explore in 3D <ArrowDown size={17} /></a>
          </div>
          <aside className="sg-edition" aria-label="Collection details">
            <Box size={34} strokeWidth={1.2} />
            <span className="sg-edition-number">{products.length ? String(products.length).padStart(2, "0") : "—"}</span>
            <p>local ideas.<br />a new dimension.</p>
            <div><span>Printable desk objects &amp; souvenirs</span></div>
          </aside>
        </section>

        <div className="sg-update"><span>Freshly reworked</span><p>{products.filter(p => p.updated).map(p => p.title).join(" · ")}</p></div>

        <section id="collection" aria-labelledby="collection-title">
          <div className="sg-section-heading"><h2 id="collection-title">The collection</h2><p>Drag to rotate · scroll to zoom · download to make</p></div>
          {failed ? <p role="alert">The collection could not load. <button onClick={() => window.location.reload()}>Reload the page</button></p> : products.length === 0 ? <p role="status">Loading the collection…</p> : null}
          <div className="sg-grid">
            {products.map((product, index) => (
              <article className="sg-product" key={product.id}>
                <div className="sg-product-top"><span className="sg-index">{String(index + 1).padStart(2, "0")}</span><span className={product.updated ? "sg-badge sg-new" : "sg-badge"}>{product.updated ? "New design" : product.status === "Concept only" ? "Concept" : "Prototype"}</span></div>
                <iframe className="sg-viewer" src={product.viewer} title={`Interactive 3D view of ${product.title}`} loading="lazy" sandbox="allow-scripts" />
                <div className="sg-product-body">
                  <p className="sg-dimensions">{product.dimensions}</p>
                  <h3>{product.title}</h3>
                  <p className="sg-description">{product.description}</p>
                  {product.id === "wafer-coin-collector" && (
                    <div className="sg-coin-fit">
                      <table>
                        <caption>Singapore Third Series coin fit (mm)</caption>
                        <thead><tr><th scope="col">Coin</th><th scope="col">Diameter</th><th scope="col">Thickness</th><th scope="col">Well diameter</th></tr></thead>
                        <tbody>
                          {[
                            ["$1", "24.65", "2.50", "25.45"],
                            ["50¢", "23.00", "2.45", "23.80"],
                            ["20¢", "21.00", "1.72", "21.80"],
                            ["10¢", "18.50", "1.38", "19.30"],
                          ].map(([coin, diameter, thickness, well]) => (
                            <tr key={coin}><th scope="row">{coin}</th><td>{diameter}</td><td>{thickness}</td><td>{well}</td></tr>
                          ))}
                        </tbody>
                      </table>
                      <a href="https://www.mas.gov.sg/currency/circulation-currency/circulation-currency-coins">MAS coin specifications · 2013 series</a>
                    </div>
                  )}
                  <p className="sg-print-note">{product.printNote}</p>
                  <div className="sg-downloads">
                    {product.stl ? <a href={product.stl} download className="sg-stl" aria-label={`Download ${product.title} STL file`}><Download size={15} /> STL file</a> : <span className="sg-concept-note">Visual concept · no print file</span>}
                    <a href={product.blend} download aria-label={`Download ${product.title} Blender file`}>Blender <ArrowDown size={13} /></a>
                    <a href={product.preview} target="_blank" rel="noreferrer" aria-label={`View rendered image of ${product.title}`}><ArrowUpRight size={16} /><span className="sr-only">Rendered image</span></a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="sg-making" aria-labelledby="making-title">
          <div><p className="sg-eyebrow">From screen to desk</p><h2 id="making-title">Made to start simple.</h2></div>
          <div><h3>For your Bambu Lab A1 Combo</h3><p>Import the STL at 100% scale in millimetres. Start with PLA, a 0.4 mm nozzle and 0.2 mm layers, then inspect the sliced preview. The Blender files preserve the colour illustrations; STL files contain geometry only.</p><p>These are adult desk objects and souvenir prototypes. Meshes have been checked, but physical prints, keyring strength and fit still need testing. Colour changes are suggestions, not a preconfigured AMS print job.</p></div>
        </section>
      </main>
      <footer className="sg-footer"><span>Designed around the things we recognise.</span><Link to="/">Open print workspace <ArrowUpRight size={15} /></Link></footer>
    </div>
  );
}
