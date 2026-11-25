"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowRight, ArrowUp, Bookmark, Check, Earth, Layers, LocateFixed, MapPin, Minus, Orbit, PawPrint, Pause, Plus, RefreshCw, Satellite, Search, ShieldCheck, X } from "lucide-react";
import Counter from "./react-bits/Counter";
import Magnet from "./react-bits/Magnet";
import ShinyText from "./react-bits/ShinyText";
import StarBorder from "./react-bits/StarBorder";
import PlacePanel, { type SheetState } from "./place-panel";
import { CATEGORY_META, CATEGORY_ORDER, MAP_CENTER, SAMPLE_PLACES, fetchOsmPlaces, type Place, type PlaceCategory, type Review } from "./map-data";
import type { MapCommand, MapView, ThemeName } from "./interactive-map";

const InteractiveMap = dynamic(() => import("./interactive-map"), { ssr: false, loading: () => <div className="cp-map-loading"><ShinyText text="Preparing the neighborhood map…" color="#7b8070" shineColor="#fffdf4" speed={2.4} /></div> });

const MAP_THEMES: { id: ThemeName; label: string; note: string; swatch: string }[] = [
  { id: "cozy", label: "Cozy", note: "Catopia's warm theme", swatch: "linear-gradient(135deg,#f5f0df 0 55%,#cfe1df 55%)" },
  { id: "positron", label: "Positron", note: "Light and airy", swatch: "linear-gradient(135deg,#f3f4ea 0 55%,#dfe4d6 55%)" },
  { id: "bright", label: "Bright", note: "Vivid colour", swatch: "linear-gradient(135deg,#ffe9a6 0 55%,#9fd3ee 55%)" },
  { id: "liberty", label: "Liberty", note: "Balanced detail", swatch: "linear-gradient(135deg,#dcebcf 0 55%,#a8cce0 55%)" },
  { id: "dark", label: "Dark", note: "Night mode", swatch: "linear-gradient(135deg,#2c3a33 0 55%,#1b2622 55%)" },
  { id: "fiord", label: "Fiord", note: "Moody terrain", swatch: "linear-gradient(135deg,#566383 0 55%,#38425d 55%)" },
  { id: "satellite", label: "Satellite", note: "Aerial imagery", swatch: "linear-gradient(135deg,#6f7f55 0 55%,#3f5a74 55%)" },
];

const INITIAL_FETCH_RADIUS_DEG = 0.045;
const SEARCH_AREA_THRESHOLD_DEG = 0.02;

type GeocodeResult = { name: string; label: string; center: [number, number] };

function distanceDeg(a: [number, number], b: [number, number]) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function RailButton({ icon: Icon, label, active = false, pressed, expanded, busy = false, onClick }: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  pressed?: boolean;
  expanded?: boolean;
  busy?: boolean;
  onClick: () => void;
}) {
  return <button className={["cp-rail-btn", active ? "is-active" : "", busy ? "is-busy" : ""].filter(Boolean).join(" ")} data-tip={label} aria-label={label} aria-pressed={pressed} aria-expanded={expanded} onClick={onClick}>
    <Icon size={19} strokeWidth={1.8} />
  </button>;
}

