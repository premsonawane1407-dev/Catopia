// The invented market street (a labelled placeholder, not the real campus), loaded from its data file.
import { loadMap } from "./load-map";
import street from "./maps/market-street.json";

export const MARKET_STREET = loadMap(street);
