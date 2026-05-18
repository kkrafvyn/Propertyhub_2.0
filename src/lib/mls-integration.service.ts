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

  /**
   * Sync listings from MLS provider
   */
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
      // Get credentials
      const credentials = await this.getMLSCredentials(organizationId, provider);
      if (!credentials.length) {
        throw new Error(`No ${provider} credentials found for organization`);
      }

      const cred = credentials[0];

      // Fetch listings based on provider
      let listings: ExternalListing[] = [];
      switch (provider) {
        case 'mls':
          listings = await this.fetchFromMLS(cred);
          break;
        case 'zillow':
          listings = await this.fetchFromZillow(cred);
          break;
        case 'realtor':
          listings = await this.fetchFromRealtor(cred);
          break;
      }

      // Sync listings to database
      const syncResult = await this.syncListingsToDatabase(organizationId, listings);

      // Update sync job
      await supabase
        .from('listing_sync_jobs')
        .update({
          status: 'completed',
          listings_sync: syncResult.successful,
          listings_failed: syncResult.failed,
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      // Update credentials last sync time
      await supabase
        .from('mls_credentials')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', cred.id);

      return {
        ...jobData,
        provider: jobData.provider as ListingSyncJob["provider"],
        organizationId: jobData.organization_id,
        status: 'completed',
        listingsSync: syncResult.successful,
        listingsFailed: syncResult.failed,
        startedAt: jobData.started_at,
        completedAt: new Date().toISOString(),
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

  /**
   * Fetch listings from MLS provider
   * Integration with actual MLS API (RETS protocol commonly used)
   */
  private async fetchFromMLS(credentials: any): Promise<ExternalListing[]> {
    // This would integrate with MLS RETS API
    // Each MLS has different endpoints, using a generic approach

    try {
      const response = await fetch(`https://rets-gateway.realogy.com/rets?Version=1.5`, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${btoa(`${credentials.api_key}:${credentials.api_secret}`)}`,
        },
      });

      if (!response.ok) {
        throw new Error(`MLS API error: ${response.statusText}`);
      }

      // Parse RETS response (simplified - actual RETS is complex)
      const data = await response.text();
      return this.parseMLSResponse(data);
    } catch (error) {
      console.error('MLS fetch error:', error);
      return [];
    }
  }

  /**
   * Fetch listings from Zillow API
   */
  private async fetchFromZillow(credentials: any): Promise<ExternalListing[]> {
    try {
      // Using Zillow API (requires API key from Zillow)
      const response = await fetch(`https://www.zillow.com/api/searchresults`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': credentials.api_key,
        },
        body: JSON.stringify({
          accountId: credentials.account_id,
        }),
      });

      if (!response.ok) {
        throw new Error(`Zillow API error: ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseZillowResponse(data);
    } catch (error) {
      console.error('Zillow fetch error:', error);
      return [];
    }
  }

  /**
   * Fetch listings from Realtor.com API
   */
  private async fetchFromRealtor(credentials: any): Promise<ExternalListing[]> {
    try {
      // Using Realtor.com API
      const response = await fetch(`https://api.realtor.com/listings/search`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${credentials.api_key}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Realtor.com API error: ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseRealtorResponse(data);
    } catch (error) {
      console.error('Realtor.com fetch error:', error);
      return [];
    }
  }

  /**
   * Parse MLS RETS response
   */
  private parseMLSResponse(data: string): ExternalListing[] {
    // Simplified parsing - actual RETS parsing is complex
    const listings: ExternalListing[] = [];
    // Parse RETS XML/text format
    return listings;
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
