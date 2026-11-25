"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { BadgeCheck, Bookmark, Check, ChevronLeft, ChevronRight, Clock, Flag, Globe, MapPin, MessageCircle, Navigation, Phone, Sparkles, Star, X } from "lucide-react";
import ClickSpark from "./react-bits/ClickSpark";
import GlareHover from "./react-bits/GlareHover";
import GradualBlur from "./react-bits/GradualBlur";
import { CATEGORY_META, type Place, type Review } from "./map-data";

export type SheetState = "collapsed" | "half" | "full";

export function buildDirectionsUrl(place: Place) {
  return `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
}

function Stars({ value, size = 15 }: { value: number; size?: number }) {
  return <span className="cp-stars" aria-hidden="true">{[1, 2, 3, 4, 5].map((index) => <Star key={index} size={size} strokeWidth={1.6} fill={value >= index - 0.25 ? "currentColor" : "none"} style={{ "--i": index } as CSSProperties} />)}</span>;
}

export default function PlacePanel({ place, isSaved, onToggleSave, onClose, onReport, reviews, onSubmitReview, sheetState, onCycleSheet }: {
  place: Place | null;
  isSaved: boolean;
  onToggleSave: () => void;
  onClose: () => void;
  onReport: () => void;
  reviews: Review[];
  onSubmitReview: (rating: number, text: string) => void;
  sheetState: SheetState;
  onCycleSheet: () => void;
}) {
  // Keep rendering the last-selected place while the panel slides shut, matching the
  // sidebar drawer's own always-rendered + toggled-class animation pattern.
  const [lastPlace, setLastPlace] = useState<Place | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);
  const [cycle, setCycle] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Adjust local state during render when a different place is selected, per React's
  // own "store information from previous renders" pattern — no effect needed.
  if (place && place.id !== lastPlace?.id) {
    setLastPlace(place);
    setImageFailed(false);
    setLightboxOpen(false);
    setReviewRating(5);
    setHoverRating(0);
    setReviewText("");
  }
  const isOpen = place !== null;
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) setCycle((current) => current + 1);
  }

  const display = place ?? lastPlace;
  const displayId = display?.id;

  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [cycle, displayId]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (lightboxOpen) setLightboxOpen(false);
      else onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, lightboxOpen, onClose]);

  if (!display) return null;

  const meta = CATEGORY_META[display.category];
  const Icon = meta.icon;
  const images = display.imageUrl && !imageFailed ? [display.imageUrl] : [];
  const placeReviews = reviews.filter((review) => review.placeId === display.id).sort((a, b) => b.date.localeCompare(a.date));
  const averageRating = placeReviews.length ? placeReviews.reduce((sum, review) => sum + review.rating, 0) / placeReviews.length : null;
  const shownRating = hoverRating || reviewRating;
  const verified = display.source === "openstreetmap";
  const hasFacts = Boolean(display.address || display.openingHours || display.phone || display.website);
  const tone = { "--tone": meta.color } as CSSProperties;

  return (
    <aside className={`cp-place-panel is-${sheetState} ${isOpen ? "is-open" : ""}`} style={tone} role="dialog" aria-modal="false" aria-label={`${display.name} details`}>
      <button className="cp-place-sheet-handle" onClick={onCycleSheet} aria-label="Expand or collapse place details"><i /></button>
      <button className="cp-place-close" aria-label="Close place details" onClick={onClose}><X size={17} /></button>

      <div className="cp-place-scroll" ref={scrollRef}>
        <div key={`${display.id}-${cycle}`} className="cp-place-content">
          <div className="cp-place-cover">
            {images.length > 0
              ? <GlareHover width="100%" height="100%" borderRadius="0" glareColor="#fff6dc" glareOpacity={0.35} transitionDuration={900} rimGlint={false}>
                  <button className="cp-place-cover-image" aria-label={`View photo of ${display.name} fullscreen`} onClick={() => setLightboxOpen(true)}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- external, unpredictable-domain OSM image tags can't go through next/image's remote-pattern allowlist */}
                    <img src={images[0]} alt={`${display.name}, via OpenStreetMap`} loading="lazy" onError={() => setImageFailed(true)} />
                  </button>
                </GlareHover>
              : <div className="cp-place-plate" aria-hidden="true">
                  <span className="cp-place-plate-top"><span>Catopia · Place study</span><span>{verified ? "OSM" : "Sample"}</span></span>
                  <span className="cp-place-plate-rings" />
                  <span className="cp-place-plate-disc"><Icon size={34} strokeWidth={1.3} /></span>
                  <span className="cp-place-plate-foot">No photo yet</span>
                </div>}
            <span className="cp-place-cover-shade" aria-hidden="true" />
            <span className="cp-place-badge" aria-hidden="true"><Icon size={22} strokeWidth={1.8} /></span>
          </div>

          <div className="cp-place-body">
            <p className="cp-reveal cp-place-eyebrow" style={{ "--i": 0 } as CSSProperties}><i />{meta.label}</p>
            <h2 className="cp-reveal" style={{ "--i": 1 } as CSSProperties}>{display.name}</h2>
            <div className="cp-reveal cp-place-meta" style={{ "--i": 2 } as CSSProperties}>
              <span className={verified ? "cp-place-source is-verified" : "cp-place-source is-sample"}>{verified ? <BadgeCheck size={14} /> : <Sparkles size={14} />}{verified ? "Verified via OpenStreetMap" : "Sample place · preview only"}</span>
            </div>
            <div className={averageRating != null ? "cp-reveal cp-place-rating" : "cp-reveal cp-place-rating is-empty"} style={{ "--i": 3 } as CSSProperties}>
              {averageRating != null
                ? <><b>{averageRating.toFixed(1)}</b><Stars value={averageRating} /><span>{placeReviews.length} review{placeReviews.length === 1 ? "" : "s"}</span></>
                : <><Stars value={0} /><span>No reviews yet</span><button onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}>Be the first</button></>}
            </div>

            <div className="cp-reveal cp-place-actions" style={{ "--i": 4 } as CSSProperties}>
              <a className="cp-place-directions" href={buildDirectionsUrl(display)} target="_blank" rel="noopener noreferrer"><Navigation size={17} /> Directions</a>
              <ClickSpark className="cp-place-spark" style={{ width: "auto", height: "auto" }} sparkColor={["#c86f50", "#e6b26a", "#365744"]} shape="star" sparkCount={9} sparkRadius={34} sparkSize={12} duration={650} glow={0.4} disabled={isSaved}>
                <button className={isSaved ? "cp-place-circle is-saved" : "cp-place-circle"} onClick={onToggleSave} aria-pressed={isSaved} aria-label={isSaved ? "Remove from saved places" : "Save this place"}><Bookmark size={18} fill={isSaved ? "currentColor" : "none"} /></button>
              </ClickSpark>
              {display.phone && <a className="cp-place-circle" href={`tel:${display.phone}`} aria-label={`Call ${display.name}`}><Phone size={18} /></a>}
              {display.website && <a className="cp-place-circle" href={display.website} target="_blank" rel="noopener noreferrer" aria-label={`Open the website of ${display.name}`}><Globe size={18} /></a>}
            </div>

            <ul className="cp-reveal cp-place-facts" style={{ "--i": 5 } as CSSProperties}>
              {display.address && <li><span><MapPin size={15} /></span><p>{display.address}</p></li>}
              {display.openingHours && <li><span><Clock size={15} /></span><p>{display.openingHours}</p></li>}
              {display.phone && <li><span><Phone size={15} /></span><a href={`tel:${display.phone}`}>{display.phone}</a></li>}
              {display.website && <li><span><Globe size={15} /></span><a href={display.website} target="_blank" rel="noopener noreferrer">{display.website.replace(/^https?:\/\//, "")}</a></li>}
              {!hasFacts && <li className="cp-place-fact-empty"><span><MapPin size={15} /></span><p>No further verified details are available for this place yet.</p></li>}
            </ul>

            {display.description && <p className="cp-reveal cp-place-description" style={{ "--i": 6 } as CSSProperties}>{display.description}</p>}

            <section className="cp-reveal cp-place-reviews" style={{ "--i": 7 } as CSSProperties} aria-label="Reviews">
              <div className="cp-place-reviews-head"><h3>Reviews</h3><span>{placeReviews.length ? "This preview session" : "None yet"}</span></div>
              {placeReviews.length === 0
                ? <div className="cp-place-empty-reviews"><MessageCircle size={20} strokeWidth={1.5} /><p>No reviews yet. Be the first to share one. It stays in this preview session only.</p></div>
                : <div className="cp-place-review-list">{placeReviews.map((review) => <article key={review.id} className="cp-place-review"><span className="cp-place-avatar" aria-hidden="true">{review.author.slice(0, 1)}</span><div><div className="cp-place-review-head"><b>{review.author}</b><span role="img" aria-label={`${review.rating} out of 5 stars`}><Stars value={review.rating} size={13} /></span></div><p>{review.text}</p><small>{new Date(review.date).toLocaleDateString()}</small></div></article>)}</div>}
              <form ref={formRef} className="cp-place-review-form" onSubmit={(event) => { event.preventDefault(); if (!reviewText.trim()) return; onSubmitReview(reviewRating, reviewText.trim()); setReviewText(""); setReviewRating(5); setHoverRating(0); }}>
                <label className="cp-place-form-label">Your rating</label>
                <div className="cp-place-star-picker" onMouseLeave={() => setHoverRating(0)}>
                  {[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} aria-label={`${value} star${value > 1 ? "s" : ""}`} aria-pressed={reviewRating === value} className={value <= shownRating ? "is-lit" : ""} onMouseEnter={() => setHoverRating(value)} onFocus={() => setHoverRating(value)} onBlur={() => setHoverRating(0)} onClick={() => setReviewRating(value)}><Star size={22} strokeWidth={1.6} fill={value <= shownRating ? "currentColor" : "none"} /></button>)}
                </div>
                <textarea placeholder="Share a little about this place…" rows={3} value={reviewText} onChange={(event) => setReviewText(event.target.value)} aria-label="Your review" />
                <button type="submit" className="cp-place-review-submit" disabled={!reviewText.trim()}>Post review</button>
                <p className="cp-place-form-notice"><Check size={13} /> Preview only. Your review stays in this browser session.</p>
              </form>
            </section>

            <button className="cp-reveal cp-place-report" style={{ "--i": 8 } as CSSProperties} onClick={onReport}><Flag size={13} /> Report incorrect information</button>
          </div>
        </div>
      </div>
      <GradualBlur position="top" height="3.2rem" strength={1.4} layers={7} autoHide container={scrollRef} zIndex={3} tint="#fbf8ed" opacity={0.95} />
      <GradualBlur position="bottom" height="4.2rem" strength={1.6} layers={8} autoHide container={scrollRef} zIndex={3} tint="#fbf8ed" opacity={0.95} />

      {lightboxOpen && images.length > 0 && typeof document !== "undefined" && createPortal(
        // Rendered via portal: the panel's own backdrop-filter would otherwise trap a
        // position:fixed overlay inside the panel's box instead of the full viewport.
        <div className="cp-place-lightbox" role="dialog" aria-modal="true" aria-label={`${display.name} photo`} onClick={() => setLightboxOpen(false)}>
          <button className="cp-place-lightbox-close" aria-label="Close photo viewer" onClick={() => setLightboxOpen(false)}><X size={20} /></button>
          {/* eslint-disable-next-line @next/next/no-img-element -- same external-image reasoning as the cover photo above */}
          <img src={images[0]} alt={`${display.name}, via OpenStreetMap`} onClick={(event) => event.stopPropagation()} />
          <div className="cp-place-lightbox-nav" onClick={(event) => event.stopPropagation()}>
            <button aria-label="Previous photo" disabled><ChevronLeft size={18} /></button>
            <span>1 / {images.length}</span>
            <button aria-label="Next photo" disabled><ChevronRight size={18} /></button>
          </div>
        </div>,
        document.body,
      )}
    </aside>
  );
}
