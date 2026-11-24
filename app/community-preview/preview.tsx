"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import PawScreen from "./paw";
import PlacePanel, { type SheetState } from "./place-panel";
import StoreScreen from "./store";
import { CATEGORY_META, CATEGORY_ORDER, SAMPLE_PLACES, fetchOsmPlaces, type Place, type PlaceCategory, type Review } from "./map-data";
import type { CartItem, CheckoutStep } from "./store-data";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight, ArrowUpRight, Bookmark, Check, ChevronDown, Clapperboard, Compass, ShoppingBag, ShoppingCart, PawPrint,
  Flag, Heart, Home, LocateFixed, Map, MapPin, Menu, MessageCircle, Plus, RefreshCw, Search,
  Send, ShieldCheck, Upload, Users, X, MoreHorizontal, Layers,
} from "lucide-react";

const InteractiveMap = dynamic(() => import("./interactive-map"), { ssr: false, loading: () => <div className="cp-map-loading">Preparing the neighborhood map…</div> });

type Screen = "Home" | "Discover" | "Plays" | "Map" | "PAW" | "Store" | "Share a story" | "Saved" | "Profile" | "Review desk";
type StoryKind = "Sighting" | "Portrait" | "Memory";
type MapTheme = "positron" | "bright" | "liberty" | "dark" | "fiord" | "satellite" | "cozy";
const mapThemes: { id: MapTheme; label: string; note: string; swatch: string }[] = [
  { id: "cozy", label: "Cozy (Catopia)", note: "Warm branded theme", swatch: "#efe6d2" },
  { id: "positron", label: "Positron", note: "Light & airy", swatch: "#eceee1" },
  { id: "bright", label: "Bright", note: "Vivid colour", swatch: "#ffdf8f" },
  { id: "liberty", label: "Liberty", note: "Balanced detail", swatch: "#cfe0c2" },
  { id: "dark", label: "Dark", note: "Night mode", swatch: "#2c3a33" },
  { id: "fiord", label: "Fiord", note: "Moody terrain tones", swatch: "#45516e" },
  { id: "satellite", label: "Satellite", note: "Aerial imagery", swatch: "#5c6b4f" },
];

const navigation: { name: Screen; icon: typeof Home }[] = [
  { name: "Home", icon: Home }, { name: "Discover", icon: Compass },
  { name: "Plays", icon: Clapperboard }, { name: "Map", icon: Map }, { name: "PAW", icon: PawPrint }, { name: "Store", icon: ShoppingBag },
  { name: "Saved", icon: Bookmark },
];
const portraits = [
  { image: "/images/cats/portrait-tabby.webp", label: "Portrait study 01", kind: "Sighting" as const, note: "A familiar face, on a quiet afternoon." },
  { image: "/images/cats/portrait-calico.webp", label: "Portrait study 02", kind: "Portrait" as const, note: "A little pause in the middle of the day." },
  { image: "/images/cats/portrait-kitten.webp", label: "Portrait study 03", kind: "Memory" as const, note: "A small moment worth remembering." },
  { image: "/images/cats/portrait-tuxedo.webp", label: "Portrait study 04", kind: "Portrait" as const, note: "A portrait from the visual reference set." },
  { image: "/images/cats/peek-black.webp", label: "Portrait study 05", kind: "Sighting" as const, note: "A curious visitor, shown as a sample." },
];
const kinds: StoryKind[] = ["Sighting", "Portrait", "Memory"];
const sampleClips = [
  { image: portraits[2].image, title: "A very important sunbeam", by: "Campus neighbor · sample", ratio: "9 / 16", length: "0:18" },
  { image: portraits[0].image, title: "The slow blink club", by: "A cat watcher · sample", ratio: "4 / 3", length: "0:32" },
  { image: portraits[4].image, title: "Who’s behind the leaves?", by: "Around Akurdi · sample", ratio: "1 / 1", length: "0:12" },
  { image: portraits[1].image, title: "A tiny afternoon stretch", by: "A neighbor · sample", ratio: "16 / 9", length: "0:24" },
  { image: portraits[3].image, title: "Just passing through", by: "Campus neighbor · sample", ratio: "3 / 4", length: "0:21" },
  { image: portraits[2].image, title: "Nap, uninterrupted", by: "A cat watcher · sample", ratio: "4 / 5", length: "0:16" },
];

