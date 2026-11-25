"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight, FileText, Maximize2, X, ZoomIn, ZoomOut } from "lucide-react";
import { PRODUCTS, PRODUCT_CATEGORY_META, SUBCATEGORY_ICONS, formatPrice, type Product } from "./store-data";
import type { GallerySlide } from "./store-gallery";
import "./product-gallery.css";

const SWIPE_DISTANCE = 44;

function ConceptPlate({ product }: { product: Product }) {
  const meta = PRODUCT_CATEGORY_META[product.category];
  const Icon = SUBCATEGORY_ICONS[product.subcategory] ?? meta.icon;
  const number = String(PRODUCTS.findIndex((item) => item.id === product.id) + 1).padStart(2, "0");
  return <div className="cp-plate" style={{ "--tone": meta.color } as CSSProperties}>
    <span className="cp-plate-top"><span>Catopia · Object study</span><span>No. {number}</span></span>
    <span className="cp-plate-rings" aria-hidden="true" />
    <span className="cp-plate-disc"><Icon size="44%" strokeWidth={1.1} /></span>
    <span className="cp-plate-caption"><b>{product.subcategory}</b><span>{meta.label} · {product.unit}</span></span>
    <span className="cp-plate-foot">Concept artwork · product photography to come</span>
  </div>;
}

function DetailsPlate({ product }: { product: Product }) {
  const meta = PRODUCT_CATEGORY_META[product.category];
  const rows: [string, string][] = [
    ["Collection", meta.label],
    ["Edit", product.subcategory],
    ["Format", product.unit],
    ...(product.lifeStage ? [["Life stage", product.lifeStage] as [string, string]] : []),
    ...(product.material ? [["Material", product.material] as [string, string]] : []),
    ...(product.color ? [["Colour", product.color] as [string, string]] : []),
    ...(product.size ? [["Size", product.size] as [string, string]] : []),
    ["Availability", product.inStock ? "Available in preview" : "Sold out in preview"],
  ];
  return <div className="cp-plate cp-plate-details" style={{ "--tone": meta.color } as CSSProperties}>
    <span className="cp-plate-top"><span>The details</span><span>{formatPrice(product.price)}</span></span>
    <h3>{product.name}</h3>
    <dl>{rows.map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}</dl>
    <span className="cp-plate-foot">Illustrative price · concept catalogue item</span>
  </div>;
}

function SlideArt({ slide, product, priority }: { slide: GallerySlide; product: Product; priority: boolean }) {
  if (slide.kind === "photo") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="cp-slide-photo" src={slide.src} alt={slide.alt} width={800} height={1000} draggable={false} loading={priority ? "eager" : "lazy"} decoding="async" />;
  }
  return slide.kind === "plate" ? <ConceptPlate product={product} /> : <DetailsPlate product={product} />;
}

function SlideThumb({ slide, product }: { slide: GallerySlide; product: Product }) {
  const meta = PRODUCT_CATEGORY_META[product.category];
  if (slide.kind === "photo") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={slide.thumb} alt="" width={120} height={150} draggable={false} loading="lazy" decoding="async" />;
  }
  if (slide.kind === "plate") {
    const Icon = SUBCATEGORY_ICONS[product.subcategory] ?? meta.icon;
    return <span className="cp-thumb-plate" style={{ "--tone": meta.color } as CSSProperties}><Icon size={22} strokeWidth={1.3} /></span>;
  }
  return <span className="cp-thumb-details"><FileText size={20} strokeWidth={1.3} /></span>;
}

function Lightbox({ product, slides, index, onIndex, onClose }: {
  product: Product;
  slides: GallerySlide[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const [zoomed, setZoomed] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const count = slides.length;
  const slide = slides[index];
  const go = useCallback((next: number) => { setZoomed(false); onIndex(((next % count) + count) % count); }, [count, onIndex]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus?.(); };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      else if (event.key === "ArrowRight") go(index + 1);
      else if (event.key === "ArrowLeft") go(index - 1);
      else if (event.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])");
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [go, index, onClose]);

  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!zoomed || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    frameRef.current?.style.setProperty("--zx", `${((event.clientX - rect.left) / rect.width) * 100}%`);
    frameRef.current?.style.setProperty("--zy", `${((event.clientY - rect.top) / rect.height) * 100}%`);
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => { if (event.pointerType !== "mouse") swipe.current = { x: event.clientX, y: event.clientY }; };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start || zoomed) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.4) go(index + (dx < 0 ? 1 : -1));
  };

  return <div className="cp-lightbox" ref={dialogRef} role="dialog" aria-modal="true" aria-label={`${product.name} images`} onClick={onClose}>
    <div className="cp-lightbox-top" onClick={(event) => event.stopPropagation()}>
      <span className="cp-lightbox-count" aria-live="polite">{String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}</span>
      <p className="cp-lightbox-title">{product.name}</p>
      <button ref={closeRef} className="cp-lightbox-close" onClick={onClose} aria-label="Close images"><X size={20} /></button>
    </div>
    <div className="cp-lightbox-stage">
      {count > 1 && <button className="cp-lightbox-arrow is-prev" aria-label="Previous image" onClick={(event) => { event.stopPropagation(); go(index - 1); }}><ChevronLeft size={22} /></button>}
      <div
        ref={frameRef}
        key={slide.id}
        className={zoomed ? `cp-lightbox-frame is-${slide.kind} is-zoomed` : `cp-lightbox-frame is-${slide.kind}`}
        style={{ touchAction: "pan-y" }}
        onClick={(event) => { event.stopPropagation(); if (slide.kind === "photo") setZoomed((value) => !value); }}
        onPointerMove={onMove}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { swipe.current = null; }}
      >
        <SlideArt slide={slide} product={product} priority />
        {slide.kind === "photo" && <span className="cp-lightbox-zoomhint" aria-hidden="true">{zoomed ? <ZoomOut size={15} /> : <ZoomIn size={15} />}{zoomed ? "Click to zoom out" : "Click to zoom in"}</span>}
      </div>
      {count > 1 && <button className="cp-lightbox-arrow is-next" aria-label="Next image" onClick={(event) => { event.stopPropagation(); go(index + 1); }}><ChevronRight size={22} /></button>}
    </div>
    {count > 1 && <div className="cp-lightbox-thumbs" onClick={(event) => event.stopPropagation()} role="group" aria-label="Choose an image">
      {slides.map((item, itemIndex) => <button key={item.id} className={itemIndex === index ? "cp-lightbox-thumb is-active" : "cp-lightbox-thumb"} aria-label={`Show image ${itemIndex + 1} of ${count}`} aria-current={itemIndex === index} onClick={() => go(itemIndex)}><SlideThumb slide={item} product={product} /></button>)}
    </div>}
  </div>;
}

