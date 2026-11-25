"use client";

import { useRef, type CSSProperties } from "react";
import { ArrowRight, ChevronRight } from "lucide-react";
import FadeContent from "./react-bits/FadeContent";
import GlareHover from "./react-bits/GlareHover";
import { PRODUCT_CATEGORY_META, SUBCATEGORY_ICONS, SUBCATEGORY_IMAGES, cropBackgroundStyle, formatPrice, type Product } from "./store-data";

// The store's product box, unchanged: used by the category rows on the store page and by the product page's related row.
export default function ProductStrip({ title, eyebrow, products, related = false, onViewAll, onOpenProduct }: {
  title: string;
  eyebrow?: string;
  products: Product[];
  related?: boolean;
  onViewAll?: () => void;
  onOpenProduct: (product: Product) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollBy = (direction: 1 | -1) => trackRef.current?.scrollBy({ left: direction * (trackRef.current.clientWidth * 0.8), behavior: "smooth" });
  const heading = <h2>{title}</h2>;
  return <FadeContent className={related ? "cp-strip cp-strip--related" : "cp-strip"} role="region" aria-label={title} stagger={0.12} duration={0.7} blur={4}>
    <div className="cp-strip-head">
      {eyebrow ? <div><p className="cp-strip-eyebrow">{eyebrow}</p>{heading}</div> : heading}
      <div className="cp-strip-head-actions">
        <button className="cp-strip-arrow" aria-label={`Scroll ${title} left`} onClick={() => scrollBy(-1)}><ChevronRight size={14} style={{ transform: "rotate(180deg)" }} /></button>
        <button className="cp-strip-arrow" aria-label={`Scroll ${title} right`} onClick={() => scrollBy(1)}><ChevronRight size={14} /></button>
        {onViewAll && <button className="cp-text-action cp-strip-viewall" onClick={onViewAll}>View all <ArrowRight size={13} /></button>}
      </div>
    </div>
    <div className="cp-strip-track" ref={trackRef}>
      {products.map((product) => {
        const meta = PRODUCT_CATEGORY_META[product.category];
        const Icon = meta.icon;
        return <button key={product.id} className="cp-strip-item" aria-label={`View ${product.name}, ${formatPrice(product.price)}`} onClick={() => onOpenProduct(product)}>
          {SUBCATEGORY_IMAGES[product.subcategory]
            ? <GlareHover width="100%" height="auto" borderRadius="16px" glareColor="#fff6dc" glareOpacity={0.4} transitionDuration={800} rimGlint={false}>
                <span className="cp-strip-art is-photo" role="img" aria-label={`${product.subcategory} (illustrative sample image)`} style={cropBackgroundStyle(SUBCATEGORY_IMAGES[product.subcategory])} />
              </GlareHover>
            : <span className="cp-strip-art is-icon" style={{ "--tile": meta.color } as CSSProperties}><span className="cp-strip-art-badge">{(() => { const TileIcon = SUBCATEGORY_ICONS[product.subcategory] ?? Icon; return <TileIcon size={34} strokeWidth={1.6} />; })()}</span></span>}
          {product.tag && <span className="cp-strip-tag">{product.tag}</span>}
          <span className="cp-strip-name">{product.name}</span>
          <span className="cp-strip-meta"><small>{product.subcategory}</small><b>{formatPrice(product.price)}</b></span>
        </button>;
      })}
    </div>
  </FadeContent>;
}
