import { GHANA_REGIONS, POPULAR_SEARCH_LOCATIONS } from "../../../lib/search-locations";
const locations = [...new Set([...POPULAR_SEARCH_LOCATIONS, ...GHANA_REGIONS.map((region) => region.capital), "Tema"])];
/** Native suggestions preserve free-text searches and keyboard support. */
export function LocationSuggestions({ id }: { id: string }) {
  return <datalist id={id}>{locations.map((location) => <option key={location} value={location} />)}</datalist>;
}