export default function ProductGallery({ product, slides }: { product: Product; slides: GallerySlide[] }) {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const count = slides.length;
  const active = slides[index];
  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  useEffect(() => {
    for (const offset of [1, -1]) {
      const neighbour = slides[(index + offset + count) % count];
      if (neighbour.kind === "photo") { const image = new Image(); image.src = neighbour.src; }
    }
  }, [index, slides, count]);

  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || active.kind !== "photo") return;
    const rect = event.currentTarget.getBoundingClientRect();
    stageRef.current?.style.setProperty("--zx", `${((event.clientX - rect.left) / rect.width) * 100}%`);
    stageRef.current?.style.setProperty("--zy", `${((event.clientY - rect.top) / rect.height) * 100}%`);
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => { if (event.pointerType !== "mouse") swipe.current = { x: event.clientX, y: event.clientY }; };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.4) go(index + (dx < 0 ? 1 : -1));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (count < 2) return;
    if (event.key === "ArrowRight") go(index + 1);
    else if (event.key === "ArrowLeft") go(index - 1);
    else if (event.key === "Home") go(0);
    else if (event.key === "End") go(count - 1);
  };

  return <>
    <div className="cp-gallery" role="group" aria-roledescription="carousel" aria-label={`${product.name} images`} onKeyDown={onKeyDown}>
      {count > 1 && <div className="cp-gallery-rail">
        <div className="cp-gallery-rail-list" role="group" aria-label="Choose an image" style={{ "--n": count } as CSSProperties}>
          {slides.map((slide, slideIndex) => <button key={slide.id} className={slideIndex === index ? "cp-gallery-thumb is-active" : "cp-gallery-thumb"} aria-label={`Show image ${slideIndex + 1} of ${count}`} aria-current={slideIndex === index} onClick={() => go(slideIndex)}><SlideThumb slide={slide} product={product} /></button>)}
        </div>
      </div>}
      <div className="cp-gallery-main">
        <div
          ref={stageRef}
          className={`cp-gallery-stage is-${active.kind}`}
          style={{ touchAction: "pan-y" }}
          onClick={() => setLightbox(true)}
          onPointerMove={onMove}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => { swipe.current = null; }}
        >
          {slides.map((slide, slideIndex) => <div key={slide.id} className={slideIndex === index ? "cp-slide is-active" : "cp-slide"} role="group" aria-roledescription="slide" aria-label={`${slideIndex + 1} of ${count}`} aria-hidden={slideIndex !== index}>
            <SlideArt slide={slide} product={product} priority={slideIndex === 0} />
          </div>)}
          <span className="cp-gallery-count" aria-hidden="true">{String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}</span>
          {active.kind === "photo" && active.sample && <span className="cp-gallery-sample">Illustrative sample</span>}
          <button className="cp-gallery-zoom" aria-label="Open larger view" onClick={(event) => { event.stopPropagation(); setLightbox(true); }}><Maximize2 size={16} /></button>
          {count > 1 && <>
            <button className="cp-gallery-arrow is-prev" aria-label="Previous image" onClick={(event) => { event.stopPropagation(); go(index - 1); }}><ChevronLeft size={20} /></button>
            <button className="cp-gallery-arrow is-next" aria-label="Next image" onClick={(event) => { event.stopPropagation(); go(index + 1); }}><ChevronRight size={20} /></button>
          </>}
        </div>
        {count > 1 && <div className="cp-gallery-dots" role="group" aria-label="Choose an image">
          {slides.map((slide, slideIndex) => <button key={slide.id} className={slideIndex === index ? "cp-gallery-dot is-active" : "cp-gallery-dot"} aria-label={`Show image ${slideIndex + 1} of ${count}`} aria-current={slideIndex === index} onClick={() => go(slideIndex)} />)}
        </div>}
      </div>
    </div>
    {lightbox && <Lightbox product={product} slides={slides} index={index} onIndex={setIndex} onClose={() => setLightbox(false)} />}
  </>;
}
