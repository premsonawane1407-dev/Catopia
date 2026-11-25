import { Fish, Feather, Sofa, Droplets, Shirt, Luggage, HeartPulse, Cpu, Cat, Gift, type LucideIcon, Wheat, Soup, Cookie, Smile, Pill, CookingPot, Droplet, Timer, Wand, Sprout, Puzzle, Tent, Boxes, BedDouble, TreePine, PanelTop, Rows3, House, Brush, Bath, Scissors, Container, Sparkles, SprayCan, CircleDot, Link2, IdCard, Car, Trees, Backpack, BriefcaseMedical, Bug, Accessibility, Wifi, Camera, MapPin, Shield, Baby, HeartHandshake, Milk, Snowflake, Lamp, Package, Zap, Footprints, LayoutGrid, IndianRupee, Layers, Ruler, Palette, PackageCheck } from "lucide-react";

export type ProductCategory =
  | "food-feeding"
  | "toys-play"
  | "furniture-comfort"
  | "grooming-hygiene"
  | "clothing-accessories"
  | "travel-outdoors"
  | "health-wellness"
  | "smart-safety"
  | "kitten-senior"
  | "gifts-collections";

export type LifeStage = "Kitten" | "Adult" | "Senior";

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  subcategory: string;
  price: number;
  unit: string;
  description: string;
  tag?: "New" | "Staff pick";
  inStock: boolean;
  lifeStage?: LifeStage;
  material?: string;
  size?: string;
  color?: string;
  /** Real product photographs (served as-is). When absent, the gallery falls back to labelled sample imagery. */
  images?: ProductImage[];
};

export type ProductImage = { src: string; alt: string };

export type CartItem = { productId: string; quantity: number };
export type CheckoutStep = "cart" | "details" | "done";

export type SortOption = "featured" | "newest" | "price-asc" | "price-desc" | "name-asc";

// No "best rated" / "most popular" options: there is no real review or sales data to
// back them, and we never fabricate that kind of signal (see TECHNICAL_DECISIONS.md).
export const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: "featured", label: "Featured" },
  { id: "newest", label: "Newest Arrivals" },
  { id: "price-asc", label: "Price: Low to High" },
  { id: "price-desc", label: "Price: High to Low" },
  { id: "name-asc", label: "Name: A–Z" },
];

export const PRODUCT_CATEGORY_ORDER: ProductCategory[] = [
  "food-feeding", "toys-play", "furniture-comfort", "grooming-hygiene", "clothing-accessories",
  "travel-outdoors", "health-wellness", "smart-safety", "kitten-senior", "gifts-collections",
];