export default function CommunityPreview({ utcDay }: { utcDay: number }) {
  const [screen, setScreen] = useState<Screen>("Home");
  const [filter, setFilter] = useState("All stories");
  const [storyKind, setStoryKind] = useState<StoryKind>("Sighting");
  const [publicName, setPublicName] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [liked, setLiked] = useState<string[]>([]);
  const [likedClips, setLikedClips] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [role, setRole] = useState("Story reviewer");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("cart");
  const searchResults = portraits.filter((item) => `${item.label} ${item.kind} ${item.note}`.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredPortraits = searchResults.filter((item) => filter === "All stories" || item.kind === filter);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from the URL's ?product= param on mount, not a derived-state loop
    if (new URLSearchParams(window.location.search).has("product")) setScreen("Store");
  }, []);
  const go = (next: Screen) => {
    if (next !== "Store" && new URLSearchParams(window.location.search).has("product")) {
      const params = new URLSearchParams(window.location.search);
      params.delete("product");
      window.history.replaceState(null, "", `${window.location.pathname}${params.size ? `?${params.toString()}` : ""}${window.location.hash}`);
    }
    setScreen(next); setMenuOpen(false); setSubmitted(false); setSearchOpen(false); if (next !== screen) setSearchTerm("");
  };
  const chooseSearch = (term: string) => {
    const query = term.trim();
    if (!query) return;
    setSearchTerm(query);
    setFilter("All stories");
    setRecentSearches((current) => [query, ...current.filter((item) => item.toLowerCase() !== query.toLowerCase())].slice(0, 5));
    if (screen === "Plays") setScreen("Discover");
    setSearchOpen(false);
  };
  const toggleSaved = (label: string) => setSaved((current) => current.includes(label) ? current.filter((item) => item !== label) : [...current, label]);
  const toggleLiked = (label: string) => setLiked((current) => current.includes(label) ? current.filter((item) => item !== label) : [...current, label]);
  const likePost = (label: string) => setLiked((current) => current.includes(label) ? current : [...current, label]);
  const toggleClipLiked = (title: string) => setLikedClips((current) => current.includes(title) ? current.filter((item) => item !== title) : [...current, title]);
  const likeClip = (title: string) => setLikedClips((current) => current.includes(title) ? current : [...current, title]);
  const addToCart = (productId: string, quantity = 1) => setCart((current) => {
    const existing = current.find((item) => item.productId === productId);
    if (existing) return current.map((item) => item.productId === productId ? { ...item, quantity: item.quantity + quantity } : item);
    return [...current, { productId, quantity }];
  });
  const updateCartQuantity = (productId: string, quantity: number) => setCart((current) => quantity <= 0 ? current.filter((item) => item.productId !== productId) : current.map((item) => item.productId === productId ? { ...item, quantity } : item));
  const removeFromCart = (productId: string) => setCart((current) => current.filter((item) => item.productId !== productId));
  const openCart = () => { setCartOpen(true); setCheckoutStep("cart"); };
  const placeOrder = () => setCheckoutStep("done");
  const startOverCart = () => { setCart([]); setCheckoutStep("cart"); setCartOpen(false); };

  return (
    <main className="community-preview">
      <aside className={`cp-sidebar ${menuOpen ? "is-open" : ""}`}>
        <Link className="cp-brand" href="/" aria-label="Catopia public homepage"><Image src="/images/catopia-mark.svg" alt="" width={38} height={38} /><span>catopia</span></Link>
        <p className="cp-side-label">THE NEIGHBORHOOD</p>
        <nav aria-label="Community preview sections">
          {navigation.map(({ name, icon: Icon }) => <button key={name} className={screen === name ? "cp-nav-item is-active" : "cp-nav-item"} onClick={() => go(name)}><Icon size={18} strokeWidth={1.7} /><span>{name}</span>{name === "Map" && <span className="cp-coming">PREVIEW</span>}</button>)}
        </nav>
        <div className="cp-side-rule" />
        <p className="cp-side-label">YOUR CORNER</p>
        <button aria-label="Create a story" className={screen === "Share a story" ? "cp-nav-item is-active" : "cp-nav-item"} onClick={() => go("Share a story")}><Plus size={19} strokeWidth={1.7} /><span>Create</span></button>
        <button aria-label="Your contributions" className={screen === "Profile" ? "cp-nav-item is-active" : "cp-nav-item"} onClick={() => go("Profile")}><Users size={18} strokeWidth={1.7} /><span>Your contributions</span></button>
        <div className="cp-side-spacer" />
        <button className={screen === "Review desk" ? "cp-admin-link is-active" : "cp-admin-link"} onClick={() => go("Review desk")}><ShieldCheck size={17} /><span>Master admin preview</span><ArrowUpRight size={14} /></button>
        <div className="cp-profile-chip"><span className="cp-avatar">P</span><span><b>Preview visitor</b><small>Sample account · not signed in</small></span><ChevronDown size={15} /></div>
      </aside>

      <section className={`cp-main ${screen === "Home" ? "is-home" : ""} ${screen === "Discover" ? "is-discover" : ""} ${screen === "Plays" ? "is-plays" : ""} ${screen === "Map" ? "is-map" : ""} ${screen === "PAW" ? "is-paw" : ""} ${screen === "Store" ? "is-store" : ""}`}>
        <header className="cp-topbar">
          <button className="cp-menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Close menu" : "Open menu"}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
          <div className="cp-breadcrumb"><span>Catopia</span><span>/</span><b>{screen === "Home" ? "Community" : screen}</b></div>
          <div className="cp-search-wrap">
            <label className="cp-search"><Search size={18} /><input aria-label={screen === "Store" ? "Search the concept store" : "Search cats, stories, and little moments"} placeholder={screen === "Store" ? "Search food, toys, litter…" : "Search cats, stories, and little moments"} value={searchTerm} onFocus={() => ["Home", "Discover", "Plays", "PAW"].includes(screen) && setSearchOpen(true)} onChange={(event) => setSearchTerm(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") chooseSearch(searchTerm); if (event.key === "Escape") setSearchOpen(false); }} /><kbd>⌘ K</kbd></label>
            {["Home", "Discover", "Plays", "PAW"].includes(screen) && searchOpen && <div className="cp-search-suggestions"><p>{recentSearches.length ? "RECENT SEARCHES" : "SUGGESTED SEARCHES"}</p>{(recentSearches.length ? recentSearches : ["Portrait", "Sighting", "Memory", "quiet afternoon", "curious visitor"]).map((term) => <button key={term} onMouseDown={(event) => event.preventDefault()} onClick={() => chooseSearch(term)}><Search size={15} /><span>{term}</span>{recentSearches.length > 0 && <small>Recent</small>}</button>)}</div>}
          </div>
          {screen === "Store" && <button className="cp-top-cart" aria-label="Open cart" onClick={openCart}><ShoppingCart size={18} />{cartCount > 0 && <span className="cp-top-cart-count">{cartCount}</span>}</button>}
          <button className="cp-top-avatar" aria-label="Open profile" onClick={() => go("Profile")}>P</button>
        </header>

        <div className="cp-content">
          {(screen === "Home") && <HomeFeedScreen items={searchResults} go={go} saved={saved} toggleSaved={toggleSaved} liked={liked} toggleLiked={toggleLiked} likePost={likePost} />}
          {screen === "Discover" && <ExploreScreen filtered={filteredPortraits} filter={filter} setFilter={setFilter} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />}
          {screen === "Plays" && <PlaysScreen liked={likedClips} toggleLiked={toggleClipLiked} likeClip={likeClip} />}
          {screen === "Map" && <MapScreen />}
          {screen === "PAW" && <PawScreen utcDay={utcDay} query={searchTerm} setQuery={setSearchTerm} />}
          {screen === "Store" && <StoreScreen query={searchTerm} cart={cart} cartOpen={cartOpen} checkoutStep={checkoutStep} onAddToCart={addToCart} onUpdateQuantity={updateCartQuantity} onRemoveFromCart={removeFromCart} onCloseCart={() => setCartOpen(false)} onGoToCheckout={() => setCheckoutStep("details")} onBackToCart={() => setCheckoutStep("cart")} onPlaceOrder={placeOrder} onStartOver={startOverCart} />}
          {screen === "Share a story" && <SubmitScreen storyKind={storyKind} setStoryKind={setStoryKind} publicName={publicName} setPublicName={setPublicName} submitted={submitted} setSubmitted={setSubmitted} />}
          {screen === "Saved" && <SavedScreen saved={saved} toggleSaved={toggleSaved} go={go} />}
          {screen === "Profile" && <ProfileScreen savedCount={saved.length} go={go} />}
          {screen === "Review desk" && <AdminScreen role={role} setRole={setRole} />}
        </div>
        <nav className="cp-mobile-nav" aria-label="Mobile community navigation">
          {([{ name: "Home" as Screen, icon: Home }, { name: "Discover" as Screen, icon: Compass }, { name: "Plays" as Screen, icon: Clapperboard }, { name: "Map" as Screen, icon: Map }, { name: "Share a story" as Screen, icon: Plus }, { name: "Profile" as Screen, icon: Users }]).map(({ name, icon: Icon }) => <button key={name} aria-label={name === "Share a story" ? "Create" : name} className={screen === name ? "is-active" : ""} onClick={() => go(name)}><Icon size={20} /></button>)}
        </nav>
        <footer className="cp-footer"><span>CATOPIA · COMMUNITY DESIGN PREVIEW</span><span>Sample portraits are not real Catopia profiles.</span></footer>
      </section>
    </main>
  );
}

