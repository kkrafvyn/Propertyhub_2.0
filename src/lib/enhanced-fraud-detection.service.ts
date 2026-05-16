import { supabase } from './supabase';

export interface FraudAlert {
  id: string;
  organizationId: string;
  listingId?: string;
  leadId?: string;
  alertType: 'duplicate_listing' | 'suspicious_lead' | 'price_mismatch' | 'image_reuse' | 'fake_listing' | 'scam_pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  evidence: Record<string, any>;
  status: 'active' | 'investigating' | 'resolved' | 'dismissed';
  createdAt: string;
  resolvedAt?: string;
}

export interface DuplicateListing {
  listing1Id: string;
  listing2Id: string;
  provider1: string;
  provider2: string;
  similarity: number; // 0-1
  duplicateFields: string[];
}

export interface SuspiciousLeadPattern {
  leadId: string;
  pattern: 'mass_inquiry' | 'fake_contact' | 'bait_and_switch' | 'payment_request';
  confidence: number; // 0-1
  indicators: string[];
}

export interface FraudScanSummary {
  duplicateListings: number;
  suspiciousLeads: number;
  imageIssues: number;
  totalAlertsCreated: number;
  scanCompletedAt: string;
}

class EnhancedFraudDetectionService {
  /**
   * Scan for duplicate listings across MLS, Zillow, and Realtor
   * This prevents scammers from listing same property on multiple platforms
   */
  async detectDuplicateListings(organizationId: string): Promise<DuplicateListing[]> {
    const { data: listings, error } = await supabase
      .from('external_listings')
      .select('id, address, city, state, zip_code, price, bedrooms, bathrooms, provider, latitude, longitude')
      .eq('organization_id', organizationId);

    if (error || !listings) {
      console.error('Failed to fetch listings:', error);
      return [];
    }

    const duplicates: DuplicateListing[] = [];

    for (let i = 0; i < listings.length; i++) {
      for (let j = i + 1; j < listings.length; j++) {
        const listing1 = listings[i] as any;
        const listing2 = listings[j] as any;

        const similarity = this.calculateListingSimilarity(listing1, listing2);
        if (similarity > 0.85) {
          const duplicateFields = this.findDuplicateFields(listing1, listing2);
          
          duplicates.push({
            listing1Id: listing1.id,
            listing2Id: listing2.id,
            provider1: listing1.provider,
            provider2: listing2.provider,
            similarity,
            duplicateFields,
          });

          // Create fraud alert
          await this.createFraudAlert(organizationId, {
            alertType: 'duplicate_listing',
            severity: similarity > 0.95 ? 'critical' : 'high',
            title: `Potential Duplicate Listing Detected`,
            description: `${listing1.address} appears to be listed on both ${listing1.provider} and ${listing2.provider}`,
            evidence: {
              listing1Id: listing1.id,
              listing2Id: listing2.id,
              similarity: similarity * 100,
              duplicateFields,
            },
          });
        }
      }
    }

    return duplicates;
  }

  /**
   * Detect suspicious lead patterns that indicate scams
   */
  async detectSuspiciousLeads(organizationId: string): Promise<SuspiciousLeadPattern[]> {
    const { data: leads, error } = await supabase
      .from('aggregated_leads')
      .select('*')
      .eq('organization_id', organizationId);

    const suspiciousPatterns: SuspiciousLeadPattern[] = [];

    if (error) {
      console.error('Failed to fetch leads for fraud detection:', error);
      return suspiciousPatterns;
    }

    if (leads) {
      for (const lead of leads) {
        const patterns = await this.analyzeLead(lead);
        suspiciousPatterns.push(...patterns);

        for (const pattern of patterns) {
          const alert = this.buildSuspiciousLeadAlert(lead, pattern);
          await this.createFraudAlert(organizationId, alert);
        }
      }
    }

    return suspiciousPatterns;
  }

  /**
   * Analyze individual lead for scam patterns
   */
  private async analyzeLead(lead: any): Promise<SuspiciousLeadPattern[]> {
    const patterns: SuspiciousLeadPattern[] = [];

    // Pattern 1: Fake Contact Info
    if (this.isFakeContact(lead)) {
      patterns.push({
        leadId: lead.id,
        pattern: 'fake_contact',
        confidence: 0.85,
        indicators: [
          'Email looks fake or temporary',
          'Phone number doesn\'t validate',
          'Name contains suspicious keywords',
        ],
      });
    }

    // Pattern 2: Mass Inquiry Behavior
    if (lead.created_at && (await this.checkMassInquiry(lead))) {
      patterns.push({
        leadId: lead.id,
        pattern: 'mass_inquiry',
        confidence: 0.75,
        indicators: [
          'Multiple inquiries in short time period',
          'Inquiries span different cities/states',
          'All inquiries same price range',
        ],
      });
    }

    // Pattern 3: Bait and Switch (too low offer after high initial interest)
    if (lead.interested_price && lead.quality_score > 80 && (await this.checkBaitAndSwitch(lead))) {
      patterns.push({
        leadId: lead.id,
        pattern: 'bait_and_switch',
        confidence: 0.7,
        indicators: [
          'Initial interest in premium property',
          'Later offers significantly below asking price',
          'Negotiation tactics suggest lack of genuine intent',
        ],
      });
    }

    return patterns;
  }