export const PRODUCT_CATEGORY_META: Record<ProductCategory, { label: string; blurb: string; icon: LucideIcon; color: string; subcategories: string[] }> = {
  "food-feeding": { label: "Food & Feeding", blurb: "Everyday meals, treats & feeding gear", icon: Fish, color: "#c86f50", subcategories: ["Dry Food", "Wet Food", "Treats", "Dental Treats", "Supplements", "Feeding Bowls", "Water Fountains", "Automatic Feeders"] },
  "toys-play": { label: "Toys & Play", blurb: "Wands, puzzles & enrichment", icon: Feather, color: "#7c9a5e", subcategories: ["Wand Toys", "Catnip Toys", "Interactive Toys", "Puzzle Feeders", "Tunnels", "Enrichment Kits"] },
  "furniture-comfort": { label: "Furniture & Comfort", blurb: "Beds, trees & cosy corners", icon: Sofa, color: "#3f5945", subcategories: ["Beds", "Cat Trees & Towers", "Window Perches", "Scratching Posts", "Hideaways"] },
  "grooming-hygiene": { label: "Grooming & Hygiene", blurb: "Brushes, litter & clean-up", icon: Droplets, color: "#4f7a93", subcategories: ["Brushes & Deshedding", "Bath & Shampoo", "Nail Care", "Litter Boxes", "Litter", "Cleaning Supplies"] },
  "clothing-accessories": { label: "Clothing & Accessories", blurb: "Collars, apparel & ID", icon: Shirt, color: "#a6639a", subcategories: ["Apparel", "Collars", "Harnesses & Leashes", "ID Tags"] },
  "travel-outdoors": { label: "Travel & Outdoors", blurb: "Carriers & outdoor time", icon: Luggage, color: "#5c6b4f", subcategories: ["Carriers", "Car Travel", "Outdoor Enclosures", "Travel Accessories"] },
  "health-wellness": { label: "Health & Wellness", blurb: "First aid & everyday care", icon: HeartPulse, color: "#b2793f", subcategories: ["First Aid", "Flea & Tick Care", "Dental Care", "Mobility Support", "Wellness Supplements"] },
  "smart-safety": { label: "Smart Tech & Safety", blurb: "Connected & protective gear", icon: Cpu, color: "#7a6ba0", subcategories: ["Smart Feeders & Fountains", "Pet Cameras", "GPS Trackers", "Safety Nets & Gates"] },
  "kitten-senior": { label: "Kitten & Senior Care", blurb: "Gentle care for every age", icon: Cat, color: "#9a7a4f", subcategories: ["Kitten Essentials", "Senior Comfort", "Nursing & Weaning", "Mobility Aids"] },
  "gifts-collections": { label: "Gifts & Collections", blurb: "Bundles & little treats", icon: Gift, color: "#b5607a", subcategories: ["Gift Boxes", "Starter Bundles", "Seasonal", "Lifestyle & Home"] },
};

// A representative swatch per color name used below, for the filter drawer's colour chips.
export const COLOR_SWATCHES: Record<string, string> = {
  Ivory: "#f3ecd8",
  Oatmeal: "#d9cdb3",
  Sand: "#dcc9a3",
  Charcoal: "#3a3a36",
  Terracotta: "#c86f50",
};

