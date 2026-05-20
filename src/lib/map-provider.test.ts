import { buildPublicMapUrl, getPublicMapProviderConfig } from "./map-provider";

describe("map provider helpers", () => {
  it("builds a coordinate-based public map link when coordinates exist", () => {
    expect(buildPublicMapUrl({ latitude: 5.6037, longitude: -0.187, zoom: 14 })).toBe(
      "https://www.openstreetmap.org/?mlat=5.6037&mlon=-0.187#map=14/5.6037/-0.187"
    );
  });

  it("falls back to an OpenStreetMap query when coordinates are missing", () => {
    expect(buildPublicMapUrl({ query: "Airport Residential, Accra" })).toBe(
      "https://www.openstreetmap.org/search?query=Airport%20Residential%2C%20Accra"
    );
  });

  it("uses OpenStreetMap by default when no explicit provider key is configured", () => {
    const config = getPublicMapProviderConfig();

    expect(config.provider).toBe("openstreetmap");
    expect(config.tileUrl).toContain("openstreetmap.org");
  });
});