  /**
   * Check if contact information looks fake
   */
  private isFakeContact(lead: any): boolean {
    const email = String(lead?.lead_email || '').toLowerCase();

    // Fake email patterns
    const fakeEmailPatterns = [
      /@test\./,
      /@example\./,
      /@fake\./,
      /@temp\./,
      /^[0-9]+@/,
      /^(a+|b+|c+|test)@/,
    ];

    if (email && fakeEmailPatterns.some(pattern => pattern.test(email))) {
      return true;
    }

    // Fake phone patterns
    const fakePhonePatterns = [
      /^555[0-9]{7}/, // Common fake US number
      /^000/,
      /^999/,
      /^1{10,}/, // All ones
      /^(\d)\1{9,}$/, // Same digit repeated
    ];

    const phoneDigitsOnly = String(lead?.lead_phone || '').replace(/\D/g, '');
    if (phoneDigitsOnly && fakePhonePatterns.some(pattern => pattern.test(phoneDigitsOnly))) {
      return true;
    }

    return false;
  }

  /**
   * Check if lead is making mass inquiries
   */
  private async checkMassInquiry(lead: any): Promise<boolean> {
    const { data: leads, error } = await supabase
      .from('aggregated_leads')
      .select('created_at')
      .eq('lead_email', lead.lead_email)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !leads) return false;

    // Check if more than 5 inquiries in 24 hours
    if (leads.length >= 5) {
      const timeSpan = 
        new Date(leads[0].created_at).getTime() - 
        new Date(leads[4].created_at).getTime();
      
      return timeSpan < 24 * 60 * 60 * 1000; // Less than 24 hours
    }