// Every product here is an original, fictional Catopia-concept listing for this design
// preview — never a real brand name, never real inventory, never a real supplier. Prices
// are illustrative sample figures only; nothing in this catalog can actually be purchased.
// No product carries a rating, review count or "popularity" claim — Catopia has no real
// review data yet, and we don't invent one (see TECHNICAL_DECISIONS.md).
export const PRODUCTS: Product[] = [
  // Food & Feeding
  { id: "food-adult-kibble", name: "Everyday Adult Kibble", category: "food-feeding", subcategory: "Dry Food", price: 649, unit: "1.5 kg bag", description: "A balanced everyday mix with real chicken as the first ingredient.", inStock: true, lifeStage: "Adult" },
  { id: "food-kitten-starter", name: "Kitten Starter Blend", category: "food-feeding", subcategory: "Dry Food", price: 589, unit: "1 kg bag", description: "Gently sized kibble for growing kittens, with DHA for development.", inStock: true, lifeStage: "Kitten" },
  { id: "food-grain-free-salmon", name: "Grain-Free Salmon Recipe", category: "food-feeding", subcategory: "Wet Food", price: 749, unit: "1.2 kg bag", description: "A grain-free recipe built around salmon, for sensitive tummies.", tag: "New", inStock: true, lifeStage: "Adult" },
  { id: "food-freeze-dried-chicken", name: "Freeze-Dried Chicken Bites", category: "food-feeding", subcategory: "Treats", price: 299, unit: "40 g pouch", description: "Single-ingredient freeze-dried chicken, no fillers.", inStock: true },
  { id: "food-ceramic-bowl-set", name: "Ceramic Feeding Bowl Set", category: "food-feeding", subcategory: "Feeding Bowls", price: 549, unit: "set of 2", description: "A weighted ceramic set that won't slide around at mealtime.", inStock: true, material: "Ceramic", color: "Ivory" },

  // Toys & Play
  { id: "toy-feather-wand", name: "Feather Wand Teaser", category: "toys-play", subcategory: "Wand Toys", price: 249, unit: "1 wand", description: "A classic feather wand for interactive play sessions.", inStock: true },
  { id: "toy-puzzle-ball", name: "Treat-Dispensing Puzzle Ball", category: "toys-play", subcategory: "Puzzle Feeders", price: 399, unit: "1 ball", description: "Slows down mealtime and keeps curious minds busy.", inStock: true },
  { id: "toy-crinkle-tunnel", name: "Crinkle Tunnel", category: "toys-play", subcategory: "Tunnels", price: 599, unit: "1 tunnel", description: "A collapsible crinkle tunnel for hiding, pouncing, and naps.", inStock: true },
  { id: "toy-catnip-mice", name: "Catnip Mice Trio", category: "toys-play", subcategory: "Catnip Toys", price: 299, unit: "pack of 3", description: "Soft catnip-filled mice sized for batting and carrying around.", tag: "New", inStock: true },

  // Furniture & Comfort
  { id: "furniture-plush-bed", name: "Round Plush Cat Bed", category: "furniture-comfort", subcategory: "Beds", price: 899, unit: "1 bed", description: "A soft, raised-rim bed for cats who love to curl up.", inStock: true, material: "Plush", color: "Oatmeal" },
  { id: "furniture-scratch-tower", name: "Scratching Post Tower", category: "furniture-comfort", subcategory: "Scratching Posts", price: 1499, unit: "1 tower", description: "A multi-level sisal tower for scratching, climbing, and lookout naps.", inStock: true, material: "Sisal" },
  { id: "furniture-window-perch", name: "Wall-Mounted Window Perch", category: "furniture-comfort", subcategory: "Window Perches", price: 749, unit: "1 perch", description: "A sturdy perch for sunbathing and watching the world go by.", inStock: true },
  { id: "furniture-hideaway-cave", name: "Woven Hideaway Cave", category: "furniture-comfort", subcategory: "Hideaways", price: 649, unit: "1 cave", description: "A cosy woven cave for cats who prefer a quiet corner.", tag: "Staff pick", inStock: true },

  // Grooming & Hygiene
  { id: "groom-slicker-brush", name: "Self-Cleaning Slicker Brush", category: "grooming-hygiene", subcategory: "Brushes & Deshedding", price: 349, unit: "1 brush", description: "Removes loose fur with one click of the retract button.", inStock: true },
  { id: "groom-oatmeal-shampoo", name: "Gentle Oatmeal Shampoo", category: "grooming-hygiene", subcategory: "Bath & Shampoo", price: 379, unit: "200 ml", description: "A tear-free, oatmeal-based shampoo for sensitive skin.", inStock: true },
  { id: "groom-nail-clipper", name: "Nail Clipper with Guard", category: "grooming-hygiene", subcategory: "Nail Care", price: 249, unit: "1 clipper", description: "A safety-guarded clipper for calmer at-home nail trims.", inStock: true },
  { id: "groom-covered-litter-box", name: "Covered Litter Box", category: "grooming-hygiene", subcategory: "Litter Boxes", price: 1099, unit: "1 box", description: "A fully enclosed box with a carbon filter and swing door.", inStock: true, material: "Plastic", color: "Sand" },
  { id: "groom-clumping-litter", name: "Clumping Clay Litter", category: "grooming-hygiene", subcategory: "Litter", price: 459, unit: "10 L", description: "Fast-clumping, low-dust litter for easy daily scooping.", inStock: false },

  // Clothing & Accessories
  { id: "clothing-knit-sweater", name: "Knit Pullover Sweater", category: "clothing-accessories", subcategory: "Apparel", price: 449, unit: "available S–L", description: "A soft knit layer for chilly mornings. Shown in size M.", inStock: true, size: "M", color: "Charcoal" },
  { id: "clothing-breakaway-collar", name: "Everyday Breakaway Collar", category: "clothing-accessories", subcategory: "Collars", price: 299, unit: "1 collar", description: "A safety-release collar for comfortable everyday wear.", inStock: true, color: "Terracotta" },
  { id: "clothing-harness-leash-set", name: "Walking Harness & Leash Set", category: "clothing-accessories", subcategory: "Harnesses & Leashes", price: 699, unit: "1 set", description: "A padded step-in harness paired with a matching leash.", inStock: true },
  { id: "clothing-id-tag", name: "Engraved ID Tag", category: "clothing-accessories", subcategory: "ID Tags", price: 199, unit: "1 tag", description: "A small engraved tag with space for a name and contact note.", tag: "New", inStock: true },

  // Travel & Outdoors
  { id: "travel-soft-carrier", name: "Soft-Sided Travel Carrier", category: "travel-outdoors", subcategory: "Carriers", price: 1299, unit: "1 carrier", description: "A ventilated, airline-friendly carrier with a washable liner.", tag: "Staff pick", inStock: true },
  { id: "travel-car-seat-belt", name: "Car Seat Safety Belt", category: "travel-outdoors", subcategory: "Car Travel", price: 399, unit: "1 belt", description: "Keeps a harnessed cat secure during car rides.", inStock: false },
  { id: "travel-outdoor-enclosure", name: "Outdoor Mesh Enclosure", category: "travel-outdoors", subcategory: "Outdoor Enclosures", price: 2199, unit: "1 enclosure", description: "A safe, enclosed outdoor space for supervised fresh air.", inStock: true },
  { id: "travel-collapsible-bowls", name: "Collapsible Travel Bowl Set", category: "travel-outdoors", subcategory: "Travel Accessories", price: 299, unit: "2 bowls", description: "Lightweight silicone bowls that fold flat for travel.", inStock: true },

  // Health & Wellness
  { id: "health-first-aid-kit", name: "Pet First-Aid Kit", category: "health-wellness", subcategory: "First Aid", price: 549, unit: "1 kit", description: "A compact kit with the everyday essentials for small mishaps.", inStock: true },
  { id: "health-flea-comb", name: "Flea & Tick Comb", category: "health-wellness", subcategory: "Flea & Tick Care", price: 199, unit: "1 comb", description: "A fine-toothed comb for a gentle at-home check-over.", inStock: true },
  { id: "health-dental-chews", name: "Dental Care Chews", category: "health-wellness", subcategory: "Dental Care", price: 329, unit: "50 g pouch", description: "Textured chews that help reduce plaque build-up.", inStock: true },
  { id: "health-omega-supplement", name: "Omega-3 Coat Supplement", category: "health-wellness", subcategory: "Wellness Supplements", price: 449, unit: "60 capsules", description: "Fish-oil capsules for a shinier coat and healthier skin.", tag: "New", inStock: true },
  { id: "health-calming-diffuser", name: "Calming Diffuser Refill", category: "health-wellness", subcategory: "Wellness Supplements", price: 599, unit: "48 ml", description: "A drug-free diffuser refill to help ease stressful moments.", inStock: true },

  // Smart Tech & Safety
  { id: "smart-auto-feeder", name: "Smart Automatic Feeder", category: "smart-safety", subcategory: "Smart Feeders & Fountains", price: 2499, unit: "1 feeder", description: "App-scheduled portions for a more consistent feeding routine.", tag: "New", inStock: true },
  { id: "smart-pet-camera", name: "Pet Monitoring Camera", category: "smart-safety", subcategory: "Pet Cameras", price: 3199, unit: "1 camera", description: "Two-way audio and a wide-angle view for checking in remotely.", inStock: true },
  { id: "smart-gps-tracker", name: "Lightweight GPS Tracker", category: "smart-safety", subcategory: "GPS Trackers", price: 2799, unit: "1 tracker", description: "A collar-mountable tracker for peace of mind outdoors.", inStock: false },
  { id: "smart-balcony-net", name: "Balcony Safety Net", category: "smart-safety", subcategory: "Safety Nets & Gates", price: 899, unit: "1 net kit", description: "A discreet, tool-free net for securing open balconies.", inStock: true },

  // Kitten & Senior Care
  { id: "kitten-starter-kit", name: "Kitten Starter Kit", category: "kitten-senior", subcategory: "Kitten Essentials", price: 899, unit: "1 kit", description: "A gentle bundle of first essentials for a new kitten at home.", tag: "New", inStock: true, lifeStage: "Kitten" },
  { id: "senior-orthopaedic-bed", name: "Orthopaedic Senior Bed", category: "kitten-senior", subcategory: "Senior Comfort", price: 1199, unit: "1 bed", description: "Supportive memory-foam cushioning for older joints.", inStock: true, lifeStage: "Senior", material: "Memory Foam" },
  { id: "kitten-feeding-bottle-set", name: "Kitten Feeding Bottle Set", category: "kitten-senior", subcategory: "Nursing & Weaning", price: 349, unit: "1 set", description: "Soft-flow bottles and teats sized for very young kittens.", inStock: true, lifeStage: "Kitten" },
  { id: "senior-pet-steps", name: "Pet Steps Ramp", category: "kitten-senior", subcategory: "Mobility Aids", price: 1099, unit: "1 ramp", description: "A gentle incline for reaching favourite beds and sills with ease.", inStock: true, lifeStage: "Senior" },

  // Gifts & Collections
  { id: "gift-new-parent-bundle", name: "New Cat Parent Starter Bundle", category: "gifts-collections", subcategory: "Starter Bundles", price: 1899, unit: "1 bundle", description: "A welcoming mix of feeding, play, and comfort essentials.", tag: "Staff pick", inStock: true },
  { id: "gift-grooming-box", name: "Grooming Essentials Gift Box", category: "gifts-collections", subcategory: "Gift Boxes", price: 999, unit: "1 box", description: "A neatly packaged set of grooming favourites, ready to gift.", inStock: true },
  { id: "gift-festive-collar-set", name: "Festive Bell Collar Set", category: "gifts-collections", subcategory: "Seasonal", price: 349, unit: "1 set", description: "A small seasonal touch for festive photos and visits.", inStock: true },
  { id: "gift-ceramic-mug", name: "Cat-Shaped Ceramic Mug", category: "gifts-collections", subcategory: "Lifestyle & Home", price: 399, unit: "1 mug", description: "A mug for the humans — for the quiet moments between playtime.", inStock: true, material: "Ceramic" },
];

