"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronRight, Heart, Minus, Package, PackageCheck, Plus, ShoppingBag, SlidersHorizontal, Sparkles, Trash2, Truck, X } from "lucide-react";
import { COLOR_SWATCHES, PRODUCT_CATEGORY_META, PRODUCT_CATEGORY_ORDER, PRODUCTS, SORT_OPTIONS, formatPrice, type CartItem, type CheckoutStep, type Product, type ProductCategory, type SortOption } from "./store-data";

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
  const [detailTab, setDetailTab] = useState<"description" | "specifications" | "shipping" | "reviews">("description");
  const [galleryOpen, setGalleryOpen] = useState(false);
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
    setDetailTab("description");
    setGalleryOpen(false);
    setDetailQuantity(1);
    setAddedNotice(false);
  };
  const closeProduct = () => {
    const params = new URLSearchParams(window.location.search);
    params.delete("product");
    const nextUrl = `${window.location.pathname}${params.size ? `?${params.toString()}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", nextUrl);
    setSelectedProductId(null);
    setGalleryOpen(false);
  };

  const categoryCounts = useMemo(() => {
    const counts = new Map<ProductCategory, number>();
    for (const product of PRODUCTS) counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
    return counts;
  }, []);
  const inStockCount = useMemo(() => PRODUCTS.filter((product) => product.inStock).length, []);
  const catalogPriceBounds = useMemo(() => ({ min: Math.min(...PRODUCTS.map((product) => product.price)), max: Math.max(...PRODUCTS.map((product) => product.price)) }), []);

  // Scoped to the current category/subcategory selection only, so facets like Life Stage,
  // Material, Size and Colour never show a value or count with zero matching products.
  const categoryScoped = useMemo(() => PRODUCTS.filter((product) =>
    (activeCategory === "all" || product.category === activeCategory)
    && (activeSubcategories.length === 0 || activeSubcategories.includes(product.subcategory))), [activeCategory, activeSubcategories]);
  const countBy = (pick: (product: Product) => string | undefined) => {
    const counts = new Map<string, number>();
    for (const product of categoryScoped) { const value = pick(product); if (value) counts.set(value, (counts.get(value) ?? 0) + 1); }
    return [...counts.entries()];
  };
  const lifeStageOptions = useMemo(() => countBy((product) => product.lifeStage), [categoryScoped]);
  const materialOptions = useMemo(() => countBy((product) => product.material), [categoryScoped]);
  const sizeOptions = useMemo(() => countBy((product) => product.size), [categoryScoped]);
  const colorOptions = useMemo(() => countBy((product) => product.color), [categoryScoped]);

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
  const recommendations = selectedProduct ? PRODUCTS.filter((product) => product.category === selectedProduct.category && product.id !== selectedProduct.id).slice(0, 4) : [];

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

  const activeFilterCount = (activeCategory !== "all" ? 1 : 0) + activeSubcategories.length + activeLifeStages.length + activeMaterials.length
    + activeSizes.length + activeColors.length + (inStockOnly ? 1 : 0) + (priceMin !== "" ? 1 : 0) + (priceMax !== "" ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;
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
      {!selectedProductId && <div className="cp-store-categories" aria-label="Shop by category">{PRODUCT_CATEGORY_ORDER.map((category) => {
        const meta = PRODUCT_CATEGORY_META[category];
        const Icon = meta.icon;
        const isActive = activeCategory === category;
        return <button key={category} className={isActive ? "cp-category-tile is-active" : "cp-category-tile"} onClick={() => selectCategory(isActive ? "all" : category)}>
          <span className="cp-category-tile-icon" style={{ background: `${meta.color}1f`, color: meta.color }}><Icon size={22} /></span>
          <span className="cp-category-tile-label">{meta.label}</span>
          <span className="cp-category-tile-blurb">{meta.blurb}</span>
        </button>;
      })}</div>}

      <div className="cp-store-result-row">
        <span className="cp-store-count">{filtered.length} product{filtered.length === 1 ? "" : "s"}</span>
        <div className="cp-store-controls">
          <button className="cp-store-filters-toggle" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={13} /> Filters{activeFilterCount > 0 && <span className="cp-store-filters-badge">{activeFilterCount}</span>}</button>
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
          <h2>Filters</h2>
          <div className="cp-filter-drawer-head-actions">
            {hasActiveFilters && <button className="cp-text-action" onClick={clearAllFilters}>Clear all</button>}
            <button aria-label="Close filters" onClick={() => setFiltersOpen(false)}><X size={18} /></button>
          </div>
        </div>
        <div className="cp-filter-drawer-body">
          <div className="cp-filter-section">
            <h3>Category</h3>
            <button className={activeCategory === "all" ? "cp-filter-row is-active" : "cp-filter-row"} aria-pressed={activeCategory === "all"} onClick={() => selectCategory("all")}><span>Everything</span><small>{PRODUCTS.length}</small></button>
            {PRODUCT_CATEGORY_ORDER.map((category) => {
              const meta = PRODUCT_CATEGORY_META[category];
              const isExpanded = expandedCategory === category;
              const availableSubcategories = meta.subcategories.filter((sub) => PRODUCTS.some((product) => product.category === category && product.subcategory === sub));
              return <div className="cp-filter-category" key={category}>
                <div className={activeCategory === category ? "cp-filter-row is-active" : "cp-filter-row"}>
                  <button className="cp-filter-row-main" aria-pressed={activeCategory === category} onClick={() => selectCategory(category)}><span>{meta.label}</span><small>{categoryCounts.get(category) ?? 0}</small></button>
                  {availableSubcategories.length > 0 && <button className={isExpanded ? "cp-filter-expand is-open" : "cp-filter-expand"} aria-label={isExpanded ? `Hide ${meta.label} subcategories` : `Show ${meta.label} subcategories`} aria-expanded={isExpanded} onClick={() => setExpandedCategory(isExpanded ? null : category)}><ChevronRight size={14} /></button>}
                </div>
                {isExpanded && <div className="cp-filter-subrow">{availableSubcategories.map((sub) => {
                  const active = activeSubcategories.includes(sub);
                  const count = PRODUCTS.filter((product) => product.category === category && product.subcategory === sub).length;
                  return <button key={sub} className={active ? "is-active" : ""} aria-pressed={active} onClick={() => toggleSubcategory(category, sub)}><span>{sub}</span><small>{count}</small></button>;
                })}</div>}
              </div>;
            })}
          </div>

          <div className="cp-filter-section">
            <h3>Price</h3>
            <div className="cp-filter-price-row">
              <label>Min<input type="number" inputMode="numeric" min={0} placeholder={String(catalogPriceBounds.min)} value={priceMin} onChange={(event) => setPriceMin(event.target.value === "" ? "" : Number(event.target.value))} /></label>
              <span aria-hidden="true">–</span>
              <label>Max<input type="number" inputMode="numeric" min={0} placeholder={String(catalogPriceBounds.max)} value={priceMax} onChange={(event) => setPriceMax(event.target.value === "" ? "" : Number(event.target.value))} /></label>
            </div>
          </div>

          {lifeStageOptions.length > 0 && <div className="cp-filter-section"><h3>Life Stage</h3>{lifeStageOptions.map(([stage, count]) => { const active = activeLifeStages.includes(stage); return <button key={stage} className={active ? "cp-filter-row is-active" : "cp-filter-row"} aria-pressed={active} onClick={() => toggleValue(activeLifeStages, stage, setActiveLifeStages)}><span>{stage}</span><small>{count}</small></button>; })}</div>}

          {materialOptions.length > 0 && <div className="cp-filter-section"><h3>Material</h3>{materialOptions.map(([material, count]) => { const active = activeMaterials.includes(material); return <button key={material} className={active ? "cp-filter-row is-active" : "cp-filter-row"} aria-pressed={active} onClick={() => toggleValue(activeMaterials, material, setActiveMaterials)}><span>{material}</span><small>{count}</small></button>; })}</div>}

          {sizeOptions.length > 0 && <div className="cp-filter-section"><h3>Size</h3><div className="cp-filter-size-row">{sizeOptions.map(([size]) => { const active = activeSizes.includes(size); return <button key={size} className={active ? "cp-size-chip is-active" : "cp-size-chip"} aria-pressed={active} onClick={() => toggleValue(activeSizes, size, setActiveSizes)}>{size}</button>; })}</div></div>}

          {colorOptions.length > 0 && <div className="cp-filter-section"><h3>Colour</h3><div className="cp-filter-color-row">{colorOptions.map(([color]) => { const active = activeColors.includes(color); return <button key={color} className={active ? "cp-color-swatch is-active" : "cp-color-swatch"} style={{ background: COLOR_SWATCHES[color] ?? "#cfcabb" }} aria-pressed={active} aria-label={color} title={color} onClick={() => toggleValue(activeColors, color, setActiveColors)} />; })}</div></div>}

          <div className="cp-filter-section">
            <h3>Availability</h3>
            <button type="button" className="cp-filter-row cp-store-stock-toggle" aria-pressed={inStockOnly} onClick={() => setInStockOnly((value) => !value)}>
              <span>In stock only <small>{inStockCount}</small></span>
              <span className={inStockOnly ? "cp-toggle is-on" : "cp-toggle"}><i /></span>
            </button>
          </div>
        </div>
        <div className="cp-filter-drawer-foot">
          <button className="cp-button cp-button-dark" onClick={() => setFiltersOpen(false)}>Show {filtered.length} product{filtered.length === 1 ? "" : "s"}</button>
        </div>
      </aside>

      {selectedProductId ? selectedProduct ? <ProductDetailPage
        product={selectedProduct}
        recommendations={recommendations}
        quantity={detailQuantity}
        inBag={quantityOf(selectedProduct.id)}
        isWishlisted={wishlist.includes(selectedProduct.id)}
        activeTab={detailTab}
        galleryOpen={galleryOpen}
        addedNotice={addedNotice}
        onOpenProduct={openProduct}
        onClose={closeProduct}
        onChangeQuantity={setDetailQuantity}
        onToggleWishlist={() => toggleWishlist(selectedProduct.id)}
        onAdd={() => { if (!selectedProduct.inStock) return; onAddToCart(selectedProduct.id, detailQuantity); setAddedNotice(true); }}
        onSetTab={setDetailTab}
        onOpenGallery={() => setGalleryOpen(true)}
        onCloseGallery={() => setGalleryOpen(false)}
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

type StoreDetailTab = "description" | "specifications" | "shipping" | "reviews";
function ProductDetailPage({ product, recommendations, quantity, inBag, isWishlisted, activeTab, galleryOpen, addedNotice, onOpenProduct, onClose, onChangeQuantity, onToggleWishlist, onAdd, onSetTab, onOpenGallery, onCloseGallery }: {
  product: Product;
  recommendations: Product[];
  quantity: number;
  inBag: number;
  isWishlisted: boolean;
  activeTab: StoreDetailTab;
  galleryOpen: boolean;
  addedNotice: boolean;
  onOpenProduct: (product: Product) => void;
  onClose: () => void;
  onChangeQuantity: (quantity: number) => void;
  onToggleWishlist: () => void;
  onAdd: () => void;
  onSetTab: (tab: StoreDetailTab) => void;
  onOpenGallery: () => void;
  onCloseGallery: () => void;
}) {
  const meta = PRODUCT_CATEGORY_META[product.category];
  const Icon = meta.icon;
  const tabs: { id: StoreDetailTab; label: string }[] = [
    { id: "description", label: "Description" }, { id: "specifications", label: "Details" },
    { id: "shipping", label: "Delivery" }, { id: "reviews", label: "Reviews" },
  ];
  useEffect(() => {
    if (!galleryOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onCloseGallery(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [galleryOpen, onCloseGallery]);

  return <div className="cp-store-detail">
    <button className="cp-store-back" onClick={onClose}><ArrowLeft size={15} /> Back to the Store</button>
    <nav className="cp-store-breadcrumb" aria-label="Breadcrumb">
      <button onClick={onClose}>Store</button><span>/</span><span>{meta.label}</span><span>/</span><b aria-current="page">{product.name}</b>
    </nav>

    <div className="cp-product-layout">
      <div className="cp-product-gallery-column">
        <button className="cp-product-artwork" style={{ "--product-tint": `${meta.color}20`, "--product-accent": meta.color } as CSSProperties} onClick={onOpenGallery} aria-label={`Open larger concept illustration for ${product.name}`}>
          <span className="cp-product-artwork-top"><span>CATOPIA / OBJECT STUDY</span><span>NO. {product.id.split("-").at(-1)?.slice(0, 2).toUpperCase()}</span></span>
          <span className="cp-product-artwork-halo" />
          <span className="cp-product-artwork-icon"><Icon size={94} strokeWidth={1.1} /></span>
          <span className="cp-product-artwork-caption"><b>{meta.label}</b><span>{product.unit}</span></span>
          <span className="cp-product-artwork-foot">Illustrative concept artwork · product photography to come</span>
          {product.tag && <span className="cp-product-tag">{product.tag}</span>}
        </button>
        <div className="cp-product-gallery-note"><Sparkles size={13} /><span>Each shelf begins as an idea. This product is a design preview.</span></div>
      </div>

      <section className="cp-product-information" aria-labelledby="cp-product-title">
        <p className="cp-product-category">{meta.label}</p>
        <h1 id="cp-product-title">{product.name}</h1>
        <button className="cp-product-review-link" onClick={() => { onSetTab("reviews"); document.getElementById("cp-product-details")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>No reviews yet <span>· Be the first</span></button>
        <p className="cp-product-detail-price">{formatPrice(product.price)} <span>preview price</span></p>
        <p className="cp-product-short-description">{product.description}</p>

        <div className="cp-product-item-meta"><span>Format</span><b>{product.unit}</b></div>
        <div className="cp-product-item-meta"><span>Availability</span><b className={product.inStock ? "" : "is-unavailable"}>{product.inStock ? "Available in this concept preview" : "Unavailable in this concept preview"}</b></div>

        <div className="cp-product-buy-row">
          <div className="cp-qty-stepper" aria-label="Quantity">
            <button aria-label="Remove one" disabled={quantity <= 1} onClick={() => onChangeQuantity(Math.max(1, quantity - 1))}><Minus size={14} /></button>
            <span aria-live="polite">{quantity}</span>
            <button aria-label="Add one" onClick={() => onChangeQuantity(quantity + 1)}><Plus size={14} /></button>
          </div>
          <button className="cp-button cp-button-dark cp-product-add" disabled={!product.inStock} onClick={onAdd}><ShoppingBag size={16} /> {product.inStock ? "Add to bag" : "Unavailable"}</button>
        </div>
        {addedNotice && <p className="cp-product-added" role="status"><Check size={14} /> Added to your preview bag. {inBag} {inBag === 1 ? "item" : "items"} now saved for this session.</p>}
        <button className={isWishlisted ? "cp-product-save is-saved" : "cp-product-save"} aria-pressed={isWishlisted} onClick={onToggleWishlist}><Heart size={16} fill={isWishlisted ? "currentColor" : "none"} />{isWishlisted ? "Saved to your session wishlist" : "Save for later"}</button>
        <div className="cp-product-assurance"><Truck size={16} /><span><b>Thoughtful things, when we’re ready.</b><small>Delivery and returns aren’t configured yet. No order will be placed or shipped from this preview.</small></span></div>
        <p className="cp-product-preview-note">Sample catalog item · illustrative price · no real stock or supplier attached</p>
      </section>
    </div>

    <section id="cp-product-details" className="cp-product-details" aria-label="Product information">
      <div className="cp-product-tabs" role="tablist" aria-label="Product details">
        {tabs.map((tab) => <button key={tab.id} id={`product-tab-${tab.id}`} role="tab" aria-selected={activeTab === tab.id} aria-controls="cp-product-tab-panel" className={activeTab === tab.id ? "is-active" : ""} onClick={() => onSetTab(tab.id)}>{tab.label}{tab.id === "reviews" && <small>0</small>}</button>)}
      </div>
      <div className="cp-product-tab-panel" id="cp-product-tab-panel" role="tabpanel" aria-labelledby={`product-tab-${activeTab}`}>
        {activeTab === "description" && <div className="cp-product-editorial"><p className="cp-store-eyebrow">A small note about this one</p><h2>Made for a more considered cat day.</h2><p>{product.description}</p><p>This is an early Catopia store concept. Final materials, sourcing, care guidance, and product photography will be added only when those details are confirmed.</p></div>}
        {activeTab === "specifications" && <div className="cp-product-specs"><p className="cp-store-eyebrow">The useful details</p><dl><div><dt>Collection</dt><dd>{meta.label}</dd></div><div><dt>Pack / format</dt><dd>{product.unit}</dd></div><div><dt>Item type</dt><dd>Catopia concept product</dd></div></dl><p className="cp-product-preview-note">Dimensions, materials, and care information have not been provided for this concept item.</p></div>}
        {activeTab === "shipping" && <div className="cp-product-editorial"><p className="cp-store-eyebrow">Delivery & returns</p><h2>Not set up just yet.</h2><p>Shipping areas, delivery estimates, seller details, and return terms will appear here once Catopia’s store has verified fulfilment partners and published policies.</p></div>}
        {activeTab === "reviews" && <div className="cp-product-editorial cp-product-empty-reviews"><p className="cp-store-eyebrow">Community notes</p><h2>No reviews yet.</h2><p>Reviews will open when accounts and the moderated review system are connected. We won’t invent ratings or customer stories in the meantime.</p></div>}
      </div>
    </section>

    {recommendations.length > 0 && <section className="cp-product-related" aria-labelledby="cp-related-title">
      <div className="cp-product-related-heading"><div><p className="cp-store-eyebrow">A few nearby ideas</p><h2 id="cp-related-title">You might also like</h2></div><span>From the same little corner of the shop.</span></div>
      <div className="cp-product-related-grid">{recommendations.map((item) => { const itemMeta = PRODUCT_CATEGORY_META[item.category]; const ItemIcon = itemMeta.icon; return <article className="cp-product-related-item" key={item.id}>
        <button className="cp-product-related-art" style={{ "--product-tint": `${itemMeta.color}20`, "--product-accent": itemMeta.color } as CSSProperties} onClick={() => onOpenProduct(item)} aria-label={`View ${item.name}`}><ItemIcon size={36} strokeWidth={1.2} /></button>
        <div><button className="cp-product-related-name" onClick={() => onOpenProduct(item)}>{item.name}</button><span>{formatPrice(item.price)}</span></div>
      </article>; })}</div>
    </section>}

    {galleryOpen && <div className="cp-product-lightbox" role="dialog" aria-modal="true" aria-label={`${product.name} concept illustration`} onClick={onCloseGallery}>
      <button className="cp-product-lightbox-close" onClick={onCloseGallery} aria-label="Close illustration"><X size={20} /></button>
      <div className="cp-product-lightbox-art" style={{ "--product-tint": `${meta.color}20`, "--product-accent": meta.color } as CSSProperties} onClick={(event) => event.stopPropagation()}><Icon size={180} strokeWidth={.9} /><span>{product.name} · concept illustration</span></div>
    </div>}
    <div className="cp-product-mobile-buy"><span><small>Preview price</small><b>{formatPrice(product.price)}</b></span><button className="cp-button cp-button-dark" disabled={!product.inStock} onClick={onAdd}>{addedNotice ? "Added" : "Add to bag"}</button></div>
  </div>;
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