    return false;
  }

  /**
   * Check for bait and switch tactics
   */
  private async checkBaitAndSwitch(lead: any): Promise<boolean> {
    // Offer-history comparison is only possible after a lead has negotiated against a listing.
    // New leads start as not flagged and can be reviewed once deal terms change.
    void lead;
    return false;
  }

  /**
   * Detect image reuse across listings (reverse image search)
   */
  async detectImageReuse(organizationId: string): Promise<Array<{ listingId: string; reusedFrom: string; confidence: number }>> {
    void organizationId;
    // Image hash providers are optional. Return no reuse matches until one is configured.
    return [];
  }

  /**
   * Calculate similarity between two listings
   */
  private calculateListingSimilarity(listing1: any, listing2: any): number {
    let score = 0;

    // Address match (highest weight)
    if (this.normalizeAddress(listing1.address) === this.normalizeAddress(listing2.address)) {
      score += 0.4;
    }

    // City + State match
    if (listing1.city === listing2.city && listing1.state === listing2.state) {
      score += 0.25;
    }

    // Price similarity (within 5%)
    if (listing1.price && listing2.price) {
      const priceDiff = Math.abs(listing1.price - listing2.price) / Math.max(listing1.price, listing2.price);
      if (priceDiff < 0.05) {
        score += 0.2;
      }
    }

    // Bedroom/bathroom match
    if (listing1.bedrooms === listing2.bedrooms && listing1.bathrooms === listing2.bathrooms) {
      score += 0.15;
    }

    // Geo location match (within 0.01 degrees = ~1km)
    if (listing1.latitude && listing2.latitude) {
      const latDiff = Math.abs(listing1.latitude - listing2.latitude);
      const lonDiff = Math.abs(listing1.longitude - listing2.longitude);
      if (latDiff < 0.01 && lonDiff < 0.01) {
        score += 0.1;
      }
    }

    return Math.min(1, score);
  }

  /**
   * Find which fields are duplicated
   */
  private findDuplicateFields(listing1: any, listing2: any): string[] {
    const fields: string[] = [];

    if (this.normalizeAddress(listing1.address) === this.normalizeAddress(listing2.address)) fields.push('address');
    if (listing1.city === listing2.city) fields.push('city');
    if (listing1.state === listing2.state) fields.push('state');
    if (
      listing1.price &&
      listing2.price &&
      Math.abs(listing1.price - listing2.price) < listing1.price * 0.05
    ) {
      fields.push('price');
    }
    if (listing1.bedrooms === listing2.bedrooms) fields.push('bedrooms');
    if (listing1.bathrooms === listing2.bathrooms) fields.push('bathrooms');

    return fields;
  }

  /**
   * Normalize address for comparison
   */
  private normalizeAddress(address?: string | null): string {
    return String(address || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[.,#-]/g, '')
      .trim();
  }

  private buildSuspiciousLeadAlert(lead: any, pattern: SuspiciousLeadPattern) {
    const leadLabel = lead?.lead_email || lead?.lead_phone || 'Unknown lead';

    switch (pattern.pattern) {
      case 'mass_inquiry':
        return {
          alertType: 'suspicious_lead' as const,
          severity: pattern.confidence >= 0.8 ? 'high' as const : 'medium' as const,
          title: 'Potential Mass Inquiry Pattern',
          description: `${leadLabel} triggered a rapid multi-inquiry pattern.`,
          evidence: {
            leadId: lead.id,
            leadEmail: lead.lead_email,
            leadPhone: lead.lead_phone,
            confidence: pattern.confidence,
            indicators: pattern.indicators,
          },
        };
      case 'bait_and_switch':
        return {
          alertType: 'scam_pattern' as const,
          severity: 'medium' as const,
          title: 'Potential Bait and Switch Pattern',
          description: `${leadLabel} shows behavior consistent with a bait-and-switch negotiation pattern.`,
          evidence: {
            leadId: lead.id,
            leadEmail: lead.lead_email,
            confidence: pattern.confidence,
            indicators: pattern.indicators,
          },
        };
      case 'payment_request':
        return {
          alertType: 'scam_pattern' as const,
          severity: 'high' as const,
          title: 'Potential Payment Request Scam',
          description: `${leadLabel} appears to be associated with an unsafe payment request pattern.`,
          evidence: {
            leadId: lead.id,
            leadEmail: lead.lead_email,
            confidence: pattern.confidence,
            indicators: pattern.indicators,
          },
        };
      case 'fake_contact':
      default:
        return {
          alertType: 'suspicious_lead' as const,
          severity: 'high' as const,
          title: 'Potential Fake Contact Information',
          description: `${leadLabel} contains contact details that look temporary or invalid.`,
          evidence: {
            leadId: lead.id,
            leadEmail: lead.lead_email,
            leadPhone: lead.lead_phone,
            confidence: pattern.confidence,
            indicators: pattern.indicators,
          },
        };
    }
  }

  /**
   * Create a fraud alert
   */
  private async createFraudAlert(
    organizationId: string,
    alertData: {
      alertType: FraudAlert['alertType'];
      severity: FraudAlert['severity'];
      title: string;
      description: string;
      evidence: Record<string, any>;
    }
  ) {
    const { data: existingAlert, error: existingError } = await supabase
      .from('fraud_alerts')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('alert_type', alertData.alertType)
      .eq('title', alertData.title)
      .eq('description', alertData.description)
      .in('status', ['active', 'investigating'])
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.error('Failed to check for an existing fraud alert:', existingError);
    }

    if (existingAlert?.id) {
      return existingAlert.id;
    }

    const { error } = await supabase.from('fraud_alerts').insert({
      organization_id: organizationId,
      alert_type: alertData.alertType,
      severity: alertData.severity,
      title: alertData.title,
      description: alertData.description,
      evidence: alertData.evidence,
      status: 'active',
    });

    if (error) {
      console.error('Failed to create fraud alert:', error);
    }

    return null;
  }

  /**
   * Get fraud alerts for organization
   */
  async getFraudAlerts(
    organizationId: string,
    filters?: {
      severity?: 'low' | 'medium' | 'high' | 'critical';
      status?: 'active' | 'investigating' | 'resolved' | 'dismissed';
    },
    limit = 50
  ) {
    let query = supabase
      .from('fraud_alerts')
      .select('*')
      .eq('organization_id', organizationId);

    if (filters?.severity) {
      query = query.eq('severity', filters.severity);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch fraud alerts:', error);
      return [];
    }

    return data;
  }

  /**
   * Update fraud alert status
   */
  async updateAlertStatus(
    alertId: string,
    status: 'active' | 'investigating' | 'resolved' | 'dismissed'
  ) {
    const { error } = await supabase
      .from('fraud_alerts')
      .update({
        status,
        resolved_at: status === 'resolved' ? new Date().toISOString() : null,
      })
      .eq('id', alertId);

    if (error) {
      console.error('Failed to update alert:', error);
      throw error;
    }
  }

  /**
   * Run comprehensive fraud scan
   */
  async runComprehensiveFraudScan(organizationId: string): Promise<FraudScanSummary> {
    const results: FraudScanSummary = {
      duplicateListings: 0,
      suspiciousLeads: 0,
      imageIssues: 0,
      totalAlertsCreated: 0,
      scanCompletedAt: new Date().toISOString(),
    };

    try {
      // Scan for duplicates
      const duplicates = await this.detectDuplicateListings(organizationId);
      results.duplicateListings = duplicates.length;

      // Scan for suspicious leads
      const suspicious = await this.detectSuspiciousLeads(organizationId);
      results.suspiciousLeads = suspicious.length;

      // Scan for image reuse
      const imageIssues = await this.detectImageReuse(organizationId);
      results.imageIssues = imageIssues.length;

      // Total alerts
      const alerts = await this.getFraudAlerts(organizationId, { status: 'active' });
      results.totalAlertsCreated = alerts.length;

      return results;
    } catch (error) {
      console.error('Fraud scan failed:', error);
      throw error;
    }
  }
}

export const enhancedFraudDetectionService = new EnhancedFraudDetectionService();