type ImageCrop = { src: string; width: number; height: number; cx: number; cy: number; size: number };

const TOOLKIT_WIDE: Omit<ImageCrop, "cx" | "cy" | "size"> = { src: "/images/paw/toolkit-01.jpg", width: 1280, height: 650 };
const TOOLKIT_ROOM: Omit<ImageCrop, "cx" | "cy" | "size"> = { src: "/images/paw/toolkit-04.jpg", width: 1388, height: 995 };

// Square crops (centre + side length, in source pixels) of the two prototype-only toolkit photos.
// Only subcategories that the crop genuinely shows are mapped; the rest keep the icon tile.
export const SUBCATEGORY_IMAGES: Record<string, ImageCrop> = {
  "Water Fountains": { ...TOOLKIT_WIDE, cx: 100, cy: 430, size: 300 },
  "Automatic Feeders": { ...TOOLKIT_WIDE, cx: 250, cy: 270, size: 400 },
  "Feeding Bowls": { ...TOOLKIT_WIDE, cx: 630, cy: 385, size: 320 },
  "Beds": { ...TOOLKIT_WIDE, cx: 535, cy: 190, size: 340 },
  "Tunnels": { ...TOOLKIT_WIDE, cx: 780, cy: 175, size: 190 },
  "Carriers": { ...TOOLKIT_WIDE, cx: 1060, cy: 215, size: 400 },
  "Car Travel": { ...TOOLKIT_WIDE, cx: 1065, cy: 480, size: 330 },
  "Litter Boxes": { ...TOOLKIT_ROOM, cx: 285, cy: 480, size: 560 },
  "Cat Trees & Towers": { ...TOOLKIT_ROOM, cx: 640, cy: 210, size: 400 },
  "Scratching Posts": { ...TOOLKIT_ROOM, cx: 1010, cy: 690, size: 250 },
  "Wand Toys": { ...TOOLKIT_ROOM, cx: 760, cy: 585, size: 200 },
  "Treats": { ...TOOLKIT_ROOM, cx: 812, cy: 698, size: 200 },
  "Nail Care": { ...TOOLKIT_ROOM, cx: 745, cy: 840, size: 260 },
  "Brushes & Deshedding": { ...TOOLKIT_ROOM, cx: 900, cy: 880, size: 260 },
  "Safety Nets & Gates": { ...TOOLKIT_ROOM, cx: 115, cy: 170, size: 280 },
};

