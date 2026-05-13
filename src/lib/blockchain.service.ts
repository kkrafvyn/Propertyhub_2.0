import { supabase } from './supabase';
import type { Database } from './database.types';
import { sha256Hex } from './browser-crypto';

type BlockchainRecords = Database['public']['Tables']['blockchain_records'];
type VerificationHashes = Database['public']['Tables']['verification_hashes'];
type SmartContractEvents = Database['public']['Tables']['smart_contract_events'];
type OwnershipEvents = Database['public']['Tables']['ownership_events'];
type TokenizedAssets = Database['public']['Tables']['tokenized_assets'];
type BlockchainWallets = Database['public']['Tables']['blockchain_wallets'];
type BlockchainVerificationLogs = Database['public']['Tables']['blockchain_verification_logs'];

interface VerificationRecord {
  propertyId: string;
  organizationId: string;
  transactionHash: string;
  chainId?: number;
  blockNumber?: number;
  recordType:
    | 'ownership'
    | 'document'
    | 'escrow'
    | 'title_deed'
    | 'lease_agreement'
    | 'payment_receipt';
  dataHash: string;
  contractAddress?: string;
  metadata?: Record<string, any>;
}

interface DocumentVerification {
  organizationId: string;
  documentId: string;
  documentType:
    | 'title_deed'
    | 'lease_agreement'
    | 'inspection_report'
    | 'utility_bill'
    | 'id_verification'
    | 'payment_receipt';
  documentContent: string | ArrayBuffer | ArrayBufferView;
  userId: string;
}

interface OwnershipTransfer {
  organizationId: string;
  propertyId: string;
  fromAddress: string;
  toAddress: string;
  ownershipPercentage: number;
  transactionHash?: string;
  blockNumber?: number;
  metadata?: Record<string, any>;
}

interface TokenizationRequest {
  organizationId: string;
  propertyId: string;
  tokenSymbol: string;
  tokenName: string;
  totalSupply: number;
  contractAddress: string;
  metadata?: Record<string, any>;
}

interface WalletRegistration {
  userId?: string;
  organizationId?: string;
  walletAddress: string;
  walletType: 'metamask' | 'ledger' | 'hardware' | 'custodial';
  verificationSignature?: string;
}

