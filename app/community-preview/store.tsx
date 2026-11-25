"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, LayoutGrid, ArrowRight, Check, ChevronDown, ChevronRight, Heart, Minus, Package, PackageCheck, Plus, ShoppingBag, SlidersHorizontal, Trash2, Truck, X } from "lucide-react";
import StoreHero, { type HeroAction } from "./store-hero";
import DotGrid from "./react-bits/DotGrid";
import ProductPage from "./product-page";
import ProductStrip from "./product-strip";
import { COLOR_SWATCHES, FILTER_SECTION_ICONS, SUBCATEGORY_ICONS, PRODUCT_CATEGORY_META, PRODUCT_CATEGORY_ORDER, PRODUCTS, SORT_OPTIONS, formatPrice, type CartItem, type CheckoutStep, type Product, type ProductCategory, type SortOption } from "./store-data";

function FilterSection({ index, icon: Icon, title, children }: { index: number; icon: LucideIcon; title: string; children: ReactNode }) {
  return <section className="cp-filter-section" style={{ "--i": index } as CSSProperties}>
    <h3><span className="cp-filter-section-icon"><Icon size={16} /></span>{title}</h3>
    {children}
  </section>;
}

function countBy(products: Product[], pick: (product: Product) => string | undefined) {
  const counts = new Map<string, number>();
  for (const product of products) { const value = pick(product); if (value) counts.set(value, (counts.get(value) ?? 0) + 1); }
  return [...counts.entries()];
}

function toggleValue(list: string[], value: string, setter: (next: string[]) => void) {
  setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
}

