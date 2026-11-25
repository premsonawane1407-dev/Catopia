import { Coffee, Home, HeartHandshake, Stethoscope, ShoppingBag, Scissors, Cat, type LucideIcon } from "lucide-react";

export type PlaceCategory = "cat-cafe" | "shelter" | "adoption" | "veterinary" | "pet-shop" | "grooming" | "cat-friendly";

export type Place = {
  id: string;
  name: string;
  category: PlaceCategory;
  source: "openstreetmap" | "sample";
  verified: boolean;
  lat: number;
  lng: number;
  address?: string;
  phone?: string;
  website?: string;
  openingHours?: string;
  imageUrl?: string;
  description?: string;
};

export type Review = {
  id: string;
  placeId: string;
  author: string;
  rating: number;
  text: string;
  date: string;
};

export type Bbox = { south: number; west: number; north: number; east: number };

// Broad, public centre of the DYPIU Akurdi neighbourhood; not a precise animal location.
export const MAP_CENTER: [number, number] = [73.7602, 18.6460];

export const CATEGORY_ORDER: PlaceCategory[] = ["cat-cafe", "shelter", "adoption", "veterinary", "pet-shop", "grooming", "cat-friendly"];

export const CATEGORY_META: Record<PlaceCategory, { label: string; icon: LucideIcon; color: string }> = {
  "cat-cafe": { label: "Cat Cafes", icon: Coffee, color: "#c86f50" },
  shelter: { label: "Shelters", icon: Home, color: "#3f5945" },
  adoption: { label: "Adoption Centres", icon: HeartHandshake, color: "#a6639a" },
  veterinary: { label: "Veterinary Clinics", icon: Stethoscope, color: "#4f7a93" },
  "pet-shop": { label: "Pet Shops", icon: ShoppingBag, color: "#9a8550" },
  grooming: { label: "Grooming", icon: Scissors, color: "#7a6ba0" },
  "cat-friendly": { label: "Cat-friendly Places", icon: Cat, color: "#7c9a5e" },
};

// A handful of clearly-fictional concept listings for categories OpenStreetMap has no
// usable tag/data for locally (cat cafes, general "cat-friendly" spots). Every name and
// description says "sample"/"concept" outright so nobody mistakes these for real places.
export const SAMPLE_PLACES: Place[] = [
  {
    id: "sample-cat-cafe-1",
    name: "Whisker's Nook · Sample Cat Café",
    category: "cat-cafe",
    source: "sample",
    verified: false,
    lat: 18.6487,
    lng: 73.7634,
    address: "Concept location near DYPIU Akurdi",
    description: "A fictional concept café shown to demonstrate this category. Not a real business.",
  },
  {
    id: "sample-cat-cafe-2",
    name: "The Purring Press · Sample Cat Café",
    category: "cat-cafe",
    source: "sample",
    verified: false,
    lat: 18.6421,
    lng: 73.7581,
    address: "Concept location near Ravet Village Road",
    description: "A fictional concept café shown to demonstrate this category. Not a real business.",
  },
  {
    id: "sample-cat-friendly-1",
    name: "Riverside Reading Nook · Sample Cat-friendly Spot",
    category: "cat-friendly",
    source: "sample",
    verified: false,
    lat: 18.6512,
    lng: 73.7549,
    description: "A fictional concept listing to demonstrate this category. Not a verified cat-friendly venue.",
  },
  {
    id: "sample-adoption-1",
    name: "Second Chance Paws · Sample Adoption Drive",
    category: "adoption",
    source: "sample",
    verified: false,
    lat: 18.6456,
    lng: 73.7695,
    description: "A fictional concept listing to demonstrate this category. Not a real adoption centre.",
  },
];

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

const OVERPASS_FILTERS = ['node["amenity"="veterinary"]', 'node["shop"="pet"]', 'node["shop"="pet_grooming"]', 'node["amenity"="animal_shelter"]'];

function categorizeTags(tags: Record<string, string> | undefined): PlaceCategory | null {
  if (!tags) return null;
  if (tags.amenity === "veterinary") return "veterinary";
  if (tags.shop === "pet_grooming") return "grooming";
  if (tags.shop === "pet") return "pet-shop";
  if (tags.amenity === "animal_shelter") return "shelter";
  return null;
}

function toPlace(element: OverpassElement): Place | null {
  const category = categorizeTags(element.tags);
  if (!category) return null;
  const lat = element.lat ?? element.center?.lat;
  const lng = element.lon ?? element.center?.lon;
  const name = element.tags?.name;
  // Never invent a name for an unnamed OSM node — skip it instead of fabricating one.
  if (lat == null || lng == null || !name) return null;
  const addressParts = [element.tags?.["addr:housenumber"], element.tags?.["addr:street"], element.tags?.["addr:suburb"] ?? element.tags?.["addr:city"]].filter(Boolean);
  return {
    id: `osm-${element.type}-${element.id}`,
    name,
    category,
    source: "openstreetmap",
    verified: true,
    lat,
    lng,
    address: addressParts.length ? addressParts.join(", ") : undefined,
    phone: element.tags?.phone ?? element.tags?.["contact:phone"],
    website: element.tags?.website ?? element.tags?.["contact:website"],
    openingHours: element.tags?.opening_hours,
    imageUrl: element.tags?.image,
    description: element.tags?.description,
  };
}

// Queries real OpenStreetMap data (vet clinics, pet shops, grooming, shelters) within a
// bounding box via the public Overpass API. Returns [] on any failure so the caller can
// fall back to sample places with a clear message rather than showing a broken map.
export async function fetchOsmPlaces(bbox: Bbox, signal?: AbortSignal): Promise<Place[]> {
  const bboxStr = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  const query = `[out:json][timeout:20];(${OVERPASS_FILTERS.map((filter) => `${filter}(${bboxStr});`).join("")});out center tags;`;
  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal,
    });
    if (!response.ok) throw new Error("Overpass request failed");
    const data = (await response.json()) as { elements?: OverpassElement[] };
    const elements = data.elements ?? [];
    return elements.map(toPlace).filter((place): place is Place => place !== null);
  } catch {
    return [];
  }
}