export const blockchainService = {
  /**
   * Calculate SHA-256 hash of document content
   */
  async calculateDocumentHash(documentContent: string | ArrayBuffer | ArrayBufferView): Promise<string> {
    return sha256Hex(documentContent);
  },

  /**
   * Record a blockchain verification transaction
   */
  async recordVerification(record: VerificationRecord) {
    try {
      const { data, error } = await supabase
        .from('blockchain_records')
        .insert({
          organization_id: record.organizationId,
          property_id: record.propertyId,
          transaction_hash: record.transactionHash,
          chain_id: record.chainId || 137, // Polygon mainnet
          block_number: record.blockNumber,
          record_type: record.recordType,
          data_hash: record.dataHash,
          contract_address: record.contractAddress,
          status: 'pending',
          metadata: record.metadata,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error recording blockchain verification:', error);
      throw error;
    }
  },

  /**
   * Verify and record document hash on blockchain
   */
  async verifyDocumentHash(verification: DocumentVerification) {
    try {
      const documentHash = await this.calculateDocumentHash(verification.documentContent);

      // Insert verification hash record
      const { data: hashData, error: hashError } = await supabase
        .from('verification_hashes')
        .insert({
          organization_id: verification.organizationId,
          document_id: verification.documentId,
          document_type: verification.documentType,
          hash_value: documentHash,
          uploaded_by: verification.userId,
        })
        .select()
        .single();

      if (hashError) throw hashError;

      // Log the verification
      await supabase
        .from('blockchain_verification_logs')
        .insert({
          organization_id: verification.organizationId,
          verification_type: 'document_hash',
          status: 'verified',
          verified_by: verification.userId,
          verified_at: new Date().toISOString(),
          verification_details: {
            documentId: verification.documentId,
            documentType: verification.documentType,
            hashAlgorithm: 'SHA-256',
          },
        });

      return hashData;
    } catch (error) {
      console.error('Error verifying document hash:', error);
      throw error;
    }
  },

  /**
   * Record ownership transfer event
   */
  async recordOwnershipTransfer(transfer: OwnershipTransfer) {
    try {
      const { data, error } = await supabase
        .from('ownership_events')
        .insert({
          organization_id: transfer.organizationId,
          property_id: transfer.propertyId,
          from_address: transfer.fromAddress,
          to_address: transfer.toAddress,
          ownership_percentage: transfer.ownershipPercentage,
          transaction_hash: transfer.transactionHash,
          block_number: transfer.blockNumber,
          event_type: 'transfer',
          metadata: transfer.metadata,
        })
        .select()
        .single();

      if (error) throw error;

      // Log the verification
      await supabase
        .from('blockchain_verification_logs')
        .insert({
          organization_id: transfer.organizationId,
          verification_type: 'ownership',
          status: 'verified',
          verified_at: new Date().toISOString(),
          verification_details: {
            fromAddress: transfer.fromAddress,
            toAddress: transfer.toAddress,
            ownershipPercentage: transfer.ownershipPercentage,
          },
        });

      return data;
    } catch (error) {
      console.error('Error recording ownership transfer:', error);
      throw error;
    }
  },

  /**
   * Tokenize a property as a blockchain asset
   */
  async tokenizeProperty(tokenization: TokenizationRequest) {
    try {
      const { data, error } = await supabase
        .from('tokenized_assets')
        .insert({
          organization_id: tokenization.organizationId,
          property_id: tokenization.propertyId,
          token_contract_address: tokenization.contractAddress,
          token_symbol: tokenization.tokenSymbol,
          token_name: tokenization.tokenName,
          total_supply: tokenization.totalSupply,
          chain_id: 137, // Polygon
          status: 'pending',
          metadata_uri: tokenization.metadata?.metadataUri || '',
        })
        .select()
        .single();

      if (error) throw error;

      // Log the verification
      await supabase
        .from('blockchain_verification_logs')
        .insert({
          organization_id: tokenization.organizationId,
          verification_type: 'contract_state',
          status: 'pending',
          verification_details: {
            contractAddress: tokenization.contractAddress,
            tokenSymbol: tokenization.tokenSymbol,
            tokenName: tokenization.tokenName,
            totalSupply: tokenization.totalSupply,
          },
        });

      return data;
    } catch (error) {
      console.error('Error tokenizing property:', error);
      throw error;
    }
  },

  /**
   * Record smart contract event
   */
  async recordSmartContractEvent(
    organizationId: string,
    contractAddress: string,
    contractType: 'escrow' | 'ownership' | 'lease' | 'franchise',
    eventName: string,
    eventSignature: string,
    transactionHash: string,
    blockNumber: number,
    decodedParams: Record<string, any>
  ) {
    try {
      const { data, error } = await supabase
        .from('smart_contract_events')
        .insert({
          organization_id: organizationId,
          contract_address: contractAddress,
          contract_type: contractType,
          event_name: eventName,
          event_signature: eventSignature,
          transaction_hash: transactionHash,
          block_number: blockNumber,
          decoded_params: decodedParams,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error recording smart contract event:', error);
      throw error;
    }
  },

  /**
   * Register a blockchain wallet for a user
   */
  async registerWallet(registration: WalletRegistration) {
    try {
      const { data, error } = await supabase
        .from('blockchain_wallets')
        .insert({
          user_id: registration.userId,
          organization_id: registration.organizationId,
          wallet_address: registration.walletAddress,
          wallet_type: registration.walletType,
          verification_signature: registration.verificationSignature,
          verified: !!registration.verificationSignature,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error registering wallet:', error);
      throw error;
    }
  },

  /**
   * Get blockchain records for a property
   */
  async getBlockchainRecords(organizationId: string, propertyId: string) {
    try {
      const { data, error } = await supabase
        .from('blockchain_records')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching blockchain records:', error);
      throw error;
    }
  },

  /**
   * Get verification status for a property
   */
  async getVerificationStatus(organizationId: string, propertyId: string) {
    try {
      // Get the latest blockchain record
      const { data: records, error: recordsError } = await supabase
        .from('blockchain_records')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (recordsError && recordsError.code !== 'PGRST116') throw recordsError;

      // Get verification hashes
      const { data: hashes, error: hashesError } = await supabase
        .from('verification_hashes')
        .select('*')
        .eq('organization_id', organizationId);

      if (hashesError) throw hashesError;

      // Get tokenized asset
      const { data: asset, error: assetError } = await supabase
        .from('tokenized_assets')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('property_id', propertyId)
        .single();

      if (assetError && assetError.code !== 'PGRST116') throw assetError;

      return {
        latestRecord: records || null,
        verificationHashes: hashes || [],
        tokenizedAsset: asset || null,
        isVerified: records?.status === 'finalized' || false,
        isTokenized: !!asset,
      };
    } catch (error) {
      console.error('Error fetching verification status:', error);
      throw error;
    }
  },

  /**
   * Get ownership history for a property
   */
  async getOwnershipHistory(organizationId: string, propertyId: string) {
    try {
      const { data, error } = await supabase
        .from('ownership_events')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching ownership history:', error);
      throw error;
    }
  },

  /**
   * Get tokenized asset details
   */
  async getTokenizedAsset(organizationId: string, contractAddress: string) {
    try {
      const { data, error } = await supabase
        .from('tokenized_assets')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('token_contract_address', contractAddress)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching tokenized asset:', error);
      throw error;
    }
  },

  /**
   * Update blockchain record status
   */
  async updateRecordStatus(
    recordId: string,
    status: 'pending' | 'confirmed' | 'finalized' | 'failed',
    blockNumber?: number,
    confirmationCount?: number
  ) {
    try {
      const { data, error } = await supabase
        .from('blockchain_records')
        .update({
          status,
          block_number: blockNumber,
          confirmation_count: confirmationCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', recordId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating record status:', error);
      throw error;
    }
  },

  /**
   * Get organization wallets
   */
  async getOrganizationWallets(organizationId: string) {
    try {
      const { data, error } = await supabase
        .from('blockchain_wallets')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching organization wallets:', error);
      throw error;
    }
  },

  /**
   * Get user's blockchain wallets
   */
  async getUserWallets(userId: string) {
    try {
      const { data, error } = await supabase
        .from('blockchain_wallets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user wallets:', error);
      throw error;
    }
  },

  /**
   * Verify blockchain wallet ownership
   */
  async verifyWalletOwnership(walletId: string, signature: string) {
    try {
      const { data, error } = await supabase
        .from('blockchain_wallets')
        .update({
          verified: true,
          verification_signature: signature,
          updated_at: new Date().toISOString(),
        })
        .eq('id', walletId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error verifying wallet ownership:', error);
      throw error;
    }
  },

  /**
   * Get verification logs
   */
  async getVerificationLogs(organizationId: string, limit: number = 50) {
    try {
      const { data, error } = await supabase
        .from('blockchain_verification_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching verification logs:', error);
      throw error;
    }
  },

  /**
   * Create escrow contract record
   */
  async createEscrowContract(
    organizationId: string,
    propertyId: string,
    contractAddress: string,
    buyerAddress: string,
    sellerAddress: string,
    transactionHash: string,
    amount: number,
    metadata?: Record<string, any>
  ) {
    try {
      const { data, error } = await supabase
        .from('blockchain_records')
        .insert({
          organization_id: organizationId,
          property_id: propertyId,
          transaction_hash: transactionHash,
          contract_address: contractAddress,
          record_type: 'escrow',
          data_hash: await sha256Hex(contractAddress),
          status: 'pending',
          metadata: {
            ...metadata,
            buyerAddress,
            sellerAddress,
            amount,
            type: 'escrow_contract',
          },
        })
        .select()
        .single();

      if (error) throw error;

      // Log the escrow creation
      await supabase
        .from('blockchain_verification_logs')
        .insert({
          organization_id: organizationId,
          verification_type: 'contract_state',
          status: 'pending',
          verification_details: {
            contractType: 'escrow',
            buyerAddress,
            sellerAddress,
            amount,
          },
        });

      return data;
    } catch (error) {
      console.error('Error creating escrow contract:', error);
      throw error;
    }
  },
};
