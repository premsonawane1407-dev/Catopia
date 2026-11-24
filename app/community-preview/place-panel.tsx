"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Bookmark, Check, ChevronLeft, ChevronRight, Clock, Flag, Globe, MapPin, MessageCircle, Navigation, Phone, Star, X } from "lucide-react";
import { CATEGORY_META, type Place, type Review } from "./map-data";

export type SheetState = "collapsed" | "half" | "full";

export function buildDirectionsUrl(place: Place) {
  return `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
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
  const [reviewText, setReviewText] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  // Adjust local state during render when a different place is selected, per React's
  // own "store information from previous renders" pattern — no effect needed.
  if (place && place.id !== lastPlace?.id) {
    setLastPlace(place);
    setImageFailed(false);
    setLightboxOpen(false);
    setReviewRating(5);
    setReviewText("");
  }

  const isOpen = place !== null;
  const display = place ?? lastPlace;
  if (!display) return null;

  const meta = CATEGORY_META[display.category];
  const Icon = meta.icon;
  const images = display.imageUrl && !imageFailed ? [display.imageUrl] : [];
  const placeReviews = reviews.filter((review) => review.placeId === display.id).sort((a, b) => b.date.localeCompare(a.date));
  const averageRating = placeReviews.length ? placeReviews.reduce((sum, review) => sum + review.rating, 0) / placeReviews.length : null;

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "Escape") return;
    if (lightboxOpen) setLightboxOpen(false);
    else onClose();
  };

  return (
    <aside className={`cp-place-panel is-${sheetState} ${isOpen ? "is-open" : ""}`} role="dialog" aria-modal="false" aria-label={`${display.name} details`} onKeyDown={handleKeyDown}>
      <button className="cp-place-sheet-handle" onClick={onCycleSheet} aria-label="Expand or collapse place details"><i /></button>
      <div className="cp-place-panel-scroll">
        <div className="cp-place-cover">
          {images.length > 0
            ? <button className="cp-place-cover-image" aria-label={`View photo of ${display.name} fullscreen`} onClick={() => setLightboxOpen(true)}>
                {/* eslint-disable-next-line @next/next/no-img-element -- external, unpredictable-domain OSM image tags can't go through next/image's remote-pattern allowlist */}
                <img src={images[0]} alt={`${display.name}, via OpenStreetMap`} loading="lazy" onError={() => setImageFailed(true)} />
              </button>
            : <div className="cp-place-cover-fallback" style={{ color: meta.color }}><Icon size={32} /><span>No photo yet</span></div>}
          <button className="cp-place-close" aria-label="Close place details" onClick={onClose}><X size={16} /></button>
          <span className={`cp-place-source-pill ${display.source === "openstreetmap" ? "is-verified" : "is-sample"}`}>{display.source === "openstreetmap" ? "Verified via OpenStreetMap" : "Sample place · preview only"}</span>
        </div>

        <div className="cp-place-body">
          <div className="cp-place-heading" style={{ color: meta.color }}><Icon size={15} /><span>{meta.label}</span></div>
          <h2>{display.name}</h2>
          <div className="cp-place-rating">
            {averageRating != null
              ? <><Star size={14} fill="currentColor" /><b>{averageRating.toFixed(1)}</b><span>({placeReviews.length} review{placeReviews.length === 1 ? "" : "s"})</span></>
              : <span className="cp-place-no-rating">No reviews yet</span>}
          </div>

          <ul className="cp-place-fact-list">
            {display.address && <li><MapPin size={14} /><span>{display.address}</span></li>}
            {display.openingHours && <li><Clock size={14} /><span>{display.openingHours}</span></li>}
            {display.phone && <li><Phone size={14} /><a href={`tel:${display.phone}`}>{display.phone}</a></li>}
            {display.website && <li><Globe size={14} /><a href={display.website} target="_blank" rel="noopener noreferrer">{display.website.replace(/^https?:\/\//, "")}</a></li>}
            {!display.address && !display.openingHours && !display.phone && !display.website && <li className="cp-place-fact-empty">No further verified details are available for this place yet.</li>}
          </ul>

          {display.description && <p className="cp-place-description">{display.description}</p>}

          <div className="cp-place-actions">
            <a className="cp-button cp-button-dark" href={buildDirectionsUrl(display)} target="_blank" rel="noopener noreferrer"><Navigation size={15} /> Directions</a>
            <button className={isSaved ? "cp-button cp-button-light is-saved" : "cp-button cp-button-light"} onClick={onToggleSave} aria-pressed={isSaved}><Bookmark size={15} fill={isSaved ? "currentColor" : "none"} /> {isSaved ? "Saved" : "Save"}</button>
          </div>

          <div className="cp-place-reviews">
            <div className="cp-place-reviews-head"><h3>Reviews</h3><span>{placeReviews.length ? "This preview session" : "None yet"}</span></div>
            {placeReviews.length === 0
              ? <div className="cp-place-empty-reviews"><MessageCircle size={18} /><p>No reviews yet. Be the first to share one — it stays in this preview session only.</p></div>
              : <div className="cp-place-review-list">{placeReviews.map((review) => <article key={review.id} className="cp-place-review"><div className="cp-place-review-head"><b>{review.author}</b><span className="cp-place-review-stars" aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span></div><p>{review.text}</p><small>{new Date(review.date).toLocaleDateString()}</small></article>)}</div>}
            <form className="cp-place-review-form" onSubmit={(event) => { event.preventDefault(); if (!reviewText.trim()) return; onSubmitReview(reviewRating, reviewText.trim()); setReviewText(""); setReviewRating(5); }}>
              <label className="cp-form-label">Your rating</label>
              <div className="cp-place-star-picker">{[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} aria-label={`${value} star${value > 1 ? "s" : ""}`} aria-pressed={reviewRating === value} onClick={() => setReviewRating(value)}><Star size={18} fill={value <= reviewRating ? "currentColor" : "none"} /></button>)}</div>
              <textarea placeholder="Share a little about this place…" rows={3} value={reviewText} onChange={(event) => setReviewText(event.target.value)} />
              <button type="submit" className="cp-button cp-button-dark cp-place-review-submit" disabled={!reviewText.trim()}>Post review</button>
              <p className="cp-form-notice"><Check size={13} /> Preview only. Your review stays in this browser session.</p>
            </form>
          </div>

          <button className="cp-place-report" onClick={onReport}><Flag size={13} /> Report incorrect information</button>
        </div>
      </div>

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
