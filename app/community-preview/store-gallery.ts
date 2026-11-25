import gallery from "./store-gallery.json";
import type { Product } from "./store-data";

type GalleryCrop = { id: string; alt: string };

export type GalleryPhoto = { kind: "photo"; id: string; alt: string; src: string; card: string; thumb: string; sample: boolean };
export type GalleryPlate = { kind: "plate"; id: string; alt: string };
export type GalleryDetails = { kind: "details"; id: string; alt: string };
export type GallerySlide = GalleryPhoto | GalleryPlate | GalleryDetails;

const GALLERY_DIR = "/images/store/gallery/";

const SAMPLE_PHOTOS = new Map<string, GalleryPhoto>(
  (gallery.crops as GalleryCrop[]).map((crop) => [crop.id, {
    kind: "photo",
    id: crop.id,
    alt: crop.alt,
    src: `${GALLERY_DIR}${crop.id}.webp`,
    card: `${GALLERY_DIR}${crop.id}-card.webp`,
    thumb: `${GALLERY_DIR}${crop.id}-thumb.webp`,
    sample: true,
  }]),
);

// Sample imagery only: crops of user-supplied toolkit photos that genuinely show this kind of item.
// Products missing here (no matching object in any supplied photo) fall back to the concept plate.
const PRODUCT_PHOTOS: Record<string, string[]> = {
  "food-adult-kibble": ["bag-cat", "kibble-spill", "food-portion"],
  "food-kitten-starter": ["bag-tall", "food-portion", "kibble-spill"],
  "food-grain-free-salmon": ["food-portion", "bag-tall", "kibble-spill"],
  "food-freeze-dried-chicken": ["pouch-teal", "food-small-bag"],
  "food-ceramic-bowl-set": ["bowls-sage-ivory", "bowls-trio"],
  "toy-feather-wand": ["wand-feather", "play-feather", "wand-natural", "wand-orange"],
  "toy-crinkle-tunnel": ["tunnel-fabric"],
  "toy-catnip-mice": ["mouse-striped", "mouse-ball", "toys-assorted"],
  "furniture-plush-bed": ["bed-donut", "blanket-paw"],
  "furniture-scratch-tower": ["tree-cream", "perch-tower", "post-sisal"],
  "groom-slicker-brush": ["slicker-brush", "grooming-row"],
  "groom-nail-clipper": ["clipper-blue", "clipper-blue-b", "grooming-row"],
  "groom-covered-litter-box": ["litter-hooded", "litter-open", "litter-tray"],
  "groom-clumping-litter": ["litter-pellets", "scoop-grey"],
  "clothing-harness-leash-set": ["harness-green"],
  "travel-soft-carrier": ["carrier-soft", "case-black"],
  "travel-collapsible-bowls": ["bowls-blue", "bowl-blue-single"],
  "health-first-aid-kit": ["first-aid"],
  "health-dental-chews": ["food-small-bag", "pouch-teal"],
  "health-calming-diffuser": ["spray-calming"],
  "smart-auto-feeder": ["feeder-black", "fountain-steel"],
  "smart-balcony-net": ["window-net"],
  "kitten-starter-kit": ["flatlay-floor", "travel-kit"],
  "senior-orthopaedic-bed": ["blanket-paw", "bed-donut"],
  "gift-new-parent-bundle": ["travel-kit", "flatlay-rug", "flatlay-floor"],
  "gift-grooming-box": ["grooming-row", "slicker-brush"],
};

export function getProductPhotos(product: Product): GalleryPhoto[] {
  if (product.images && product.images.length > 0) {
    return product.images.map((image, index) => ({
      kind: "photo",
      id: `${product.id}-photo-${index + 1}`,
      alt: image.alt,
      src: image.src,
      card: image.src,
      thumb: image.src,
      sample: false,
    }));
  }
  return (PRODUCT_PHOTOS[product.id] ?? []).flatMap((id) => SAMPLE_PHOTOS.get(id) ?? []);
}

export function getProductGallery(product: Product): GallerySlide[] {
  const photos = getProductPhotos(product);
  const details: GalleryDetails = { kind: "details", id: "details", alt: `Details for ${product.name}` };
  if (photos.length > 0) return [...photos, details];
  return [{ kind: "plate", id: "plate", alt: `Concept artwork for ${product.name}` }, details];
}
