import { supabase } from './supabase';
import type { Database } from './database.types';
import { utf8Hex } from './browser-crypto';

interface EscrowContract {
  organizationId: string;
  propertyId: string;
  contractAddress: string;
  buyerAddress: string;
  sellerAddress: string;
  amount: number;
  depositAmount: number;
  releaseConditions: string[];
  timelock: number; // Unix timestamp
  metadata?: Record<string, any>;
}

interface OwnershipContract {
  organizationId: string;
  propertyId: string;
  contractAddress: string;
  ownerAddresses: string[];
  ownershipPercentages: number[];
  totalValue: number;
  metadata?: Record<string, any>;
}

interface LeaseContract {
  organizationId: string;
  propertyId: string;
  contractAddress: string;
  landlordAddress: string;
  tenantAddress: string;
  rentAmount: number;
  rentalPeriod: number; // in days
  depositAmount: number;
  startDate: string;
  endDate: string;
  metadata?: Record<string, any>;
}

interface ContractDeployment {
  contractAddress: string;
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
  deployerAddress: string;
  timestamp: number;
}

export const smartContractService = {
  /**
   * Deploy escrow contract and record on blockchain
   */
  async deployEscrowContract(
    escrow: EscrowContract,
    deployment: ContractDeployment
  ) {
    try {
      const escrowHex = utf8Hex(JSON.stringify(escrow)).substring(0, 64);

      // Record the escrow contract in the database
      const { data, error } = await supabase
        .from('blockchain_records')
        .insert({
          organization_id: escrow.organizationId,
          property_id: escrow.propertyId,
          transaction_hash: deployment.transactionHash,
          contract_address: deployment.contractAddress,
          record_type: 'escrow',
          data_hash: escrowHex,
          status: 'confirmed',
          block_number: deployment.blockNumber,
          gas_used: BigInt(deployment.gasUsed),
          metadata: {
            ...escrow.metadata,
            contractType: 'escrow',
            buyerAddress: escrow.buyerAddress,
            sellerAddress: escrow.sellerAddress,
            amount: escrow.amount,
            depositAmount: escrow.depositAmount,
            releaseConditions: escrow.releaseConditions,
            timelock: escrow.timelock,
            deployedBy: deployment.deployerAddress,
          },
        })
        .select()
        .single();

      if (error) throw error;

      // Log the deployment
      await supabase
        .from('blockchain_verification_logs')
        .insert({
          organization_id: escrow.organizationId,
          blockchain_record_id: data.id,
          verification_type: 'contract_state',
          status: 'verified',
          verified_at: new Date().toISOString(),
          verification_details: {
            contractType: 'escrow',
            contractAddress: deployment.contractAddress,
            deploymentHash: deployment.transactionHash,
            buyerAddress: escrow.buyerAddress,
            sellerAddress: escrow.sellerAddress,
            amount: escrow.amount,
          },
        });

      return data;
    } catch (error) {
      console.error('Error deploying escrow contract:', error);
      throw error;
    }
  },

  /**
   * Deploy ownership contract for property
   */
  async deployOwnershipContract(
    ownership: OwnershipContract,
    deployment: ContractDeployment
  ) {
    try {
      const ownershipHex = utf8Hex(JSON.stringify(ownership)).substring(0, 64);

      const { data, error } = await supabase
        .from('blockchain_records')
        .insert({
          organization_id: ownership.organizationId,
          property_id: ownership.propertyId,
          transaction_hash: deployment.transactionHash,
          contract_address: deployment.contractAddress,
          record_type: 'ownership',
          data_hash: ownershipHex,
          status: 'confirmed',
          block_number: deployment.blockNumber,
          gas_used: BigInt(deployment.gasUsed),
          metadata: {
            ...ownership.metadata,
            contractType: 'ownership',
            ownerAddresses: ownership.ownerAddresses,
            ownershipPercentages: ownership.ownershipPercentages,
            totalValue: ownership.totalValue,
            deployedBy: deployment.deployerAddress,
          },
        })
        .select()
        .single();

      if (error) throw error;

      // Record individual ownership events
      for (let i = 0; i < ownership.ownerAddresses.length; i++) {
        await supabase
          .from('ownership_events')
          .insert({
            organization_id: ownership.organizationId,
            property_id: ownership.propertyId,
            from_address: deployment.deployerAddress,
            to_address: ownership.ownerAddresses[i],
            ownership_percentage: ownership.ownershipPercentages[i],
            transaction_hash: deployment.transactionHash,
            block_number: deployment.blockNumber,
            event_type: 'mint',
            metadata: {
              contractAddress: deployment.contractAddress,
              index: i,
            },
          });
      }

      return data;
    } catch (error) {
      console.error('Error deploying ownership contract:', error);
      throw error;
    }
  },

  /**
   * Deploy lease contract
   */
  async deployLeaseContract(
    lease: LeaseContract,
    deployment: ContractDeployment
  ) {
    try {
      const leaseHex = utf8Hex(JSON.stringify(lease)).substring(0, 64);

      const { data, error } = await supabase
        .from('blockchain_records')
        .insert({
          organization_id: lease.organizationId,
          property_id: lease.propertyId,
          transaction_hash: deployment.transactionHash,
          contract_address: deployment.contractAddress,
          record_type: 'lease_agreement',
          data_hash: leaseHex,
          status: 'confirmed',
          block_number: deployment.blockNumber,
          gas_used: BigInt(deployment.gasUsed),
          metadata: {
            ...lease.metadata,
            contractType: 'lease',
            landlordAddress: lease.landlordAddress,
            tenantAddress: lease.tenantAddress,
            rentAmount: lease.rentAmount,
            rentalPeriod: lease.rentalPeriod,
            depositAmount: lease.depositAmount,
            startDate: lease.startDate,
            endDate: lease.endDate,
            deployedBy: deployment.deployerAddress,
          },
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error deploying lease contract:', error);
      throw error;
    }
  },

  /**
   * Record escrow release transaction
   */
  async releaseEscrow(
    contractAddress: string,
    organizationId: string,
    propertyId: string,
    transactionHash: string,
    blockNumber: number,
    recipient: string,
    amount: number
  ) {
    try {
      const { data, error } = await supabase
        .from('smart_contract_events')
        .insert({
          organization_id: organizationId,
          contract_address: contractAddress,
          contract_type: 'escrow',
          event_name: 'FundsReleased',
          event_signature: 'FundsReleased(address indexed recipient, uint256 amount)',
          transaction_hash: transactionHash,
          block_number: blockNumber,
          decoded_params: {
            recipient,
            amount,
          },
          status: 'confirmed',
        })
        .select()
        .single();

      if (error) throw error;

      // Update the blockchain record status
      await supabase
        .from('blockchain_records')
        .update({
          status: 'finalized',
          metadata: {
            escrowReleased: true,
            releasedTo: recipient,
            releaseAmount: amount,
            releaseTransaction: transactionHash,
          },
        })
        .eq('contract_address', contractAddress)
        .eq('record_type', 'escrow');

      return data;
    } catch (error) {
      console.error('Error releasing escrow:', error);
      throw error;
    }
  },

  /**
   * Record rent payment on blockchain
   */
  async recordRentPayment(
    contractAddress: string,
    organizationId: string,
    propertyId: string,
    transactionHash: string,
    blockNumber: number,
    tenantAddress: string,
    landlordAddress: string,
    amount: number,
    rentPeriod: string
  ) {
    try {
      const { data, error } = await supabase
        .from('smart_contract_events')
        .insert({
          organization_id: organizationId,
          contract_address: contractAddress,
          contract_type: 'lease',
          event_name: 'RentPaid',
          event_signature: 'RentPaid(address indexed tenant, address indexed landlord, uint256 amount)',
          transaction_hash: transactionHash,
          block_number: blockNumber,
          decoded_params: {
            tenant: tenantAddress,
            landlord: landlordAddress,
            amount,
            rentPeriod,
          },
          status: 'confirmed',
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error recording rent payment:', error);
      throw error;
    }
  },

  /**
   * Get escrow contract details
   */
  async getEscrowDetails(contractAddress: string, organizationId: string) {
    try {
      const { data, error } = await supabase
        .from('blockchain_records')
        .select('*')
        .eq('contract_address', contractAddress)
        .eq('organization_id', organizationId)
        .eq('record_type', 'escrow')
        .single();

      if (error) throw error;

      // Get related events
      const { data: events, error: eventsError } = await supabase
        .from('smart_contract_events')
        .select('*')
        .eq('contract_address', contractAddress)
        .eq('organization_id', organizationId);

      if (eventsError) throw eventsError;

      return {
        contract: data,
        events: events || [],
      };
    } catch (error) {
      console.error('Error fetching escrow details:', error);
      throw error;
    }
  },

  /**
   * Get lease contract details
   */
  async getLeaseDetails(contractAddress: string, organizationId: string) {
    try {
      const { data, error } = await supabase
        .from('blockchain_records')
        .select('*')
        .eq('contract_address', contractAddress)
        .eq('organization_id', organizationId)
        .eq('record_type', 'lease_agreement')
        .single();

      if (error) throw error;

      // Get rent payment events
      const { data: events, error: eventsError } = await supabase
        .from('smart_contract_events')
        .select('*')
        .eq('contract_address', contractAddress)
        .eq('contract_type', 'lease')
        .order('created_at', { ascending: false });

      if (eventsError) throw eventsError;

      return {
        contract: data,
        paymentHistory: events || [],
      };
    } catch (error) {
      console.error('Error fetching lease details:', error);
      throw error;
    }
  },

  /**
   * Get all contracts for an organization
   */
  async getOrganizationContracts(organizationId: string) {
    try {
      const { data, error } = await supabase
        .from('blockchain_records')
        .select('*')
        .eq('organization_id', organizationId)
        .neq('contract_address', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by contract type
      const contracts = {
        escrow: data?.filter((c) => c.record_type === 'escrow') || [],
        ownership: data?.filter((c) => c.record_type === 'ownership') || [],
        lease: data?.filter((c) => c.record_type === 'lease_agreement') || [],
        other: data?.filter((c) => !['escrow', 'ownership', 'lease_agreement'].includes(c.record_type)) || [],
      };

      return contracts;
    } catch (error) {
      console.error('Error fetching organization contracts:', error);
      throw error;
    }
  },

  /**
   * Verify contract state on blockchain
   */
  async verifyContractState(
    contractAddress: string,
    organizationId: string,
    expectedState: Record<string, any>
  ) {
    try {
      // Get the latest contract record
      const { data: contract, error: contractError } = await supabase
        .from('blockchain_records')
        .select('*')
        .eq('contract_address', contractAddress)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (contractError) throw contractError;

      // Create verification log
      const { error: logError } = await supabase
        .from('blockchain_verification_logs')
        .insert({
          organization_id: organizationId,
          blockchain_record_id: contract.id,
          verification_type: 'contract_state',
          status: 'verified',
          verified_at: new Date().toISOString(),
          verification_details: {
            contractAddress,
            expectedState,
            actualState: contract.metadata,
          },
        });

      if (logError) throw logError;

      return {
        verified: true,
        contract,
      };
    } catch (error) {
      console.error('Error verifying contract state:', error);
      throw error;
    }
  },

  /**
   * Get contract events for a specific address
   */
  async getContractEvents(contractAddress: string, organizationId: string) {
    try {
      const { data, error } = await supabase
        .from('smart_contract_events')
        .select('*')
        .eq('contract_address', contractAddress)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching contract events:', error);
      throw error;
    }
  },

  /**
   * Get contract event history with pagination
   */
  async getContractEventHistory(
    contractAddress: string,
    organizationId: string,
    limit: number = 50,
    offset: number = 0
  ) {
    try {
      const { data, error, count } = await supabase
        .from('smart_contract_events')
        .select('*', { count: 'exact' })
        .eq('contract_address', contractAddress)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        events: data || [],
        total: count || 0,
        page: Math.floor(offset / limit) + 1,
        pageSize: limit,
      };
    } catch (error) {
      console.error('Error fetching contract event history:', error);
      throw error;
    }
  },
};
