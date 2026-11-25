"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ArrowRight } from "lucide-react";
import Noise from "./react-bits/Noise";
import type { ProductCategory } from "./store-data";
import "./store-hero.css";

type HeroAction = { kind: "catalogue" } | { kind: "category"; category: ProductCategory };

type HeroSlide = {
  id: string;
  eyebrow: string;
  heading: string;
  description: string;
  cta: string;
  action: HeroAction;
  image: string;
  alt: string;
  desktopPosition: string;
  mobilePosition: string;
};

const SLIDES: HeroSlide[] = [
  {
    id: "everyday",
    eyebrow: "A little joy for every paw",
    heading: "Good things for little paws.",
    description: "Thoughtful finds for every nap, meal and playful moment.",
    cta: "Explore the Store",
    action: { kind: "catalogue" },
    image: "/images/store/hero-everyday.webp",
    alt: "A ginger tabby cat sitting calmly in soft golden light",
    desktopPosition: "50% 38%",
    mobilePosition: "56% 22%",
  },
  {
    id: "play",
    eyebrow: "Made for curious little minds",
    heading: "Let curiosity lead.",
    description: "Little discoveries for their biggest adventures.",
    cta: "Discover Toys & Play",
    action: { kind: "category", category: "toys-play" },
    image: "/images/store/hero-play.webp",
    alt: "A fluffy cream cat leaping to catch a feather wand in a sunny living room",
    desktopPosition: "50% 42%",
    mobilePosition: "66% 40%",
  },
  {
    id: "comfort",
    eyebrow: "A little more comfort",
    heading: "Their favourite place to be.",
    description: "Cosy corners and everyday comforts made for them.",
    cta: "Explore Comfort",
    action: { kind: "category", category: "furniture-comfort" },
    image: "/images/store/hero-comfort.webp",
    alt: "A fluffy cream and grey cat resting on soft white bedding in a warm bedroom",
    desktopPosition: "50% 26%",
    mobilePosition: "50% 22%",
  },
];

const FALLBACK_IMAGE = "/images/cats/portrait-calico.webp";
const ROTATE_MS = 6500;
const SWIPE_DISTANCE = 44;

export default function StoreHero({ onAction }: { onAction: (action: HeroAction) => void }) {
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  const paused = hovering || focusWithin || tabHidden || reducedMotion;
  const goTo = useCallback((next: number) => setIndex((next + SLIDES.length) % SLIDES.length), []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    const visibility = () => setTabHidden(document.hidden);
    sync();
    visibility();
    query.addEventListener("change", sync);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      query.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => setIndex((current) => (current + 1) % SLIDES.length), ROTATE_MS);
    return () => window.clearTimeout(timer);
  }, [index, paused]);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse") return;
    swipeStart.current = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.4) goTo(index + (dx < 0 ? 1 : -1));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowRight") goTo(index + 1);
    else if (event.key === "ArrowLeft") goTo(index - 1);
  };

  return <section
    className="cp-hero"
    role="region"
    aria-roledescription="carousel"
    aria-label="Featured in the Catopia Store"
    style={{ touchAction: "pan-y" }}
    onMouseEnter={() => setHovering(true)}
    onMouseLeave={() => setHovering(false)}
    onFocus={() => setFocusWithin(true)}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusWithin(false); }}
    onPointerDown={onPointerDown}
    onPointerUp={onPointerUp}
    onPointerCancel={() => { swipeStart.current = null; }}
    onKeyDown={onKeyDown}
  >
    {SLIDES.map((slide, slideIndex) => {
      const active = slideIndex === index;
      return <article
        key={slide.id}
        className={active ? "cp-hero-slide is-active" : "cp-hero-slide"}
        role="group"
        aria-roledescription="slide"
        aria-label={`${slideIndex + 1} of ${SLIDES.length}`}
        aria-hidden={!active}
        style={{ "--hero-pos": slide.desktopPosition, "--hero-pos-m": slide.mobilePosition } as React.CSSProperties}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="cp-hero-bg" src={slide.image} alt="" aria-hidden="true" width={1600} height={1067} loading={slideIndex === 0 ? "eager" : "lazy"} decoding="async" onError={(event) => { event.currentTarget.src = FALLBACK_IMAGE; }} />
        <div className="cp-hero-photo-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="cp-hero-photo" src={slide.image} alt={active ? slide.alt : ""} width={1600} height={1067} loading={slideIndex === 0 ? "eager" : "lazy"} fetchPriority={slideIndex === 0 ? "high" : "auto"} decoding="async" onError={(event) => { event.currentTarget.src = FALLBACK_IMAGE; }} />
        </div>
        <div className="cp-hero-shade" aria-hidden="true" />
        <div className="cp-hero-copy">
          <p className="cp-hero-eyebrow">{slide.eyebrow}</p>
          <h2 className="cp-hero-heading">{slide.heading.split(" ").map((word, wordIndex) => <span key={wordIndex} style={{ display: "contents" }}><span className="cp-hero-word" style={{ animationDelay: `${0.18 + wordIndex * 0.07}s` }}>{word}</span>{" "}</span>)}</h2>
          <p className="cp-hero-description">{slide.description}</p>
          <button className="cp-hero-cta" tabIndex={active ? 0 : -1} onClick={() => onAction(slide.action)}>{slide.cta} <ArrowRight size={15} /></button>
        </div>
      </article>;
    })}
    <Noise opacity={0.1} blendMode="overlay" fps={10} />
    <div className="cp-hero-dots" role="group" aria-label="Choose a slide">
      {SLIDES.map((slide, slideIndex) => <button
        key={slide.id}
        className={slideIndex === index ? "cp-hero-dot is-active" : "cp-hero-dot"}
        aria-label={`Show slide ${slideIndex + 1}: ${slide.heading}`}
        aria-current={slideIndex === index}
        onClick={() => goTo(slideIndex)}
      ><i style={{ animationPlayState: paused ? "paused" : "running" }} /></button>)}
    </div>
  </section>;
}

export type { HeroAction };