export default function StoreScreen({ query, cart, cartOpen, checkoutStep, onAddToCart, onUpdateQuantity, onRemoveFromCart, onCloseCart, onGoToCheckout, onBackToCart, onPlaceOrder, onStartOver }: {
  query: string;
  cart: CartItem[];
  cartOpen: boolean;
  checkoutStep: CheckoutStep;
  onAddToCart: (productId: string, quantity?: number) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onCloseCart: () => void;
  onGoToCheckout: () => void;
  onBackToCart: () => void;
  onPlaceOrder: () => void;
  onStartOver: () => void;
}) {
  const [activeCategory, setActiveCategory] = useState<ProductCategory | "all">("all");
  const [activeSubcategories, setActiveSubcategories] = useState<string[]>([]);
  const [activeLifeStages, setActiveLifeStages] = useState<string[]>([]);
  const [activeMaterials, setActiveMaterials] = useState<string[]>([]);
  const [activeSizes, setActiveSizes] = useState<string[]>([]);
  const [activeColors, setActiveColors] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState<number | "">("");
  const [priceMax, setPriceMax] = useState<number | "">("");
  const [expandedCategory, setExpandedCategory] = useState<ProductCategory | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>("featured");
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [addedNotice, setAddedNotice] = useState(false);

  useEffect(() => {
    const syncProductFromUrl = () => setSelectedProductId(new URLSearchParams(window.location.search).get("product"));
    syncProductFromUrl();
    window.addEventListener("popstate", syncProductFromUrl);
    return () => window.removeEventListener("popstate", syncProductFromUrl);
  }, []);

  useEffect(() => {
    if (!filtersOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setFiltersOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown); };
  }, [filtersOpen]);

  const openProduct = (product: Product) => {
    const params = new URLSearchParams(window.location.search);
    params.set("product", product.id);
    window.history.pushState(null, "", `${window.location.pathname}?${params.toString()}`);
    setSelectedProductId(product.id);
    window.scrollTo({ top: 0 });
    setDetailQuantity(1);
    setAddedNotice(false);
  };
  const closeProduct = () => {
    const params = new URLSearchParams(window.location.search);
    params.delete("product");
    const nextUrl = `${window.location.pathname}${params.size ? `?${params.toString()}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", nextUrl);
    setSelectedProductId(null);
  };

  const categoryCounts = useMemo(() => {
    const counts = new Map<ProductCategory, number>();
    for (const product of PRODUCTS) counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
    return counts;
  }, []);
  const inStockCount = useMemo(() => PRODUCTS.filter((product) => product.inStock).length, []);
  const catalogPriceBounds = useMemo(() => ({ min: Math.min(...PRODUCTS.map((product) => product.price)), max: Math.max(...PRODUCTS.map((product) => product.price)) }), []);
  const priceRanges = useMemo(() => {
    const ranges: { label: string; min?: number; max?: number; count: number }[] = [
      { label: "Under ₹500", max: 499, count: PRODUCTS.filter((product) => product.price < 500).length },
      { label: "₹500 – ₹1,499", min: 500, max: 1499, count: PRODUCTS.filter((product) => product.price >= 500 && product.price < 1500).length },
      { label: "₹1,500 & up", min: 1500, count: PRODUCTS.filter((product) => product.price >= 1500).length },
    ];
    return ranges.filter((range) => range.count > 0);
  }, []);
  const priceSpan = Math.max(1, catalogPriceBounds.max - catalogPriceBounds.min);
  const priceTrackLow = Math.min(100, Math.max(0, (((priceMin === "" ? catalogPriceBounds.min : priceMin) - catalogPriceBounds.min) / priceSpan) * 100));
  const priceTrackHigh = Math.min(100, Math.max(0, (((priceMax === "" ? catalogPriceBounds.max : priceMax) - catalogPriceBounds.min) / priceSpan) * 100));
  const priceTrackStyle: CSSProperties = { left: priceTrackLow + "%", right: Math.max(0, 100 - priceTrackHigh) + "%" };

  // Scoped to the current category/subcategory selection only, so facets like Life Stage,
  // Material, Size and Colour never show a value or count with zero matching products.
  const categoryScoped = useMemo(() => PRODUCTS.filter((product) =>
    (activeCategory === "all" || product.category === activeCategory)
    && (activeSubcategories.length === 0 || activeSubcategories.includes(product.subcategory))), [activeCategory, activeSubcategories]);
  const lifeStageOptions = useMemo(() => countBy(categoryScoped, (product) => product.lifeStage), [categoryScoped]);
  const materialOptions = useMemo(() => countBy(categoryScoped, (product) => product.material), [categoryScoped]);
  const sizeOptions = useMemo(() => countBy(categoryScoped, (product) => product.size), [categoryScoped]);
  const colorOptions = useMemo(() => countBy(categoryScoped, (product) => product.color), [categoryScoped]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = PRODUCTS.filter((product) =>
      (activeCategory === "all" || product.category === activeCategory)
      && (activeSubcategories.length === 0 || activeSubcategories.includes(product.subcategory))
      && (!q || `${product.name} ${product.description}`.toLowerCase().includes(q))
      && (priceMin === "" || product.price >= priceMin)
      && (priceMax === "" || product.price <= priceMax)
      && (activeLifeStages.length === 0 || (!!product.lifeStage && activeLifeStages.includes(product.lifeStage)))
      && (activeMaterials.length === 0 || (!!product.material && activeMaterials.includes(product.material)))
      && (activeSizes.length === 0 || (!!product.size && activeSizes.includes(product.size)))
      && (activeColors.length === 0 || (!!product.color && activeColors.includes(product.color)))
      && (!inStockOnly || product.inStock));
    const sorted = [...list];
    if (sortOption === "price-asc") sorted.sort((a, b) => a.price - b.price);
    else if (sortOption === "price-desc") sorted.sort((a, b) => b.price - a.price);
    else if (sortOption === "name-asc") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortOption === "newest") sorted.reverse();
    return sorted;
  }, [activeCategory, activeSubcategories, query, priceMin, priceMax, activeLifeStages, activeMaterials, activeSizes, activeColors, inStockOnly, sortOption]);

  const cartLines = useMemo(() => cart.flatMap((item) => {
    const product = PRODUCTS.find((candidate) => candidate.id === item.productId);
    return product ? [{ item, product }] : [];
  }), [cart]);
  const cartTotal = cartLines.reduce((sum, { item, product }) => sum + product.price * item.quantity, 0);
  const quantityOf = (productId: string) => cart.find((item) => item.productId === productId)?.quantity ?? 0;
  const selectedProduct = selectedProductId ? PRODUCTS.find((product) => product.id === selectedProductId) ?? null : null;
  const recommendations = useMemo(() => {
    if (!selectedProduct) return [];
    const others = PRODUCTS.filter((product) => product.id !== selectedProduct.id);
    const sameCategory = others.filter((product) => product.category === selectedProduct.category);
    const start = PRODUCTS.findIndex((product) => product.id === selectedProduct.id);
    const nearby = [...PRODUCTS.slice(start + 1), ...PRODUCTS.slice(0, start)].filter((product) => product.category !== selectedProduct.category);
    return [...sameCategory, ...nearby].slice(0, 5);
  }, [selectedProduct]);

  const toggleWishlist = (productId: string) => setWishlist((current) => current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]);

  const selectCategory = (category: ProductCategory | "all") => {
    setActiveCategory(category);
    setActiveSubcategories([]);
    setExpandedCategory(category === "all" ? null : category);
  };
  const toggleSubcategory = (category: ProductCategory, subcategory: string) => {
    if (activeCategory !== category) setActiveCategory(category);
    toggleValue(activeSubcategories, subcategory, setActiveSubcategories);
  };
  const scrollToCatalogue = () => {
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => document.getElementById("store-catalogue")?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" }));
  };
  const browseFromProduct = (category: ProductCategory, subcategory?: string) => {
    closeProduct();
    setActiveCategory(category);
    setActiveSubcategories(subcategory ? [subcategory] : []);
    setExpandedCategory(category);
    scrollToCatalogue();
  };
  const handleHeroAction = (action: HeroAction) => {
    if (action.kind === "category") selectCategory(action.category);
    scrollToCatalogue();
  };

  const activeFilterCount = (activeCategory !== "all" ? 1 : 0) + activeSubcategories.length + activeLifeStages.length + activeMaterials.length
    + activeSizes.length + activeColors.length + (inStockOnly ? 1 : 0) + (priceMin !== "" ? 1 : 0) + (priceMax !== "" ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;
  const browseMode = !hasActiveFilters && !query.trim();
  const clearAllFilters = () => {
    setActiveCategory("all"); setActiveSubcategories([]); setActiveLifeStages([]); setActiveMaterials([]);
    setActiveSizes([]); setActiveColors([]); setInStockOnly(false); setPriceMin(""); setPriceMax(""); setExpandedCategory(null);
  };
  const activeSortLabel = SORT_OPTIONS.find((option) => option.id === sortOption)?.label ?? "Featured";

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];
    if (activeCategory !== "all") chips.push({ key: "category", label: PRODUCT_CATEGORY_META[activeCategory].label, onRemove: () => selectCategory("all") });
    for (const subcategory of activeSubcategories) chips.push({ key: `sub-${subcategory}`, label: subcategory, onRemove: () => toggleValue(activeSubcategories, subcategory, setActiveSubcategories) });
    for (const stage of activeLifeStages) chips.push({ key: `stage-${stage}`, label: stage, onRemove: () => toggleValue(activeLifeStages, stage, setActiveLifeStages) });
    for (const material of activeMaterials) chips.push({ key: `material-${material}`, label: material, onRemove: () => toggleValue(activeMaterials, material, setActiveMaterials) });
    for (const size of activeSizes) chips.push({ key: `size-${size}`, label: `Size ${size}`, onRemove: () => toggleValue(activeSizes, size, setActiveSizes) });
    for (const color of activeColors) chips.push({ key: `color-${color}`, label: color, onRemove: () => toggleValue(activeColors, color, setActiveColors) });
    if (inStockOnly) chips.push({ key: "stock", label: "In stock only", onRemove: () => setInStockOnly(false) });
    if (priceMin !== "") chips.push({ key: "price-min", label: `Min ${formatPrice(priceMin)}`, onRemove: () => setPriceMin("") });
    if (priceMax !== "") chips.push({ key: "price-max", label: `Max ${formatPrice(priceMax)}`, onRemove: () => setPriceMax("") });
    return chips;
  }, [activeCategory, activeSubcategories, activeLifeStages, activeMaterials, activeSizes, activeColors, inStockOnly, priceMin, priceMax]);

  return (
    <section className="cp-store-page">
      {!selectedProductId && browseMode && <StoreHero onAction={handleHeroAction} />}

      {!selectedProductId && browseMode && <div className="cp-store-quickbar">
        <button className="cp-quick-filter" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={17} /> Filters{activeFilterCount > 0 && <span className="cp-store-filters-badge">{activeFilterCount}</span>}</button>
        <p>Narrow {PRODUCTS.length} products by category, price, size and more.</p>
      </div>}

      {!selectedProductId && browseMode && <div className="cp-store-categories" aria-label="Shop by category">
        <div className="cp-store-dots" aria-hidden="true"><DotGrid baseColor="#dedbc6" activeColor="#c86f50" dotSize={3} gap={22} proximity={110} shockRadius={200} shockStrength={3} swell={0.6} glow={0.2} opacity={0.9} intro={false} /></div>
        {PRODUCT_CATEGORY_ORDER.map((category) => <ProductStrip key={category} title={PRODUCT_CATEGORY_META[category].label} products={PRODUCTS.filter((product) => product.category === category)} onViewAll={() => { selectCategory(category); scrollToCatalogue(); }} onOpenProduct={openProduct} />)}<p className="cp-strip-note">Tile images are illustrative samples, not product listings.</p></div>}

      <div className="cp-store-result-row" id="store-catalogue">
        <div className="cp-store-controls">
          <button className="cp-store-filters-toggle" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={13} /> Filters{activeFilterCount > 0 && <span className="cp-store-filters-badge">{activeFilterCount}</span>}</button>
          <span className="cp-store-count">{filtered.length} product{filtered.length === 1 ? "" : "s"}</span>
        </div>
        <div className="cp-store-controls">
          <div className="cp-store-sort">
            <button className="cp-store-sort-toggle" aria-expanded={sortOpen} onClick={() => setSortOpen((open) => !open)}>Sort: {activeSortLabel} <ChevronDown size={14} /></button>
            {sortOpen && <div className="cp-store-sort-menu" role="menu" aria-label="Sort products">{SORT_OPTIONS.map((option) => <button key={option.id} role="menuitemradio" aria-checked={sortOption === option.id} className={sortOption === option.id ? "is-active" : ""} onClick={() => { setSortOption(option.id); setSortOpen(false); }}>{option.label}{sortOption === option.id && <Check size={13} />}</button>)}</div>}
          </div>
        </div>
      </div>

      {activeChips.length > 0 && <div className="cp-active-filters">{activeChips.map((chip) => <button key={chip.key} className="cp-active-chip" onClick={chip.onRemove}>{chip.label} <X size={11} /></button>)}<button className="cp-text-action cp-active-clear" onClick={clearAllFilters}>Clear all</button></div>}

      {sortOpen && <button className="cp-store-menu-backdrop" aria-label="Close sort menu" onClick={() => setSortOpen(false)} />}

      {filtersOpen && <button className="cp-filter-backdrop" aria-label="Close filters" onClick={() => setFiltersOpen(false)} />}
      <aside className={filtersOpen ? "cp-filter-drawer is-open" : "cp-filter-drawer"} role="dialog" aria-modal="true" aria-label="Filters">
        <div className="cp-filter-drawer-head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="cp-filter-mark" src="/images/catopia-mark.svg" alt="" width={34} height={34} />
          <div className="cp-filter-title">
            <h2>Filters</h2>
            <p>{filtered.length} product{filtered.length === 1 ? "" : "s"} match</p>
          </div>
          <button className="cp-filter-close" aria-label="Close filters" onClick={() => setFiltersOpen(false)}><X size={20} /></button>
        </div>
        <div className="cp-filter-drawer-body">
          <FilterSection index={0} icon={FILTER_SECTION_ICONS.category} title="Category">
            <button className={activeCategory === "all" ? "cp-filter-row is-active" : "cp-filter-row"} aria-pressed={activeCategory === "all"} onClick={() => selectCategory("all")}>
              <span className="cp-filter-row-icon" style={{ background: "#e8ecdb", color: "#3f5945" }}><LayoutGrid size={18} /></span>
              <span className="cp-filter-row-label">Everything</span><small>{PRODUCTS.length}</small>
            </button>
            {PRODUCT_CATEGORY_ORDER.map((category) => {
              const meta = PRODUCT_CATEGORY_META[category];
              const CategoryIcon = meta.icon;
              const isExpanded = expandedCategory === category;
              const availableSubcategories = meta.subcategories.filter((sub) => PRODUCTS.some((product) => product.category === category && product.subcategory === sub));
              return <div className="cp-filter-category" key={category}>
                <div className={activeCategory === category ? "cp-filter-row is-active" : "cp-filter-row"}>
                  <button className="cp-filter-row-main" aria-pressed={activeCategory === category} onClick={() => selectCategory(category)}>
                    <span className="cp-filter-row-icon" style={{ background: `${meta.color}24`, color: meta.color }}><CategoryIcon size={18} /></span>
                    <span className="cp-filter-row-label">{meta.label}</span><small>{categoryCounts.get(category) ?? 0}</small>
                  </button>
                  {availableSubcategories.length > 0 && <button className={isExpanded ? "cp-filter-expand is-open" : "cp-filter-expand"} aria-label={isExpanded ? `Hide ${meta.label} subcategories` : `Show ${meta.label} subcategories`} aria-expanded={isExpanded} onClick={() => setExpandedCategory(isExpanded ? null : category)}><ChevronRight size={16} /></button>}
                </div>
                {isExpanded && <div className="cp-filter-subrow">{availableSubcategories.map((sub) => {
                  const active = activeSubcategories.includes(sub);
                  const SubIcon = SUBCATEGORY_ICONS[sub] ?? CategoryIcon;
                  const count = PRODUCTS.filter((product) => product.category === category && product.subcategory === sub).length;
                  return <button key={sub} className={active ? "is-active" : ""} aria-pressed={active} onClick={() => toggleSubcategory(category, sub)}><SubIcon size={16} style={{ color: meta.color }} /><span>{sub}</span><small>{count}</small></button>;
                })}</div>}
              </div>;
            })}
          </FilterSection>

          <FilterSection index={1} icon={FILTER_SECTION_ICONS.price} title="Price">
            {priceRanges.length > 0 && <div className="cp-opt-row">{priceRanges.map((range) => {
              const active = priceMin === (range.min ?? "") && priceMax === (range.max ?? "");
              return <button key={range.label} className={active ? "cp-opt-chip is-active" : "cp-opt-chip"} aria-pressed={active} onClick={() => { setPriceMin(active ? "" : range.min ?? ""); setPriceMax(active ? "" : range.max ?? ""); }}>{range.label}<small>{range.count}</small></button>;
            })}</div>}
            <div className="cp-filter-price-row">
              <label><span>Min</span><div><i>₹</i><input type="number" inputMode="numeric" min={0} placeholder={String(catalogPriceBounds.min)} value={priceMin} onChange={(event) => setPriceMin(event.target.value === "" ? "" : Number(event.target.value))} /></div></label>
              <label><span>Max</span><div><i>₹</i><input type="number" inputMode="numeric" min={0} placeholder={String(catalogPriceBounds.max)} value={priceMax} onChange={(event) => setPriceMax(event.target.value === "" ? "" : Number(event.target.value))} /></div></label>
            </div>
            <div className="cp-price-track" aria-hidden="true"><span style={priceTrackStyle} /></div>
            <p className="cp-price-bounds"><span>{formatPrice(catalogPriceBounds.min)}</span><span>{formatPrice(catalogPriceBounds.max)}</span></p>
          </FilterSection>

          {lifeStageOptions.length > 0 && <FilterSection index={2} icon={FILTER_SECTION_ICONS.lifeStage} title="Life stage"><div className="cp-opt-row">{lifeStageOptions.map(([stage, count]) => { const active = activeLifeStages.includes(stage); return <button key={stage} className={active ? "cp-opt-chip is-active" : "cp-opt-chip"} aria-pressed={active} onClick={() => toggleValue(activeLifeStages, stage, setActiveLifeStages)}>{stage}<small>{count}</small></button>; })}</div></FilterSection>}

          {materialOptions.length > 0 && <FilterSection index={3} icon={FILTER_SECTION_ICONS.material} title="Material"><div className="cp-opt-row">{materialOptions.map(([material, count]) => { const active = activeMaterials.includes(material); return <button key={material} className={active ? "cp-opt-chip is-active" : "cp-opt-chip"} aria-pressed={active} onClick={() => toggleValue(activeMaterials, material, setActiveMaterials)}>{material}<small>{count}</small></button>; })}</div></FilterSection>}

          {sizeOptions.length > 0 && <FilterSection index={4} icon={FILTER_SECTION_ICONS.size} title="Size"><div className="cp-opt-row">{sizeOptions.map(([size, count]) => { const active = activeSizes.includes(size); return <button key={size} className={active ? "cp-opt-chip is-active" : "cp-opt-chip"} aria-pressed={active} onClick={() => toggleValue(activeSizes, size, setActiveSizes)}>{size}<small>{count}</small></button>; })}</div></FilterSection>}

          {colorOptions.length > 0 && <FilterSection index={5} icon={FILTER_SECTION_ICONS.colour} title="Colour"><div className="cp-opt-row">{colorOptions.map(([color, count]) => { const active = activeColors.includes(color); return <button key={color} className={active ? "cp-opt-chip cp-colour-chip is-active" : "cp-opt-chip cp-colour-chip"} aria-pressed={active} onClick={() => toggleValue(activeColors, color, setActiveColors)}><i style={{ background: COLOR_SWATCHES[color] ?? "#cfcabb" }} />{color}<small>{count}</small></button>; })}</div></FilterSection>}

          <FilterSection index={6} icon={FILTER_SECTION_ICONS.availability} title="Availability">
            <button type="button" className="cp-filter-row cp-store-stock-toggle" aria-pressed={inStockOnly} onClick={() => setInStockOnly((value) => !value)}>
              <span className="cp-filter-row-label">In stock only <small>{inStockCount}</small></span>
              <span className={inStockOnly ? "cp-toggle is-on" : "cp-toggle"}><i /></span>
            </button>
          </FilterSection>
        </div>
        <div className="cp-filter-drawer-foot">
          {hasActiveFilters && <button className="cp-filter-clear" onClick={clearAllFilters}>Clear all</button>}
          <button className="cp-filter-apply" onClick={() => setFiltersOpen(false)}>Show {filtered.length} product{filtered.length === 1 ? "" : "s"} <ArrowRight size={16} /></button>
        </div>
      </aside>

      {selectedProductId ? selectedProduct ? <ProductPage
        key={selectedProduct.id}
        product={selectedProduct}
        recommendations={recommendations}
        quantity={detailQuantity}
        inBag={quantityOf(selectedProduct.id)}
        wishlist={wishlist}
        addedNotice={addedNotice}
        onOpenProduct={openProduct}
        onClose={closeProduct}
        onBrowse={browseFromProduct}
        onChangeQuantity={setDetailQuantity}
        onToggleWishlist={toggleWishlist}
        onAdd={() => { if (!selectedProduct.inStock) return; onAddToCart(selectedProduct.id, detailQuantity); setAddedNotice(true); }}
       /> : <div className="cp-store-not-found"><span className="cp-store-not-found-mark"><Package size={24} /></span><p className="cp-store-eyebrow">A little detour</p><h2>We couldn’t find that item.</h2><p>This concept product may have moved out of the preview shelf.</p><button className="cp-button cp-button-dark" onClick={closeProduct}><ArrowLeft size={15} /> Back to the Store</button></div>
        : filtered.length === 0
        ? <div className="cp-empty-state"><Package size={20} /><p>{query.trim() ? "We couldn't find anything matching your search." : "No little treasures found here."}</p>{hasActiveFilters && <button className="cp-text-action" onClick={clearAllFilters}>Clear filters <ArrowRight size={15} /></button>}</div>
        : <div className="cp-store-grid">{filtered.map((product) => {
            const meta = PRODUCT_CATEGORY_META[product.category];
            const Icon = meta.icon;
            const isWishlisted = wishlist.includes(product.id);
            return <article className="cp-product-tile" key={product.id}>
              <div className={product.inStock ? "cp-product-media-wrap" : "cp-product-media-wrap is-out"} style={{ background: `${meta.color}1f` }}>
                <button className="cp-product-media" onClick={() => openProduct(product)} aria-label={`View ${product.name}`}><Icon size={32} style={{ color: meta.color }} /></button>
                {product.tag && <span className="cp-product-tag">{product.tag}</span>}
                <button className={isWishlisted ? "cp-product-wishlist is-active" : "cp-product-wishlist"} aria-pressed={isWishlisted} aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`} onClick={() => toggleWishlist(product.id)}><Heart size={14} fill={isWishlisted ? "currentColor" : "none"} /></button>
                {!product.inStock && <span className="cp-product-oos">Sold out</span>}
              </div>
              <div className="cp-product-info">
                <button className="cp-product-name" onClick={() => openProduct(product)}>{product.name}</button>
                <span className="cp-product-price">{formatPrice(product.price)}</span>
              </div>
            </article>;
          })}</div>}

      <p className="cp-store-disclaimer"><Truck size={13} /> Concept store for this design preview — no real payments, inventory, or deliveries are connected yet.</p>

      <CartDrawer
        isOpen={cartOpen}
        step={checkoutStep}
        lines={cartLines}
        total={cartTotal}
        onClose={onCloseCart}
        onUpdateQuantity={onUpdateQuantity}
        onRemove={onRemoveFromCart}
        onGoToCheckout={onGoToCheckout}
        onBackToCart={onBackToCart}
        onPlaceOrder={onPlaceOrder}
        onStartOver={onStartOver}
      />
    </section>
  );
}

function CartDrawer({ isOpen, step, lines, total, onClose, onUpdateQuantity, onRemove, onGoToCheckout, onBackToCart, onPlaceOrder, onStartOver }: {
  isOpen: boolean;
  step: CheckoutStep;
  lines: { item: CartItem; product: Product }[];
  total: number;
  onClose: () => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onGoToCheckout: () => void;
  onBackToCart: () => void;
  onPlaceOrder: () => void;
  onStartOver: () => void;
}) {
  return <>
    {isOpen && <button className="cp-cart-backdrop" aria-label="Close cart" onClick={onClose} />}
    <aside className={isOpen ? "cp-cart-drawer is-open" : "cp-cart-drawer"} role="dialog" aria-modal="true" aria-label="Your cart">
      <div className="cp-cart-head">
        <h2>{step === "details" ? "Delivery details" : step === "done" ? "Preview order placed" : "Your cart"}</h2>
        <button aria-label="Close cart" onClick={onClose}><X size={18} /></button>
      </div>

      {step === "cart" && (
        lines.length === 0
          ? <div className="cp-empty-state"><ShoppingBag size={20} /><p>Your cart is empty.</p><span className="cp-store-disclaimer-inline">Add a few concept products to see this flow in action.</span></div>
          : <>
              <div className="cp-cart-lines">{lines.map(({ item, product }) => {
                const meta = PRODUCT_CATEGORY_META[product.category];
                const Icon = meta.icon;
                return <div className="cp-cart-line" key={product.id}>
                  <span className="cp-cart-line-media" style={{ background: `${meta.color}22` }}><Icon size={18} style={{ color: meta.color }} /></span>
                  <span className="cp-cart-line-copy"><b>{product.name}</b><small>{product.unit}</small></span>
                  <div className="cp-qty-stepper"><button aria-label={`Remove one ${product.name}`} onClick={() => onUpdateQuantity(product.id, item.quantity - 1)}><Minus size={12} /></button><span>{item.quantity}</span><button aria-label={`Add one more ${product.name}`} onClick={() => onUpdateQuantity(product.id, item.quantity + 1)}><Plus size={12} /></button></div>
                  <b className="cp-cart-line-price">{formatPrice(product.price * item.quantity)}</b>
                  <button className="cp-cart-line-remove" aria-label={`Remove ${product.name} from cart`} onClick={() => onRemove(product.id)}><Trash2 size={14} /></button>
                </div>;
              })}</div>
              <div className="cp-cart-summary"><span>Subtotal</span><b>{formatPrice(total)}</b></div>
              <button className="cp-button cp-button-dark cp-cart-checkout" onClick={onGoToCheckout}>Continue to preview checkout <ArrowRight size={15} /></button>
              <p className="cp-form-notice cp-store-disclaimer-inline">This preview never charges a card or ships anything.</p>
            </>
      )}

      {step === "details" && (
        <form className="cp-checkout-form" onSubmit={(event) => { event.preventDefault(); onPlaceOrder(); }}>
          <label className="cp-form-label" htmlFor="store-name">Name</label>
          <input id="store-name" placeholder="Your name" required />
          <label className="cp-form-label" htmlFor="store-address">Delivery address</label>
          <textarea id="store-address" placeholder="A sample address for this preview" rows={3} required />
          <label className="cp-form-label" htmlFor="store-phone">Phone <span>Optional</span></label>
          <input id="store-phone" type="tel" placeholder="For delivery updates" />
          <div className="cp-cart-summary"><span>Order total</span><b>{formatPrice(total)}</b></div>
          <button type="submit" className="cp-button cp-button-dark cp-cart-checkout">Place preview order <ArrowRight size={15} /></button>
          <button type="button" className="cp-text-action" onClick={onBackToCart}>Back to cart</button>
          <p className="cp-form-notice">No payment method is collected. This preview will not charge, ship, or save this order.</p>
        </form>
      )}

      {step === "done" && (
        <div className="cp-checkout-done">
          <PackageCheck size={34} />
          <h3>This was just a preview.</h3>
          <p>Nothing was charged and nothing will be delivered — there’s no connected payment or fulfilment yet. When Catopia’s store goes live, this is the moment you’d get a real confirmation.</p>
          <button className="cp-button cp-button-light" onClick={onStartOver}><Check size={14} /> Start a new preview order</button>
        </div>
      )}
    </aside>
  </>;
}
