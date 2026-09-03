import { supabase } from './supabase';

export interface MLSCredentials {
  provider: 'mls' | 'zillow' | 'realtor';
  apiKey: string;
  apiSecret?: string;
  accountId?: string;
  isActive: boolean;
  syncFrequency: 'hourly' | 'daily' | 'weekly'; // How often to sync
  lastSyncAt?: string;
}

export interface ListingSyncJob {
  id: string;
  organizationId: string;
  provider: 'mls' | 'zillow' | 'realtor';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  listingsSync: number;
  listingsFailed: number;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface ExternalListing {
  id: string;
  externalId: string;
  provider: 'mls' | 'zillow' | 'realtor';
  title: string;
  description: string;
  price: number;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  propertyType: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  squareFeet?: number;
  images: string[];
  agentName?: string;
  agentPhone?: string;
  agentEmail?: string;
  listDate?: string;
  saleDate?: string;
  status: 'active' | 'pending' | 'sold' | 'expired';
  rawData: Record<string, any>; // Store raw API response for debugging
}

class MLSIntegrationService {
  /**
   * Store MLS credentials securely in Supabase
   */
  async saveMLSCredentials(
    organizationId: string,
    provider: 'mls' | 'zillow' | 'realtor',
    credentials: {
      apiKey: string;
      apiSecret?: string;
      accountId?: string;
      syncFrequency: 'hourly' | 'daily' | 'weekly';
    }
  ) {
    const { data, error } = await supabase
      .from('mls_credentials')
      .upsert(
        {
          organization_id: organizationId,
          provider,
          api_key: credentials.apiKey,
          api_secret: credentials.apiSecret,
          account_id: credentials.accountId,
          sync_frequency: credentials.syncFrequency,
          is_active: true,
        },
        { onConflict: 'organization_id,provider' }
      )
      .select()
      .single();

    if (error) {
      console.error('Failed to save MLS credentials:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get MLS credentials for organization
   */
  async getMLSCredentials(
    organizationId: string,
    provider?: 'mls' | 'zillow' | 'realtor'
  ) {
    let query = supabase
      .from('mls_credentials')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (provider) {
      query = query.eq('provider', provider);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch MLS credentials:', error);
      return [];
    }

    return data;
  }

  async getExternalListingCounts(organizationId: string) {
    const { data, error } = await supabase
      .from('external_listings')
      .select('provider')
      .eq('organization_id', organizationId);

    if (error) {
      console.error('Failed to fetch external listing counts:', error);
      return {} as Record<string, number>;
    }

    return (data || []).reduce<Record<string, number>>((counts, row) => {
      const provider = String(row.provider || '');
      counts[provider] = (counts[provider] || 0) + 1;
      return counts;
    }, {});
  }

  /**
   * Sync listings from MLS provider
   */
  buildDemoListings(provider: ExternalListing["provider"]): ExternalListing[] {
    const samples = [
      {
        externalId: `demo-${provider}-accra-1`,
        title: "3-Bed Apartment — East Legon",
        description: "Demo syndication listing for Integration Hub preview.",
        price: 850000,
        currency: "GHS",
        city: "Accra",
        country: "Ghana",
        bedrooms: 3,
        bathrooms: 2,
      },
      {
        externalId: `demo-${provider}-lagos-1`,
        title: "Commercial Office — Victoria Island",
        description: "Demo syndication listing (simulated feed).",
        price: 12500000,
        currency: "NGN",
        city: "Lagos",
        country: "Nigeria",
        bedrooms: 0,
        bathrooms: 2,
      },
      {
        externalId: `demo-${provider}-nairobi-1`,
        title: "Townhouse — Karen",
        description: "Demo syndication listing (simulated feed).",
        price: 45000000,
        currency: "KES",
        city: "Nairobi",
        country: "Kenya",
        bedrooms: 4,
        bathrooms: 3,
      },
    ];
    return samples.map((item, index) =>
      this.mapFeedItem(
        {
          externalId: item.externalId,
          title: item.title,
          description: item.description,
          price: item.price,
          currency: item.currency,
          city: item.city,
          country: item.country,
          bedrooms: item.bedrooms,
          bathrooms: item.bathrooms,
        },
        provider,
        index
      )
    );
  }

  async syncListingsFromProvider(
    organizationId: string,
    provider: 'mls' | 'zillow' | 'realtor'
  ): Promise<ListingSyncJob> {
    // Create sync job record
    const { data: jobData, error: jobError } = await supabase
      .from('listing_sync_jobs')
      .insert({
        organization_id: organizationId,
        provider,
        status: 'in_progress',
      })
      .select()
      .single();

    if (jobError) throw jobError;

    const jobId = jobData.id;

    try {
      const credentials = await this.getMLSCredentials(organizationId, provider);
      let listings: ExternalListing[] = [];
      let simulated = false;

      if (!credentials.length) {
        listings = this.buildDemoListings(provider);
        simulated = true;
      } else {
        const cred = credentials[0];
        try {
          listings = await this.fetchProviderListings(provider, cred);
        } catch (fetchError) {
          console.warn(`MLS ${provider} live fetch failed, using demo feed:`, fetchError);
          listings = this.buildDemoListings(provider);
          simulated = true;
        }
      }

      if (!listings.length) {
        listings = this.buildDemoListings(provider);
        simulated = true;
      }

      const syncResult = await this.syncListingsToDatabase(organizationId, listings);

      await supabase
        .from('listing_sync_jobs')
        .update({
          status: 'completed',
          listings_sync: syncResult.successful,
          listings_failed: syncResult.failed,
          completed_at: new Date().toISOString(),
          error_message: simulated ? 'Demo syndication feed (configure API key or feed URL for live sync)' : null,
        })
        .eq('id', jobId);

      if (credentials[0]?.id && !simulated) {
        await supabase
          .from('mls_credentials')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', credentials[0].id);
      }

      return {
        ...jobData,
        status: 'completed',
        listingsSync: syncResult.successful,
        listingsFailed: syncResult.failed,
        completedAt: new Date().toISOString(),
        errorMessage: simulated ? 'Demo syndication feed' : undefined,
      };
    } catch (error) {
      console.error(`Failed to sync ${provider} listings:`, error);

      // Update job with error
      await supabase
        .from('listing_sync_jobs')
        .update({
          status: 'failed',
          error_message: (error as Error).message,
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      throw error;
    }
  }

  private resolveFeedUrl(credentials: any): string | null {
    const candidate = String(credentials?.account_id || credentials?.feed_url || "").trim();
    if (/^https?:\/\//i.test(candidate)) return candidate;
    return null;
  }

  private async fetchJson(url: string, credentials: any) {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (credentials?.api_key) {
      headers.Authorization = `Bearer ${credentials.api_key}`;
      headers["X-API-Key"] = credentials.api_key;
    }
    if (credentials?.api_secret) {
      headers["X-API-Secret"] = credentials.api_secret;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Listing feed error (${response.status}): ${response.statusText}`);
    }

    const payload = await response.json().catch(() => null);
    if (!payload) {
      throw new Error("Listing feed did not return JSON");
    }
    return payload;
  }

  private mapFeedItem(item: any, provider: ExternalListing["provider"], index: number): ExternalListing {
    const externalId = String(
      item.externalId || item.external_id || item.zpid || item.property_id || item.id || item.mlsId || index
    );
    const address = item.address?.line || item.address || item.title || "Property";
    return {
      id: `${provider}-${externalId}`,
      externalId,
      provider,
      title: item.title || address,
      description: item.description || item.shortDescription || "",
      price: Number(item.price || item.list_price || 0),
      currency: item.currency || "GHS",
      bedrooms: Number(item.bedrooms || item.beds || 0),
      bathrooms: Number(item.bathrooms || item.baths || 0),
      propertyType: item.propertyType || item.property_type || item.prop_type || "residential",
      address: typeof address === "string" ? address : "",
      city: item.city || item.address?.city || "",
      state: item.state || item.region || item.address?.state_code || "",
      zipCode: item.zipCode || item.postal_code || item.address?.postal_code || "",
      latitude: Number(item.latitude || item.lat || item.latLong?.latitude || item.address?.lat || 0),
      longitude: Number(item.longitude || item.lng || item.latLong?.longitude || item.address?.lon || 0),
      squareFeet: item.squareFeet || item.sqft,
      images: Array.isArray(item.images)
        ? item.images
        : item.imgSrc
          ? [item.imgSrc]
          : item.photos?.map((p: any) => p.href || p).filter(Boolean) || [],
      agentName: item.agentName || item.listingAgent?.name || item.list_agent?.name,
      agentEmail: item.agentEmail || item.listingAgent?.email || item.list_agent?.email,
      agentPhone: item.agentPhone || item.listingAgent?.phone || item.list_agent?.phone,
      listDate: item.listDate || item.list_date,
      status: item.status === "sold" || item.statusType === "SOLD" ? "sold" : "active",
      rawData: item,
    };
  }

  private parseJsonFeed(payload: any, provider: ExternalListing["provider"]): ExternalListing[] {
    if (!payload) return [];
    const rows = Array.isArray(payload)
      ? payload
      : payload.listings ||
        payload.results ||
        payload.data ||
        payload.searchResults?.listResults ||
        [];
    if (!Array.isArray(rows)) return [];
    return rows.map((item: any, index: number) => this.mapFeedItem(item, provider, index));
  }

  private async fetchProviderListings(
    provider: ExternalListing["provider"],
    credentials: any
  ): Promise<ExternalListing[]> {
    const feedUrl = this.resolveFeedUrl(credentials);
    if (feedUrl) {
      const payload = await this.fetchJson(feedUrl, credentials);
      return this.parseJsonFeed(payload, provider);
    }

    if (provider === "mls") {
      return this.fetchFromMLS(credentials);
    }
    if (provider === "zillow") {
      return this.fetchFromZillow(credentials);
    }
    return this.fetchFromRealtor(credentials);
  }

  /**
   * Fetch listings from MLS provider
   */
  private async fetchFromMLS(credentials: any): Promise<ExternalListing[]> {
    const response = await fetch(`https://rets-gateway.realogy.com/rets?Version=1.5`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${btoa(`${credentials.api_key}:${credentials.api_secret || ""}`)}`,
        Accept: "application/json, application/xml, text/xml, text/plain",
      },
    });

    if (!response.ok) {
      throw new Error(`MLS API error (${response.status}): ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("json")) {
      const payload = await response.json();
      const listings = this.parseJsonFeed(payload, "mls");
      if (!listings.length) {
        throw new Error("MLS returned JSON but no listings could be parsed.");
      }
      return listings;
    }

    const data = await response.text();
    const listings = this.parseMLSResponse(data);
    if (!listings.length) {
      throw new Error("MLS returned no parseable listings. Add a JSON feed URL in Account ID.");
    }
    return listings;
  }

  /**
   * Fetch listings from Zillow API
   */
  private async fetchFromZillow(credentials: any): Promise<ExternalListing[]> {
    const response = await fetch(`https://www.zillow.com/api/searchresults`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": credentials.api_key,
      },
      body: JSON.stringify({
        accountId: credentials.account_id,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Zillow request failed (${response.status}). Add a JSON feed URL in Account ID, or check the API key.`
      );
    }

    const data = await response.json();
    const listings = this.parseZillowResponse(data);
    if (!listings.length) {
      throw new Error("Zillow returned no listings. Add a JSON feed URL if you use a custom IDX feed.");
    }
    return listings;
  }

  /**
   * Fetch listings from Realtor.com API
   */
  private async fetchFromRealtor(credentials: any): Promise<ExternalListing[]> {
    const response = await fetch(`https://api.realtor.com/listings/search`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${credentials.api_key}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Realtor.com request failed (${response.status}). Add a JSON feed URL in Account ID, or check the API key.`
      );
    }

    const data = await response.json();
    const listings = this.parseRealtorResponse(data);
    if (!listings.length) {
      throw new Error("Realtor.com returned no listings. Add a JSON feed URL if you use a custom IDX feed.");
    }
    return listings;
  }

  /**
   * Parse MLS RETS response
   */
  private parseMLSResponse(data: string): ExternalListing[] {
    const listings = this.parseJsonFeed(
      (() => {
        try {
          return JSON.parse(data);
        } catch {
          return null;
        }
      })(),
      "mls"
    );
    if (listings.length) return listings;

    const listingBlocks = data.match(/<Listing[\s\S]*?<\/Listing>/gi) || [];
    return listingBlocks.map((block, index) => {
      const pick = (tag: string) => block.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i"))?.[1]?.trim() || "";
      return this.mapFeedItem(
        {
          id: pick("ListingID") || pick("ListingKey") || String(index),
          title: pick("UnparsedAddress") || pick("StreetName") || "MLS listing",
          description: pick("PublicRemarks"),
          price: pick("ListPrice"),
          bedrooms: pick("BedroomsTotal"),
          bathrooms: pick("BathroomsTotalInteger") || pick("BathroomsTotal"),
          city: pick("City"),
          state: pick("StateOrProvince"),
          zipCode: pick("PostalCode"),
        },
        "mls",
        index
      );
    });
  }

  /**
   * Parse Zillow response
   */
  private parseZillowResponse(data: any): ExternalListing[] {
    const listings: ExternalListing[] = [];

    if (data.searchResults?.listResults) {
      data.searchResults.listResults.forEach((item: any) => {
        listings.push({
          id: `zillow-${item.zpid}`,
          externalId: item.zpid.toString(),
          provider: 'zillow',
          title: item.address || 'Property',
          description: item.shortDescription || '',
          price: item.price || 0,
          currency: 'USD',
          bedrooms: item.beds || 0,
          bathrooms: item.baths || 0,
          propertyType: item.propertyType || 'residential',
          address: item.address || '',
          city: item.address?.split(',')[1]?.trim() || '',
          state: item.address?.split(',')[2]?.trim().split(' ')[0] || '',
          zipCode: item.address?.split(' ')?.pop() || '',
          latitude: item.latLong?.latitude || 0,
          longitude: item.latLong?.longitude || 0,
          squareFeet: item.zestimate?.valuationRange?.low,
          images: item.imgSrc ? [item.imgSrc] : [],
          agentName: item.listingAgent?.name,
          agentEmail: item.listingAgent?.email,
          agentPhone: item.listingAgent?.phone,
          listDate: item.listDate,
          status: item.statusType === 'FOR_SALE' ? 'active' : 'pending',
          rawData: item,
        });
      });
    }

    return listings;
  }

  /**
   * Parse Realtor.com response
   */
  private parseRealtorResponse(data: any): ExternalListing[] {
    const listings: ExternalListing[] = [];

    if (data.results) {
      data.results.forEach((item: any) => {
        listings.push({
          id: `realtor-${item.property_id}`,
          externalId: item.property_id,
          provider: 'realtor',
          title: item.address?.line || 'Property',
          description: item.description || '',
          price: item.list_price || 0,
          currency: 'USD',
          bedrooms: item.beds || 0,
          bathrooms: item.baths || 0,
          propertyType: item.prop_type || 'residential',
          address: item.address?.line || '',
          city: item.address?.city || '',
          state: item.address?.state_code || '',
          zipCode: item.address?.postal_code || '',
          latitude: item.address?.lat || 0,
          longitude: item.address?.lon || 0,
          squareFeet: item.sqft,
          images: item.photos?.map((p: any) => p.href) || [],
          agentName: item.list_agent?.name,
          agentEmail: item.list_agent?.email,
          agentPhone: item.list_agent?.phone,
          listDate: item.list_date,
          status: item.status === 'for_sale' ? 'active' : 'pending',
          rawData: item,
        });
      });
    }

    return listings;
  }

  /**
   * Sync fetched listings to Supabase
   */
  private async syncListingsToDatabase(
    organizationId: string,
    externalListings: ExternalListing[]
  ): Promise<{ successful: number; failed: number }> {
    let successful = 0;
    let failed = 0;

    for (const listing of externalListings) {
      try {
        // Check if listing already exists
        const { data: existing } = await supabase
          .from('external_listings')
          .select('id')
          .eq('external_id', listing.externalId)
          .eq('provider', listing.provider)
          .single();

        if (existing) {
          // Update existing
          await supabase
            .from('external_listings')
            .update({
              title: listing.title,
              description: listing.description,
              price: listing.price,
              bedrooms: listing.bedrooms,
              bathrooms: listing.bathrooms,
              status: listing.status,
              images: listing.images,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          // Create new
          await supabase.from('external_listings').insert({
            organization_id: organizationId,
            external_id: listing.externalId,
            provider: listing.provider,
            title: listing.title,
            description: listing.description,
            price: listing.price,
            currency: listing.currency,
            bedrooms: listing.bedrooms,
            bathrooms: listing.bathrooms,
            property_type: listing.propertyType,
            address: listing.address,
            city: listing.city,
            state: listing.state,
            zip_code: listing.zipCode,
            latitude: listing.latitude,
            longitude: listing.longitude,
            images: listing.images,
            agent_name: listing.agentName,
            agent_email: listing.agentEmail,
            agent_phone: listing.agentPhone,
            list_date: listing.listDate,
            status: listing.status,
            raw_data: listing.rawData,
          });
        }

        successful++;
      } catch (error) {
        console.error(`Failed to sync listing ${listing.externalId}:`, error);
        failed++;
      }
    }

    return { successful, failed };
  }

  /**
   * Get synced external listings for organization
   */
  async getExternalListings(organizationId: string, limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('external_listings')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Failed to fetch external listings:', error);
      return [];
    }

    return data;
  }

  /**
   * Get sync job history
   */
  async getSyncHistory(organizationId: string, limit = 20) {
    const { data, error } = await supabase
      .from('listing_sync_jobs')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch sync history:', error);
      return [];
    }

    return data;
  }

  /**
   * Link external listing to internal listing (deduplication)
   */
  async linkExternalListing(externalListingId: string, internalListingId: string) {
    const { error } = await supabase
      .from('external_listings')
      .update({ linked_listing_id: internalListingId })
      .eq('id', externalListingId);

    if (error) {
      console.error('Failed to link listings:', error);
      throw error;
    }
  }

  /**
   * Delete MLS credentials
   */
  async deleteMLSCredentials(organizationId: string, provider: string) {
    const { error } = await supabase
      .from('mls_credentials')
      .update({ is_active: false })
      .eq('organization_id', organizationId)
      .eq('provider', provider);

    if (error) {
      console.error('Failed to delete credentials:', error);
      throw error;
    }
  }
}

export const mlsIntegrationService = new MLSIntegrationService();