export default function MapScreen() {
  const [activeCategories, setActiveCategories] = useState<PlaceCategory[]>([]);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [geocodeResults, setGeocodeResults] = useState<GeocodeResult[]>([]);
  const [message, setMessage] = useState("");
  const [style, setStyle] = useState<ThemeName>("cozy");
  const [styleBeforeImagery, setStyleBeforeImagery] = useState<ThemeName>("cozy");
  const [themeOpen, setThemeOpen] = useState(false);
  const [command, setCommand] = useState<MapCommand>({ kind: "center", seq: 0 });
  const [view3d, setView3d] = useState(false);
  const [orbit, setOrbit] = useState(false);
  const [view, setView] = useState<MapView>({ bearing: 0, pitch: 0, zoom: 15 });
  const [locating, setLocating] = useState(false);
  const [osmPlaces, setOsmPlaces] = useState<Place[]>([]);
  const [placesLoading, setPlacesLoading] = useState(true);
  const [lastFetchCenter, setLastFetchCenter] = useState<[number, number]>(MAP_CENTER);
  const [showSearchArea, setShowSearchArea] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [savedPlaceIds, setSavedPlaceIds] = useState<string[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [sheetState, setSheetState] = useState<SheetState>("half");

  const loadPlacesNear = async (center: [number, number]) => {
    setPlacesLoading(true);
    setShowSearchArea(false);
    const bbox = { south: center[1] - INITIAL_FETCH_RADIUS_DEG, west: center[0] - INITIAL_FETCH_RADIUS_DEG, north: center[1] + INITIAL_FETCH_RADIUS_DEG, east: center[0] + INITIAL_FETCH_RADIUS_DEG };
    const found = await fetchOsmPlaces(bbox);
    setOsmPlaces(found);
    setLastFetchCenter(center);
    setPlacesLoading(false);
    setMessage(found.length ? "" : "No verified places found here yet from OpenStreetMap. Showing sample concept places only.");
  };

  useEffect(() => {
    // Genuine data fetch on mount; "Search this area" re-triggers this intentionally via loadPlacesNear itself.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPlacesNear(MAP_CENTER);
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 7000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const allPlaces = useMemo(() => [...osmPlaces, ...SAMPLE_PLACES], [osmPlaces]);
  const categoryFiltered = useMemo(() => activeCategories.length === 0 ? allPlaces : allPlaces.filter((place) => activeCategories.includes(place.category)), [allPlaces, activeCategories]);
  const visiblePlaces = useMemo(() => showSavedOnly ? categoryFiltered.filter((place) => savedPlaceIds.includes(place.id)) : categoryFiltered, [categoryFiltered, showSavedOnly, savedPlaceIds]);
  const selectedPlace = useMemo(() => allPlaces.find((place) => place.id === selectedPlaceId) ?? null, [allPlaces, selectedPlaceId]);
  const placeMatches = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (query.length < 2) return [];
    return allPlaces.filter((place) => `${place.name} ${CATEGORY_META[place.category].label}`.toLowerCase().includes(query)).slice(0, 5);
  }, [search, allPlaces]);

  const send = (kind: MapCommand["kind"], center?: [number, number]) => setCommand((current) => ({ kind, seq: current.seq + 1, center }));
  const toggleCategory = (category: PlaceCategory) => setActiveCategories((current) => current.includes(category) ? current.filter((item) => item !== category) : [...current, category]);
  const selectPlace = (id: string | null) => { setSelectedPlaceId(id); if (id) setSheetState("half"); };
  const toggleSavedPlace = (id: string) => setSavedPlaceIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const submitReview = (placeId: string, rating: number, text: string) => setReviews((current) => [...current, { id: `review-${Date.now()}`, placeId, author: "Preview visitor", rating, text, date: new Date().toISOString() }]);

  const runSearch = async () => {
    const query = search.trim().toLowerCase();
    if (!query) return;
    if (["akurdi", "dypiu", "pune", "dy patil"].some((term) => query.includes(term))) {
      send("fly", MAP_CENTER);
      setMessage("Showing the DYPIU Akurdi area.");
      setGeocodeResults([]);
      return;
    }
    setMessage("Searching OpenStreetMap places…");
    try {
      const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(search.trim())}&lat=18.6460&lon=73.7602&limit=5&lang=en`);
      if (!response.ok) throw new Error("Place search is unavailable.");
      const result = await response.json() as { features?: { geometry?: { coordinates?: [number, number] }; properties?: { name?: string; street?: string; city?: string; district?: string; country?: string } }[] };
      const matches = (result.features ?? []).flatMap((feature) => {
        const center = feature.geometry?.coordinates;
        const name = feature.properties?.name;
        if (!center || !name) return [];
        const address = [feature.properties?.street, feature.properties?.district, feature.properties?.city, feature.properties?.country].filter(Boolean).join(", ");
        return [{ name, label: address || name, center: center as [number, number] }];
      });
      setGeocodeResults(matches);
      setMessage(matches.length || placeMatches.length ? "" : "No matching places found. Try another search.");
    } catch {
      setGeocodeResults([]);
      setMessage("Place search is temporarily unavailable. The map still works for panning and zooming.");
    }
  };
  const chooseGeocodeResult = (result: GeocodeResult) => { send("fly", result.center); selectPlace(null); setGeocodeResults([]); setSearch(""); };
  const choosePlaceResult = (place: Place) => { send("fly", [place.lng, place.lat]); selectPlace(place.id); setGeocodeResults([]); setSearch(""); };
  const locate = () => {
    if (!navigator.geolocation) { setMessage("Location access is unavailable in this browser."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setLocating(false); send("fly", [coords.longitude, coords.latitude]); setMessage("Centered on your location. Your coordinates are not saved."); },
      () => { setLocating(false); setMessage("Location wasn’t shared. The map stays on the DYPIU Akurdi area."); },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  };
  const handleReport = () => setMessage("Thanks for the note — reports stay in this preview and aren’t sent anywhere yet.");
  const handleMapMoved = (center: [number, number]) => { if (distanceDeg(center, lastFetchCenter) > SEARCH_AREA_THRESHOLD_DEG) setShowSearchArea(true); };
  const handleViewChange = useCallback((next: MapView) => setView((current) => (
    Math.abs(current.bearing - next.bearing) < 0.5 && Math.abs(current.pitch - next.pitch) < 0.5 && Math.abs(current.zoom - next.zoom) < 0.05 ? current : next
  )), []);
  const stopOrbit = useCallback(() => setOrbit(false), []);
  const toggleSavedOnly = () => {
    const next = !showSavedOnly;
    setShowSavedOnly(next);
    if (next && savedPlaceIds.length === 0) setMessage("You haven’t saved any places yet. Open a place and tap Save.");
  };
  const toggle3d = () => {
    const next = !view3d;
    setView3d(next);
    if (!next) setOrbit(false);
    else setMessage("3D Earth view. Drag to look around; right-drag or use two fingers to tilt and rotate.");
  };
  const imageryOn = style === "satellite";
  const toggleImagery = () => {
    if (imageryOn) setStyle(styleBeforeImagery);
    else { setStyleBeforeImagery(style); setStyle("satellite"); }
  };
  const earthOut = view.zoom < 6;
  const flyEarth = () => { setOrbit(false); send(earthOut ? "earth-home" : "earth-out", MAP_CENTER); };
  const showCompass = view3d || Math.abs(view.bearing) > 1;

  const showResults = placeMatches.length > 0 || geocodeResults.length > 0;
  return <section className={["cp-cat-map-page", selectedPlace ? "has-place" : "", view3d ? "is-3d" : ""].filter(Boolean).join(" ")}>
    <InteractiveMap styleName={style} command={command} places={visiblePlaces} selectedId={selectedPlaceId} onSelectPlace={selectPlace} onMapMoved={handleMapMoved} mode3d={view3d} orbit={orbit} onViewChange={handleViewChange} onOrbitStop={stopOrbit} />

    <div className="cp-map-top">
      <div className="cp-map-dock">
        <Link className="cp-map-brand" href="/" aria-label="Catopia home"><Image src="/images/catopia-mark.svg" alt="" width={32} height={32} /><b>catopia</b></Link>
        <div className="cp-map-search">
          <Search size={18} strokeWidth={1.8} />
          <input id="map-place-search" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && runSearch()} placeholder="Search cat cafés, shelters, vets, streets…" aria-label="Search cat cafes, shelters, vets, streets or places" />
          {search && <button className="cp-map-search-clear" aria-label="Clear search" onClick={() => { setSearch(""); setGeocodeResults([]); }}><X size={15} /></button>}
          <button className="cp-map-search-go" aria-label="Search map" onClick={runSearch}><ArrowRight size={17} /></button>
        </div>
      </div>

      {showResults && <div className="cp-map-results" role="listbox" aria-label="Search results">
        {placeMatches.length > 0 && <p className="cp-map-results-group">Places</p>}
        {placeMatches.map((place, index) => { const Icon = CATEGORY_META[place.category].icon; return <button key={place.id} style={{ "--i": index } as CSSProperties} onClick={() => choosePlaceResult(place)}><span className="cp-map-result-icon" style={{ background: `${CATEGORY_META[place.category].color}24`, color: CATEGORY_META[place.category].color }}><Icon size={16} /></span><span><b>{place.name}</b><small>{CATEGORY_META[place.category].label}{place.address ? ` · ${place.address}` : ""}</small></span></button>; })}
        {geocodeResults.length > 0 && <p className="cp-map-results-group">Locations</p>}
        {geocodeResults.map((result, index) => <button key={`${result.name}-${index}`} style={{ "--i": index } as CSSProperties} onClick={() => chooseGeocodeResult(result)}><span className="cp-map-result-icon"><MapPin size={16} /></span><span><b>{result.name}</b><small>{result.label}</small></span></button>)}
      </div>}

      <div className="cp-map-chips-row">
        <div className="cp-map-chips" role="group" aria-label="Place category filters">
          <button className={activeCategories.length === 0 ? "cp-chip is-active" : "cp-chip"} style={{ "--i": 0 } as CSSProperties} aria-pressed={activeCategories.length === 0} onClick={() => setActiveCategories([])}><span className="cp-chip-label">All places</span></button>
          {CATEGORY_ORDER.map((category, index) => {
            const meta = CATEGORY_META[category];
            const Icon = meta.icon;
            const active = activeCategories.includes(category);
            return <button key={category} className={active ? "cp-chip is-active" : "cp-chip"} style={{ "--i": index + 1, "--chip": meta.color } as CSSProperties} aria-pressed={active} onClick={() => toggleCategory(category)}>
              <span className="cp-chip-icon"><Icon size={14} strokeWidth={2} /></span><span className="cp-chip-label">{meta.label}</span>
            </button>;
          })}
          {activeCategories.length > 0 && <button className="cp-chip cp-chip-clear" onClick={() => setActiveCategories([])}><X size={13} /> Clear</button>}
        </div>
        <div className="cp-map-count" aria-live="polite">
          {placesLoading
            ? <ShinyText text="Finding nearby places…" color="#6f7a68" shineColor="#fffdf4" speed={2} />
            : <><Counter value={visiblePlaces.length} fontSize="inherit" intro={false} duration={0.6} /><span>{visiblePlaces.length === 1 ? "place" : "places"}</span></>}
        </div>
      </div>
    </div>

    <div className="cp-map-floaters">
      {message && <div className="cp-map-toast" role="status"><span>{message}</span><button aria-label="Dismiss message" onClick={() => setMessage("")}><X size={14} /></button></div>}
      {showSearchArea && <button className="cp-map-search-area" onClick={() => loadPlacesNear(command.center ?? lastFetchCenter)}><RefreshCw size={14} /> Search this area</button>}
    </div>

    <div className="cp-map-rail" role="toolbar" aria-label="Map controls">
      <div className="cp-map-rail-group">
        <div className="cp-map-theme">
          <RailButton icon={Layers} label="Map style" active={themeOpen} expanded={themeOpen} onClick={() => setThemeOpen((open) => !open)} />
          {themeOpen && <div className="cp-map-tray" role="menu" aria-label="Map styles">
            <p>Map style</p>
            <div className="cp-map-tray-grid">
              {MAP_THEMES.map((theme, index) => <button key={theme.id} role="menuitemradio" aria-checked={style === theme.id} className={style === theme.id ? "is-active" : ""} style={{ "--i": index } as CSSProperties} onClick={() => { setStyle(theme.id); setThemeOpen(false); }}>
                <span className="cp-theme-swatch" style={{ background: theme.swatch }}>{style === theme.id && <Check size={14} strokeWidth={3} />}</span>
                <b>{theme.label}</b><small>{theme.note}</small>
              </button>)}
            </div>
          </div>}
        </div>
        <RailButton icon={Bookmark} label={showSavedOnly ? "Showing saved places" : "Show saved places"} active={showSavedOnly} pressed={showSavedOnly} onClick={toggleSavedOnly} />
        <RailButton icon={LocateFixed} label="Use my location" busy={locating} onClick={locate} />
      </div>

      <div className="cp-map-rail-group">
        <StarBorder as="button" className={view3d ? "cp-rail-3d is-active" : "cp-rail-3d"} theme="light" radius={14} duration={view3d ? 3 : 6} hover="brighten" glow={view3d ? 0.8 : 0.35} backgroundColor={view3d ? "#365744" : "#fffdf4"} textColor={view3d ? "#fffdf4" : "#365744"} borderColor="transparent" aria-pressed={view3d} aria-label={view3d ? "Switch to the flat 2D map" : "Switch to the 3D Earth view"} data-tip={view3d ? "Back to 2D" : "3D Earth view"} onClick={toggle3d}>3D</StarBorder>
        {showCompass && <button className="cp-rail-btn cp-rail-compass" data-tip="Face north" aria-label="Reset the map to face north" onClick={() => send("north")}>
          <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true" style={{ transform: `rotate(${-view.bearing}deg)` }}><circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeOpacity=".22" strokeWidth="1.5" /><path d="M16 4.5 20.2 16H11.8Z" fill="#c86f50" /><path d="M16 27.5 11.8 16h8.4Z" fill="currentColor" fillOpacity=".4" /></svg>
        </button>}
      </div>

      <div className="cp-map-rail-group">
        <RailButton icon={Plus} label="Zoom in" onClick={() => send("zoom-in")} />
        <RailButton icon={Minus} label="Zoom out" onClick={() => send("zoom-out")} />
      </div>
    </div>

    <div className={view3d ? "cp-map-3d is-open" : "cp-map-3d"} role="toolbar" aria-label="3D view controls" inert={!view3d}>
      <button className={orbit ? "is-active" : ""} aria-pressed={orbit} aria-label={orbit ? "Stop orbiting" : "Orbit around the area"} onClick={() => setOrbit((on) => !on)}>{orbit ? <Pause size={16} /> : <Orbit size={16} />}<span>{orbit ? "Stop orbit" : "Orbit"}</span></button>
      <i aria-hidden="true" />
      <button aria-label="Tilt the view down" onClick={() => send("tilt-down")}><ArrowDown size={16} /><span>Tilt</span></button>
      <button aria-label="Tilt the view up" onClick={() => send("tilt-up")}><ArrowUp size={16} /></button>
      <i aria-hidden="true" />
      <button className={imageryOn ? "is-active" : ""} aria-pressed={imageryOn} aria-label="Satellite imagery" onClick={toggleImagery}><Satellite size={16} /><span>Imagery</span></button>
      <button aria-label={earthOut ? "Fly back home" : "Zoom out to see the Earth"} onClick={flyEarth}><Earth size={16} /><span>{earthOut ? "Fly home" : "Earth"}</span></button>
    </div>

    <div className="cp-map-privacy" tabIndex={0} role="note" aria-label="Public map locations are approximate. Sensitive cat locations stay private."><ShieldCheck size={17} strokeWidth={1.8} /><span>Public map locations are approximate. Sensitive cat locations stay private.</span></div>
    <div className="cp-map-add-slot">
      <Magnet padding={46} magnetStrength={4} maxOffset={8}>
        <button className="cp-map-add" onClick={() => setMessage("Sighting submissions will open when private uploads and moderator review are connected.")}><PawPrint size={18} strokeWidth={1.8} /> Add a sighting</button>
      </Magnet>
    </div>
    {themeOpen && <button className="cp-map-theme-backdrop" aria-label="Close map style menu" onClick={() => setThemeOpen(false)} />}

    <PlacePanel
      place={selectedPlace}
      isSaved={selectedPlace ? savedPlaceIds.includes(selectedPlace.id) : false}
      onToggleSave={() => selectedPlace && toggleSavedPlace(selectedPlace.id)}
      onClose={() => selectPlace(null)}
      onReport={handleReport}
      reviews={reviews}
      onSubmitReview={(rating, text) => selectedPlace && submitReview(selectedPlace.id, rating, text)}
      sheetState={sheetState}
      onCycleSheet={() => setSheetState((current) => current === "collapsed" ? "half" : current === "half" ? "full" : "collapsed")}
    />
  </section>;
}