function ScreenHeading({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy: string; action?: React.ReactNode }) {
  return <div className="cp-page-heading"><div><p className="cp-eyebrow">{eyebrow}</p><h1>{title}</h1><p className="cp-lead">{copy}</p></div>{action}</div>;
}

function PhotoCard({ item, saved, toggleSaved, onClick, layoutDuplicate = false }: { item: typeof portraits[number]; saved?: boolean; toggleSaved?: () => void; onClick?: () => void; layoutDuplicate?: boolean }) {
  return <article className="cp-photo-card"><button className="cp-photo-button" onClick={onClick} aria-label={`Open ${item.label}${layoutDuplicate ? ", repeated layout sample" : ""}`}><div className="cp-photo-wrap"><Image src={item.image} alt={`${item.label}, sample cat portrait${layoutDuplicate ? ", repeated for layout preview" : ""}`} fill sizes="(max-width: 700px) 80vw, 28vw" /><span className="cp-sample-pill">{layoutDuplicate ? "REPEAT · SAMPLE" : "SAMPLE"}</span></div></button><div className="cp-photo-copy"><div className="cp-photo-meta"><span>{item.kind}</span><span>PORTRAIT STUDY</span></div><h3>{item.note}</h3><div className="cp-photo-bottom"><span>{layoutDuplicate ? "REPEATED · LAYOUT PREVIEW" : "DYPIU AREA · CONCEPT"}</span>{toggleSaved && <button className={saved ? "cp-icon-button saved" : "cp-icon-button"} onClick={toggleSaved} aria-label={saved ? "Remove saved story" : "Save story"}>{saved ? <Heart size={16} fill="currentColor" /> : <Bookmark size={16} />}</button>}</div></div></article>;
}

