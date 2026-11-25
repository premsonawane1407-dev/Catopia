"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, Baby, Check, ChevronDown, Heart, Layers, Minus, Package, Palette, Plus, Truck } from "lucide-react";
import Counter from "./react-bits/Counter";
import FadeContent from "./react-bits/FadeContent";
import Magnet from "./react-bits/Magnet";
import ProductGallery from "./product-gallery";
import ProductStrip from "./product-strip";
import { COLOR_SWATCHES, PRODUCT_CATEGORY_META, SUBCATEGORY_ICONS, formatPrice, type Product, type ProductCategory } from "./store-data";
import { getProductGallery } from "./store-gallery";
import "./product-page.css";

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"];

function sizeOptionsFor(product: Product): string[] {
  if (!product.size) return [];
  const range = product.unit.match(/\b(XS|S|M|L|XL|XXL)\s*[–-]\s*(XS|S|M|L|XL|XXL)\b/);
  if (range) {
    const from = SIZE_ORDER.indexOf(range[1]);
    const to = SIZE_ORDER.indexOf(range[2]);
    if (from >= 0 && to >= from) return SIZE_ORDER.slice(from, to + 1);
  }
  return [product.size];
}

type SectionId = "description" | "details" | "delivery" | "reviews";

export default function ProductPage({ product, recommendations, quantity, inBag, wishlist, addedNotice, onOpenProduct, onClose, onBrowse, onChangeQuantity, onToggleWishlist, onAdd }: {
  product: Product;
  recommendations: Product[];
  quantity: number;
  inBag: number;
  wishlist: string[];
  addedNotice: boolean;
  onOpenProduct: (product: Product) => void;
  onClose: () => void;
  onBrowse: (category: ProductCategory, subcategory?: string) => void;
  onChangeQuantity: (quantity: number) => void;
  onToggleWishlist: (productId: string) => void;
  onAdd: () => void;
}) {
  const meta = PRODUCT_CATEGORY_META[product.category];
  const slides = useMemo(() => getProductGallery(product), [product]);
  const sizes = sizeOptionsFor(product);
  const [size, setSize] = useState(product.size ?? sizes[0] ?? "");
  const [openSection, setOpenSection] = useState<SectionId | null>("description");
  const buyRef = useRef<HTMLDivElement>(null);
  const [barVisible, setBarVisible] = useState(false);
  useEffect(() => {
    const element = buyRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setBarVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const saved = wishlist.includes(product.id);
  const SubIcon = SUBCATEGORY_ICONS[product.subcategory] ?? meta.icon;
  const total = product.price * quantity;

  const glance: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: Package, label: "Format", value: product.unit },
    { icon: SubIcon, label: "Edit", value: product.subcategory },
    ...(product.lifeStage ? [{ icon: Baby, label: "Life stage", value: product.lifeStage }] : []),
    ...(product.material ? [{ icon: Layers, label: "Material", value: product.material }] : []),
    ...(product.color ? [{ icon: Palette, label: "Colour", value: product.color }] : []),
  ].slice(0, 4);

  const detailRows: [string, string][] = [
    ["Collection", meta.label],
    ["Edit", product.subcategory],
    ["Format", product.unit],
    ...(product.lifeStage ? [["Life stage", product.lifeStage] as [string, string]] : []),
    ...(product.material ? [["Material", product.material] as [string, string]] : []),
    ...(product.color ? [["Colour", product.color] as [string, string]] : []),
    ["Item type", "Catopia concept product"],
  ];

  const sections: { id: SectionId; title: string; badge?: string; body: ReactNode }[] = [
    { id: "description", title: "Description", body: <><p>{product.description}</p><p>This is an early Catopia store concept. Final materials, sourcing, care guidance and product photography will be added only when those details are confirmed.</p></> },
    { id: "details", title: "Details", body: <><dl>{detailRows.map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}</dl><p>Dimensions, materials and care information haven’t been provided for this concept item.</p></> },
    { id: "delivery", title: "Delivery & returns", body: <p>Not set up just yet. Shipping areas, delivery estimates, seller details and return terms will appear here once Catopia’s store has verified fulfilment partners and published policies.</p> },
    { id: "reviews", title: "Reviews", badge: "0", body: <p>No reviews yet. Reviews will open when accounts and the moderated review system are connected. We won’t invent ratings or customer stories in the meantime.</p> },
  ];

  return <div className="cp-pdp">
    <div className="cp-pdp-bar">
      <button className="cp-pdp-back" onClick={onClose}><ArrowLeft size={15} /> Back to the Store</button>
      <nav className="cp-pdp-crumbs" aria-label="Breadcrumb">
        <button onClick={onClose}>Store</button><span aria-hidden="true">/</span>
        <button onClick={() => onBrowse(product.category)}>{meta.label}</button><span aria-hidden="true">/</span>
        <button onClick={() => onBrowse(product.category, product.subcategory)}>{product.subcategory}</button><span aria-hidden="true">/</span>
        <b aria-current="page">{product.name}</b>
      </nav>
    </div>

    <div className="cp-pdp-main">
      <ProductGallery product={product} slides={slides} />

      <FadeContent className="cp-pdp-info" trigger="mount" stagger={0.08} duration={0.8} blur={3} role="region" aria-labelledby="cp-pdp-title">
        <div className="cp-pdp-head">
          <p className="cp-pdp-eyebrow">{product.tag && <b>{product.tag === "New" ? "New in" : product.tag}</b>}<span>{meta.label}</span></p>
          <h1 id="cp-pdp-title">{product.name}</h1>
          <p className="cp-pdp-price"><b>{formatPrice(product.price)}</b><span>preview price</span>{!product.inStock && <em>Sold out</em>}</p>
          <p className="cp-pdp-lead">{product.description}</p>
        </div>

        {(product.color || sizes.length > 0) && <div className="cp-pdp-select">
          {product.color && <div className="cp-pdp-field">
            <p className="cp-pdp-label">Colour<b>{product.color}</b></p>
            <div className="cp-swatches"><span className="cp-swatch is-selected" role="img" aria-label={`${product.color}, selected`} style={{ "--swatch": COLOR_SWATCHES[product.color] ?? "#cfcabb" } as CSSProperties} /></div>
          </div>}
          {sizes.length > 0 && <div className="cp-pdp-field">
            <p className="cp-pdp-label">Size<b>{size}</b></p>
            <div className="cp-sizes" role="radiogroup" aria-label="Size">
              {sizes.map((option) => <button key={option} role="radio" aria-checked={option === size} className={option === size ? "cp-size is-selected" : "cp-size"} onClick={() => setSize(option)}>{option}</button>)}
            </div>
            <p className="cp-pdp-hint">Preview only. Your size choice isn’t saved to the bag yet.</p>
          </div>}
        </div>}

        <div className="cp-pdp-buyblock" ref={buyRef}>
          <div className="cp-pdp-buy">
            <div className="cp-pdp-qty" role="group" aria-label="Quantity">
              <button aria-label="Remove one" disabled={quantity <= 1} onClick={() => onChangeQuantity(Math.max(1, quantity - 1))}><Minus size={14} /></button>
              <span aria-live="polite">{quantity}</span>
              <button aria-label="Add one" onClick={() => onChangeQuantity(quantity + 1)}><Plus size={14} /></button>
            </div>
            <Magnet padding={36} magnetStrength={5} maxOffset={7} disabled={!product.inStock} wrapperClassName="cp-pdp-magnet" style={{ display: "block", minWidth: 0 }}>
              <button className="cp-pdp-cta" disabled={!product.inStock} onClick={onAdd}>
                {product.inStock
                  ? <><span>Add to bag</span><i aria-hidden="true">·</i><span className="cp-pdp-cta-price"><Counter value={total} prefix="₹" locale="en-IN" fontSize="inherit" intro={false} duration={0.7} /></span></>
                  : "Sold out"}
              </button>
            </Magnet>
            <button className={saved ? "cp-pdp-heart is-active" : "cp-pdp-heart"} aria-pressed={saved} aria-label={saved ? `Remove ${product.name} from your session wishlist` : `Save ${product.name} to your session wishlist`} onClick={() => onToggleWishlist(product.id)}><Heart size={19} fill={saved ? "currentColor" : "none"} /></button>
          </div>
          {addedNotice && <p className="cp-pdp-added" role="status"><Check size={14} /> Added to your preview bag{product.size ? ` · size ${size}` : ""}. {inBag} {inBag === 1 ? "item" : "items"} saved for this session.</p>}
          <p className="cp-pdp-assurance"><Truck size={15} /><span><b>Thoughtful things, when we’re ready.</b> Delivery and returns aren’t set up yet. Nothing is charged or shipped from this preview.</span></p>
        </div>

        <ul className="cp-pdp-glance">{glance.map((item) => <li key={item.label}><span className="cp-pdp-glance-icon"><item.icon size={17} strokeWidth={1.4} /></span><span><small>{item.label}</small><b>{item.value}</b></span></li>)}</ul>

        <div className="cp-pdp-acc">
          {sections.map((section) => {
            const open = openSection === section.id;
            return <section key={section.id} className={open ? "cp-acc is-open" : "cp-acc"}>
              <h2><button id={`cp-acc-btn-${section.id}`} aria-expanded={open} aria-controls={`cp-acc-panel-${section.id}`} onClick={() => setOpenSection(open ? null : section.id)}><span>{section.title}{section.badge && <small>{section.badge}</small>}</span><ChevronDown size={16} /></button></h2>
              <div id={`cp-acc-panel-${section.id}`} role="region" aria-labelledby={`cp-acc-btn-${section.id}`} aria-hidden={!open} className="cp-acc-panel"><div className="cp-acc-body">{section.body}</div></div>
            </section>;
          })}
        </div>

        <p className="cp-pdp-note">Sample catalogue item · illustrative price · no real stock or supplier attached</p>
      </FadeContent>
    </div>

    {recommendations.length > 0 && <ProductStrip related title="You may also love" eyebrow="A few nearby ideas" products={recommendations} onOpenProduct={onOpenProduct} />}

    <div className={barVisible ? "cp-pdp-mobilebuy is-visible" : "cp-pdp-mobilebuy"} aria-hidden={!barVisible}><span><small>Preview price</small><b>{formatPrice(product.price)}</b></span><button tabIndex={barVisible ? 0 : -1} disabled={!product.inStock} onClick={onAdd}>{!product.inStock ? "Sold out" : addedNotice ? "Added" : "Add to bag"}</button></div>
  </div>;
}