export const SUBCATEGORY_ICONS: Record<string, LucideIcon> = {
  "Dry Food": Wheat, "Wet Food": Soup, "Treats": Cookie, "Dental Treats": Smile, "Supplements": Pill, "Feeding Bowls": CookingPot, "Water Fountains": Droplet, "Automatic Feeders": Timer,
  "Wand Toys": Wand, "Catnip Toys": Sprout, "Interactive Toys": Zap, "Puzzle Feeders": Puzzle, "Tunnels": Tent, "Enrichment Kits": Boxes,
  "Beds": BedDouble, "Cat Trees & Towers": TreePine, "Window Perches": PanelTop, "Scratching Posts": Rows3, "Hideaways": House,
  "Brushes & Deshedding": Brush, "Bath & Shampoo": Bath, "Nail Care": Scissors, "Litter Boxes": Container, "Litter": Sparkles, "Cleaning Supplies": SprayCan,
  "Apparel": Shirt, "Collars": CircleDot, "Harnesses & Leashes": Link2, "ID Tags": IdCard,
  "Carriers": Luggage, "Car Travel": Car, "Outdoor Enclosures": Trees, "Travel Accessories": Backpack,
  "First Aid": BriefcaseMedical, "Flea & Tick Care": Bug, "Dental Care": Smile, "Mobility Support": Accessibility, "Wellness Supplements": Pill,
  "Smart Feeders & Fountains": Wifi, "Pet Cameras": Camera, "GPS Trackers": MapPin, "Safety Nets & Gates": Shield,
  "Kitten Essentials": Baby, "Senior Comfort": HeartHandshake, "Nursing & Weaning": Milk, "Mobility Aids": Footprints,
  "Gift Boxes": Gift, "Starter Bundles": Package, "Seasonal": Snowflake, "Lifestyle & Home": Lamp,
};

export const FILTER_SECTION_ICONS = { category: LayoutGrid, price: IndianRupee, lifeStage: Baby, material: Layers, size: Ruler, colour: Palette, availability: PackageCheck };

export function cropBackgroundStyle(crop: ImageCrop) {
  const clamp = (value: number) => Math.min(100, Math.max(0, value));
  const x = crop.width > crop.size ? clamp(((crop.cx - crop.size / 2) / (crop.width - crop.size)) * 100) : 50;
  const y = crop.height > crop.size ? clamp(((crop.cy - crop.size / 2) / (crop.height - crop.size)) * 100) : 50;
  return {
    backgroundImage: `url(${crop.src})`,
    backgroundSize: `${(crop.width / crop.size) * 100}% auto`,
    backgroundPosition: `${x}% ${y}%`,
    backgroundRepeat: "no-repeat",
  };
}

export function formatPrice(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}