function HomeFeedScreen({ items, go, saved, toggleSaved, liked, toggleLiked, likePost }: { items: typeof portraits; go: (screen: Screen) => void; saved: string[]; toggleSaved: (label: string) => void; liked: string[]; toggleLiked: (label: string) => void; likePost: (label: string) => void }) {
  return <div className="cp-community-layout">
    <div className="cp-home-feed">
      <div className="cp-stories-rail" aria-label="Sample cat moments">
        <button className="cp-story-bubble cp-your-story" onClick={() => go("Share a story")}><span className="cp-story-avatar your-avatar"><Users size={23} /><i><Plus size={12} /></i></span><span>Your moment</span></button>
        {portraits.map((item, index) => <button key={item.label} className="cp-story-bubble" onClick={() => document.getElementById(`cp-post-${index}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}><span className="cp-story-avatar"><Image src={item.image} alt="" fill sizes="76px" /></span><span>Study {String(index + 1).padStart(2, "0")}</span></button>)}
      </div>
      <div className="cp-post-feed">{items.map((item) => {
        const index = portraits.indexOf(item);
        return <Post key={item.label} item={item} index={index} isLiked={liked.includes(item.label)} isSaved={saved.includes(item.label)} toggleLiked={() => toggleLiked(item.label)} likePost={() => likePost(item.label)} toggleSaved={() => toggleSaved(item.label)} go={go} />;
      })}</div>
      <p className="cp-feed-endnote">You’re all caught up on the sample field notes.</p>
    </div>
      <aside className="cp-discovery-rail" aria-label="More sample cat portraits">
      <button className="cp-visitor-row" onClick={() => go("Profile")}><span className="cp-visitor-avatar">P</span><span><b>Preview visitor</b><small>Your Catopia corner</small></span><strong>Profile</strong></button>
      <div className="cp-discovery-heading"><b>A few more faces</b><span>SAMPLE SET</span></div>
      {portraits.slice(1, 5).map((item) => <div className="cp-discovery-item" key={item.label}><span className="cp-discovery-avatar"><Image src={item.image} alt="" fill sizes="38px" /></span><span><b>{item.label}</b><small>Portrait study · sample</small></span><button onClick={() => go("PAW")}>PAW</button></div>)}
      <p className="cp-discovery-note">Portrait studies only. Cat pages will appear after identities and permissions are reviewed.</p>
    </aside>
  </div>;
}

function Post({ item, index, isLiked, isSaved, toggleLiked, likePost, toggleSaved, go }: { item: typeof portraits[number]; index: number; isLiked: boolean; isSaved: boolean; toggleLiked: () => void; likePost: () => void; toggleSaved: () => void; go: (screen: Screen) => void }) {
  return <article className="cp-post" id={`cp-post-${index}`}>
    <header className="cp-post-header"><button className="cp-post-user" onClick={() => go("PAW")}><span className="cp-post-avatar"><Image src={item.image} alt="" fill sizes="38px" /></span><span><b>{item.label}</b><small>DYPIU area · sample place</small></span></button><span className="cp-post-kind">{item.kind}</span><button className="cp-post-more" aria-label="Post options unavailable in preview" disabled><MoreHorizontal size={20} /></button></header>
    <LikeSurface className="cp-post-media" label={`Like ${item.label} with a double tap`} onLike={likePost}><Image src={item.image} alt={`${item.label}, reference portrait study`} fill sizes="(max-width: 760px) 100vw, 620px" /><span className="cp-sample-pill">PORTRAIT STUDY</span></LikeSurface>
    <div className="cp-post-actions"><div><button className={isLiked ? "cp-post-action is-liked" : "cp-post-action"} onClick={toggleLiked} aria-label={isLiked ? "Unlike sample post" : "Like sample post"}><Heart size={22} fill={isLiked ? "currentColor" : "none"} /></button><button className="cp-post-action" disabled title="Comments will be designed in a later phase" aria-label="Comments not available in preview"><MessageCircle size={21} /></button><button className="cp-post-action" disabled title="Sharing will be available after launch" aria-label="Share not available in preview"><Send size={20} /></button></div><button className={isSaved ? "cp-post-action is-saved" : "cp-post-action"} onClick={toggleSaved} aria-label={isSaved ? "Remove sample post from Saved" : "Save sample post for this preview"}><Bookmark size={21} fill={isSaved ? "currentColor" : "none"} /></button></div>
    <div className="cp-post-caption"><b>{item.label}</b><span>{item.note}</span><small>{item.kind.toUpperCase()} · SAMPLE STORY · NOT A REAL CATOPIA RECORD</small></div>
  </article>;
}

function FilterBar({ filter, setFilter }: { filter: string; setFilter: (filter: string) => void }) {
  return <div className="cp-filter-row"><div className="cp-filter-chips">{["All stories", ...kinds].map((kind) => <button key={kind} className={filter === kind ? "cp-filter is-active" : "cp-filter"} onClick={() => setFilter(kind)}>{kind === "All stories" ? "Everything" : kind}</button>)}</div></div>;
}

function ExploreScreen({ filtered, filter, setFilter, searchTerm, setSearchTerm }: { filtered: typeof portraits; filter: string; setFilter: (filter: string) => void; searchTerm: string; setSearchTerm: (term: string) => void }) {
  const showLayoutRepeats = !searchTerm && filter === "All stories";
  const gridItems = [
    ...filtered.map((item, index) => ({ item, key: `${item.label}-original-${index}`, duplicate: false })),
    ...(showLayoutRepeats ? [1, 2].flatMap((repeat) => filtered.map((item, index) => ({ item, key: `${item.label}-repeat-${repeat}-${index}`, duplicate: true }))) : []),
  ];
  return <div className="cp-discover-page"><div className="cp-discover-toolbar"><FilterBar filter={filter} setFilter={setFilter} /></div>{searchTerm && <div className="cp-search-status"><span>RESULTS FOR <b>{searchTerm}</b></span><button onClick={() => setSearchTerm("")}>Clear search</button></div>}{filtered.length === 0 ? <div className="cp-empty-state"><Search size={20} /><p>No sample stories match “{searchTerm || filter}”.</p><button className="cp-text-action" onClick={() => { setSearchTerm(""); setFilter("All stories"); }}>Clear filters <ArrowRight size={15} /></button></div> : <div className="cp-feed-grid">{gridItems.map(({ item, key, duplicate }) => <PhotoCard key={key} item={item} layoutDuplicate={duplicate} />)}</div>}</div>;
}

const MAP_CENTER: [number, number] = [73.7602, 18.6460];
const INITIAL_FETCH_RADIUS_DEG = 0.045;
const SEARCH_AREA_THRESHOLD_DEG = 0.02;

type GeocodeResult = { name: string; label: string; center: [number, number] };

function haversineDeg(a: [number, number], b: [number, number]) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function MapScreen() {
  const [activeCategories, setActiveCategories] = useState<PlaceCategory[]>([]);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [geocodeResults, setGeocodeResults] = useState<GeocodeResult[]>([]);
  const [message, setMessage] = useState("");
  const [style, setStyle] = useState<MapTheme>("positron");
  const [themeOpen, setThemeOpen] = useState(false);
  const [command, setCommand] = useState<{ kind: "zoom-in" | "zoom-out" | "center" | "fly"; seq: number; center?: [number, number] }>({ kind: "center", seq: 0 });
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
    setMessage("Finding nearby cat-related places…");
    const bbox = { south: center[1] - INITIAL_FETCH_RADIUS_DEG, west: center[0] - INITIAL_FETCH_RADIUS_DEG, north: center[1] + INITIAL_FETCH_RADIUS_DEG, east: center[0] + INITIAL_FETCH_RADIUS_DEG };
    const found = await fetchOsmPlaces(bbox);
    setOsmPlaces(found);
    setLastFetchCenter(center);
    setPlacesLoading(false);
    setMessage(found.length ? "" : "No verified places found here yet from OpenStreetMap. Showing sample concept places only.");
  };

  useEffect(() => {
    // Genuine data fetch on mount; "Search this area" re-triggers this intentionally via loadPlacesNear itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
    loadPlacesNear(MAP_CENTER);
  }, []);

  const allPlaces = useMemo(() => [...osmPlaces, ...SAMPLE_PLACES], [osmPlaces]);
  const categoryFiltered = useMemo(() => activeCategories.length === 0 ? allPlaces : allPlaces.filter((place) => activeCategories.includes(place.category)), [allPlaces, activeCategories]);
  const visiblePlaces = useMemo(() => showSavedOnly ? categoryFiltered.filter((place) => savedPlaceIds.includes(place.id)) : categoryFiltered, [categoryFiltered, showSavedOnly, savedPlaceIds]);
  const selectedPlace = useMemo(() => allPlaces.find((place) => place.id === selectedPlaceId) ?? null, [allPlaces, selectedPlaceId]);
  const placeMatches = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (query.length < 2) return [];
    return allPlaces.filter((place) => `${place.name} ${CATEGORY_META[place.category].label}`.toLowerCase().includes(query)).slice(0, 5);
  }, [search, allPlaces]);

  const toggleCategory = (category: PlaceCategory) => setActiveCategories((current) => current.includes(category) ? current.filter((item) => item !== category) : [...current, category]);
  const selectPlace = (id: string | null) => { setSelectedPlaceId(id); if (id) setSheetState("half"); };
  const toggleSavedPlace = (id: string) => setSavedPlaceIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const submitReview = (placeId: string, rating: number, text: string) => setReviews((current) => [...current, { id: `review-${Date.now()}`, placeId, author: "Preview visitor", rating, text, date: new Date().toISOString() }]);

  const runSearch = async () => {
    const query = search.trim().toLowerCase();
    if (!query) return;
    if (["akurdi", "dypiu", "pune", "dy patil"].some((term) => query.includes(term))) {
      setCommand((current) => ({ kind: "fly", seq: current.seq + 1, center: MAP_CENTER }));
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
  const chooseGeocodeResult = (result: GeocodeResult) => {
    setCommand((current) => ({ kind: "fly", seq: current.seq + 1, center: result.center }));
    selectPlace(null);
    setGeocodeResults([]);
    setSearch("");
  };
  const choosePlaceResult = (place: Place) => {
    setCommand((current) => ({ kind: "fly", seq: current.seq + 1, center: [place.lng, place.lat] }));
    selectPlace(place.id);
    setGeocodeResults([]);
    setSearch("");
  };
  const locate = () => {
    if (!navigator.geolocation) { setMessage("Location access is unavailable in this browser."); return; }
    setMessage("Requesting your location…");
    navigator.geolocation.getCurrentPosition(({ coords }) => { setCommand((current) => ({ kind: "fly", seq: current.seq + 1, center: [coords.longitude, coords.latitude] })); setMessage("Centered on your location. Your coordinates are not saved."); }, () => setMessage("Location wasn’t shared. The map stays on the DYPIU Akurdi area."), { enableHighAccuracy: false, timeout: 8000 });
  };
  const zoom = (kind: "zoom-in" | "zoom-out") => setCommand((current) => ({ kind, seq: current.seq + 1 }));
  const handleReport = () => setMessage("Thanks for the note — reports stay in this preview and aren’t sent anywhere yet.");
  const handleMapMoved = (center: [number, number]) => { if (haversineDeg(center, lastFetchCenter) > SEARCH_AREA_THRESHOLD_DEG) setShowSearchArea(true); };
  const toggleSavedOnly = () => {
    const next = !showSavedOnly;
    setShowSavedOnly(next);
    if (next && savedPlaceIds.length === 0) setMessage("You haven’t saved any places yet. Open a place and tap Save.");
  };

  const showResults = placeMatches.length > 0 || geocodeResults.length > 0;
  return <section className="cp-cat-map-page">
    <InteractiveMap styleName={style} command={command} places={visiblePlaces} selectedId={selectedPlaceId} onSelectPlace={selectPlace} onMapMoved={handleMapMoved} />
    <div className="cp-map-top-float">
      <div className="cp-map-search-panel"><Link className="cp-map-brand" href="/" aria-label="Catopia home"><Image src="/images/catopia-mark.svg" alt="" width={30} height={30} /><b>catopia</b></Link><div className="cp-map-search"><Search size={17} /><input id="map-place-search" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && runSearch()} placeholder="Search cat cafes, shelters, vets, streets…" aria-label="Search cat cafes, shelters, vets, streets or places" /><button aria-label="Search map" onClick={runSearch}><ArrowRight size={17} /></button></div><button className={showSavedOnly ? "cp-map-tool is-active" : "cp-map-tool"} aria-pressed={showSavedOnly} aria-label="Show only saved places" onClick={toggleSavedOnly}><Bookmark size={17} fill={showSavedOnly ? "currentColor" : "none"} /></button><button className="cp-map-tool" aria-label="Use my location" onClick={locate}><LocateFixed size={18} /></button><div className="cp-map-theme"><button className="cp-map-tool" aria-label="Choose terrain and map theme" aria-expanded={themeOpen} onClick={() => setThemeOpen((open) => !open)}><Layers size={18} /></button>{themeOpen && <div className="cp-map-theme-tray" role="menu" aria-label="Terrain and map themes"><p>TERRAIN &amp; MAP THEME</p>{mapThemes.map((theme) => <button key={theme.id} role="menuitemradio" aria-checked={style === theme.id} className={style === theme.id ? "is-active" : ""} onClick={() => { setStyle(theme.id); setThemeOpen(false); }}><span className="cp-theme-swatch" style={{ background: theme.swatch }} /><span><b>{theme.label}</b><small>{theme.note}</small></span>{style === theme.id && <Check size={13} />}</button>)}</div>}</div></div>
      {showResults && <div className="cp-map-search-results">
        {placeMatches.length > 0 && <p className="cp-map-results-group">PLACES</p>}
        {placeMatches.map((place) => { const Icon = CATEGORY_META[place.category].icon; return <button key={place.id} onClick={() => choosePlaceResult(place)}><Icon size={15} /><span><b>{place.name}</b><small>{CATEGORY_META[place.category].label}{place.address ? ` · ${place.address}` : ""}</small></span></button>; })}
        {geocodeResults.length > 0 && <p className="cp-map-results-group">LOCATIONS</p>}
        {geocodeResults.map((result, index) => <button key={`${result.name}-${index}`} onClick={() => chooseGeocodeResult(result)}><MapPin size={15} /><span><b>{result.name}</b><small>{result.label}</small></span></button>)}
      </div>}
      <div className="cp-map-filters" aria-label="Place category filters">
        <button className={activeCategories.length === 0 ? "is-active" : ""} aria-pressed={activeCategories.length === 0} onClick={() => setActiveCategories([])}>All</button>
        {CATEGORY_ORDER.map((category) => { const meta = CATEGORY_META[category]; const Icon = meta.icon; return <button key={category} className={activeCategories.includes(category) ? "is-active" : ""} aria-pressed={activeCategories.includes(category)} onClick={() => toggleCategory(category)}><Icon size={13} />{meta.label}</button>; })}
        {activeCategories.length > 0 && <button className="cp-map-filter-clear" onClick={() => setActiveCategories([])}>Clear all</button>}
      </div>
    </div>
    {showSearchArea && <button className="cp-map-search-area" onClick={() => loadPlacesNear(command.center ?? lastFetchCenter)}><RefreshCw size={14} /> Search this area</button>}
    <div className="cp-map-zoom"><button aria-label="Zoom in" onClick={() => zoom("zoom-in")}>+</button><button aria-label="Zoom out" onClick={() => zoom("zoom-out")}>−</button></div>
    <button className="cp-map-add" onClick={() => setMessage("Sighting submissions will open when private uploads and moderator review are connected.")}><Plus size={17} /> Add a sighting</button>
    <div className="cp-map-privacy-note"><ShieldCheck size={14} /> Public map locations are approximate. Sensitive cat locations stay private.</div>
    {themeOpen && <button className="cp-map-theme-backdrop" aria-label="Close map theme menu" onClick={() => setThemeOpen(false)} />}
    {message && <div className="cp-map-message" role="status">{message}<button aria-label="Dismiss message" onClick={() => setMessage("")}><X size={14} /></button></div>}
    <span className="cp-map-attribution-note">{placesLoading ? "Loading nearby places…" : "Map data © OpenStreetMap · OpenFreeMap"}</span>
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

function PlaysScreen({ liked, toggleLiked, likeClip }: { liked: string[]; toggleLiked: (title: string) => void; likeClip: (title: string) => void }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [frameBounds, setFrameBounds] = useState({ width: 700, height: 780 });
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const compact = window.matchMedia("(max-width: 760px)").matches;
      setFrameBounds({ width: Math.max(180, entry.contentRect.width - (compact ? 54 : 112)), height: Math.max(240, entry.contentRect.height - 8) });
    });
    observer.observe(scroller);
    return () => observer.disconnect();
  }, []);
  return <section className="cp-plays-page">
    <div className="cp-reel-scroll" id="cp-reel-scroll" ref={scrollerRef} aria-label="Scrollable cat reels">{sampleClips.map((clip, index) => {
      const [ratioWidth, ratioHeight] = clip.ratio.split("/").map(Number);
      const ratio = ratioWidth / ratioHeight;
      const frameHeight = Math.min(frameBounds.height, frameBounds.width / ratio);
      const frameWidth = frameHeight * ratio;
      return <article className="cp-reel-slide" id={`cp-reel-${index}`} key={clip.title}>
      <div className="cp-reel-stage">
        <div className="cp-reel-visual" style={{ width: frameWidth, height: frameHeight }}>
          <div className="cp-reel-ambient" aria-hidden="true" style={{ backgroundImage: `url(${clip.image})` }} />
          <LikeSurface className="cp-reel-frame" label={`Like “${clip.title}” with a double tap`} onLike={() => likeClip(clip.title)} frameStyle={{ width: "100%", height: "100%" }}>
            <Image src={clip.image} alt={`Sample still for “${clip.title}”`} fill sizes="(max-width: 760px) 78vw, 560px" style={{ objectFit: "contain" }} />
            <span className="cp-play-sample">SAMPLE STILL · {clip.ratio.replace(" / ", ":")}</span>
            <span className="cp-reel-caption"><span className="cp-play-avatar"><Image src={clip.image} alt="" fill sizes="30px" /></span><span><b>{clip.by}</b><small>{clip.title} · {index % 2 === 0 ? "Portrait" : "Sighting"} sample</small></span></span>
          </LikeSurface>
        </div>
        <div className="cp-reel-actions" aria-label={`Actions for ${clip.title}`}>
          <button className={liked.includes(clip.title) ? "is-liked" : ""} aria-label={liked.includes(clip.title) ? "Unlike reel" : "Like reel"} onClick={() => toggleLiked(clip.title)}><Heart size={24} fill={liked.includes(clip.title) ? "currentColor" : "none"} /></button><small>Like</small>
          <button aria-label="Comments unavailable in preview" disabled><MessageCircle size={23} /></button><small>Notes</small>
          <button aria-label="Save reel unavailable in preview" disabled><Bookmark size={22} /></button><small>Keep</small>
        </div>
      </div>
    </article>;
    })}</div>
    <div className="cp-reel-navigation" aria-label="Reel navigation"><button className="cp-reel-step cp-reel-previous" aria-label="Previous reel" onClick={() => { const scroller = document.getElementById("cp-reel-scroll"); scroller?.scrollBy({ top: -(scroller.clientHeight + 8), behavior: "smooth" }); }}><ChevronDown size={20} /></button><button className="cp-reel-step cp-reel-next" aria-label="Next reel" onClick={() => { const scroller = document.getElementById("cp-reel-scroll"); scroller?.scrollBy({ top: scroller.clientHeight + 8, behavior: "smooth" }); }}><ChevronDown size={20} /></button></div>
  </section>;
}

function LikeSurface({ className, label, onLike, ratio, frameStyle, children }: { className: string; label: string; onLike: () => void; ratio?: string; frameStyle?: React.CSSProperties; children: React.ReactNode }) {
  const [burst, setBurst] = useState(false);
  const lastTap = useRef(0);
  const burstTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (burstTimer.current) clearTimeout(burstTimer.current); }, []);
  const likeWithBurst = () => {
    onLike();
    setBurst(true);
    if (burstTimer.current) clearTimeout(burstTimer.current);
    burstTimer.current = setTimeout(() => setBurst(false), 850);
  };
  const handleClick = () => {
    const now = Date.now();
    if (now - lastTap.current < 320) likeWithBurst();
    lastTap.current = now;
  };
  return <button type="button" className={className} style={{ ...(ratio ? { aspectRatio: ratio } : {}), ...frameStyle }} aria-label={label} onClick={(event) => { if (event.detail === 0) likeWithBurst(); else handleClick(); }}>{children}{burst && <span className="cp-heart-burst" aria-hidden="true"><Heart size={88} fill="currentColor" /></span>}</button>;
}

function SubmitScreen({ storyKind, setStoryKind, publicName, setPublicName, submitted, setSubmitted }: { storyKind: StoryKind; setStoryKind: (kind: StoryKind) => void; publicName: boolean; setPublicName: (value: boolean) => void; submitted: boolean; setSubmitted: (value: boolean) => void }) {
  return <><ScreenHeading eyebrow="A MOMENT YOU'D LIKE TO KEEP" title="Share a little story." copy="A future submission flow for sightings, portraits, and memories. This preview does not upload or save anything." /><div className="cp-submit-layout"><form className="cp-submit-form" onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}><label className="cp-form-label">What kind of story is it?</label><div className="cp-kind-options">{kinds.map((kind) => <button type="button" key={kind} className={storyKind === kind ? "is-active" : ""} onClick={() => setStoryKind(kind)}>{kind}</button>)}</div><label className="cp-form-label" htmlFor="story-note">Your note</label><textarea id="story-note" placeholder="A few words about the moment..." rows={5} /><label className="cp-form-label">Add a photo <span>Optional</span></label><button className="cp-upload-placeholder" type="button"><Upload size={19} /><b>Choose a photo</b><small>Image upload will be available when Catopia is connected.</small></button><label className="cp-form-label">Your name on this story</label><button className="cp-privacy-choice" type="button" aria-pressed={publicName} onClick={() => setPublicName(!publicName)}><span><b>{publicName ? "Show my name" : "Keep me anonymous"}</b><small>{publicName ? "You chose to display your name publicly." : "Recommended. You can choose to show your name instead."}</small></span><span className={publicName ? "cp-toggle is-on" : "cp-toggle"}><i /></span></button><button className="cp-button cp-button-dark cp-submit-button" type="submit">Preview submission <ArrowRight size={16} /></button>{submitted && <p className="cp-form-notice"><Check size={16} /> Preview only. Nothing was uploaded or saved.</p>}</form><aside className="cp-submit-aside"><div className="cp-aside-icon"><ShieldCheck size={20} /></div><h3>Reviewed with care.</h3><p>In the live product, your submission would stay private while an admin reviews its text, photo permission, identity, and location details.</p><ul><li>No precise locations in public view</li><li>Photo permission is required</li><li>Cat identities are reviewed by a person</li></ul><span>ANONYMITY IS ENCOURAGED · YOUR CHOICE IS YOURS</span></aside></div></>;
}

function ProfileScreen({ savedCount, go }: { savedCount: number; go: (screen: Screen) => void }) {
  return <><ScreenHeading eyebrow="YOUR QUIET CORNER" title="Your contributions." copy="A future place to track submissions and manage your privacy. This visitor profile is only a visual preview." /><div className="cp-profile-preview"><div className="cp-large-avatar">P</div><div><p className="cp-eyebrow">PREVIEW VISITOR</p><h2>Your name stays yours.</h2><p>By default, your public contributions can stay anonymous. You can choose to show your name on any story you share.</p></div><button className="cp-button cp-button-light" onClick={() => go("Share a story")}>Share a story <ArrowRight size={15} /></button></div><div className="cp-section-row"><div><p className="cp-eyebrow">YOUR ACTIVITY</p><h2>{savedCount} saved stories</h2></div></div><div className="cp-empty-state"><Bookmark size={20} /><p>Saved stories and submission states will appear here.</p><button className="cp-text-action" onClick={() => go("Saved")}>View saved stories <ArrowRight size={15} /></button></div></>;
}

function SavedScreen({ saved, toggleSaved, go }: { saved: string[]; toggleSaved: (label: string) => void; go: (screen: Screen) => void }) {
  const items = portraits.filter((item) => saved.includes(item.label));
  return <><ScreenHeading eyebrow="KEPT FOR LATER" title="Saved field notes." copy="Saved items in this design preview stay in the current page session only." />{items.length ? <div className="cp-feed-grid">{items.map((item) => <PhotoCard key={item.label} item={item} saved toggleSaved={() => toggleSaved(item.label)} />)}</div> : <div className="cp-empty-state"><Bookmark size={20} /><p>You haven’t saved a sample story in this preview.</p><button className="cp-text-action" onClick={() => go("Home")}>Return to the community feed <ArrowRight size={15} /></button></div>}</>;
}

function AdminScreen({ role, setRole }: { role: string; setRole: (role: string) => void }) {
  return <><ScreenHeading eyebrow="PRIVATE ADMIN SPACE · CONCEPT" title="A careful review desk." copy="The master admin has full access and can assign limited roles to sub-admins. This screen demonstrates the proposed shape only." /><div className="cp-admin-banner"><ShieldCheck size={21} /><span><b>Master admin</b><small>Full access · role assignment · audit review</small></span><span className="cp-role-badge">MASTER ACCESS</span></div><div className="cp-admin-grid"><section className="cp-admin-panel"><div className="cp-panel-heading"><div><p className="cp-eyebrow">DELEGATED ACCESS</p><h2>Sub-admin roles</h2></div><button className="cp-button cp-button-light" onClick={() => setRole(role === "Story reviewer" ? "Photo reviewer" : "Story reviewer")}>Change role <ChevronDown size={14} /></button></div><div className="cp-role-row"><span className="cp-avatar">A</span><div><b>Preview sub-admin</b><small>Sample role · not an actual account</small></div><select aria-label="Sub-admin role" value={role} onChange={(event) => setRole(event.target.value)}><option>Story reviewer</option><option>Photo reviewer</option><option>Location privacy reviewer</option><option>Read-only auditor</option></select></div><div className="cp-permission-list"><p className="cp-eyebrow">ROLE PREVIEW · {role.toUpperCase()}</p>{["View pending submissions", "Edit public story copy", "Approve reviewed stories", "Manage admin roles"].map((permission, index) => <span key={permission} className={index < (role === "Read-only auditor" ? 1 : 3) ? "allowed" : "denied"}>{index < (role === "Read-only auditor" ? 1 : 3) ? <Check size={14} /> : <X size={14} />}{permission}</span>)}</div></section><section className="cp-admin-panel cp-queue-panel"><p className="cp-eyebrow">REVIEW QUEUE · SAMPLE</p><h2>One story to look over.</h2><div className="cp-queue-item"><div className="cp-queue-thumb"><Image src="/images/cats/portrait-calico.webp" alt="Sample portrait study" fill sizes="80px" /></div><div><b>Portrait study submission</b><small>Portrait · private by default</small><small>Location details hidden in preview</small></div><Flag size={16} /></div><div className="cp-queue-actions"><button onClick={(event) => { event.currentTarget.textContent = "Marked for review"; }}><Search size={14} /> Review sample</button><button onClick={(event) => { event.currentTarget.textContent = "Preview only"; }}><Check size={14} /> Approve preview</button></div><small className="cp-admin-disclaimer">Buttons change this local preview only; no data or permissions are saved.</small></section></div></>;
}
