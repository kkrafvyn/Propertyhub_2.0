import { ethers } from 'ethers';
import { web3Service } from './web3.service';

const PROPERTY_LEASE_ABI = [
  'function createLease(string _propertyId, address _landlord, address _tenant, uint256 _monthlyRent, uint256 _securityDeposit, uint256 _startDate, uint256 _rentalPeriodDays) public payable',
  'function payRent(string _leaseId, uint256 _paymentIndex) public payable',
  'function activateLease(string _leaseId) public',
  'function returnDeposit(string _leaseId) public',
  'function terminateLease(string _leaseId, string _reason) public',
  'function getRentPayments(string _leaseId) public view returns (tuple(uint256,uint256,uint256,bool)[])',
  'function getPendingRent(string _leaseId) public view returns (uint256)',
  'function getLeaseDetails(string _leaseId) public view returns (address,address,uint256,uint256,uint256,uint256,uint8)',
  'function getTenantLeases(address _tenant) public view returns (string[])',
  'function getLandlordLeases(address _landlord) public view returns (string[])',
  'event LeaseCreated(string indexed propertyId, address indexed landlord, address indexed tenant, uint256 monthlyRent, uint256 startDate, uint256 endDate)',
  'event RentPaid(string indexed leaseId, address indexed tenant, uint256 amount, uint256 paidDate)',
  'event DepositReturned(string indexed leaseId, address indexed tenant, uint256 amount)',
  'event LeaseTerminated(string indexed leaseId, string reason)',
];

export enum LeaseStatus {
  PENDING = 0,
  ACTIVE = 1,
  COMPLETED = 2,
  TERMINATED = 3,
}

export interface LeaseDetails {
  landlord: string;
  tenant: string;
  monthlyRent: string;
  securityDeposit: string;
  startDate: number;
  endDate: number;
  status: LeaseStatus;
}

export interface RentPayment {
  amount: string;
  dueDate: number;
  paidDate: number;
  paid: boolean;
}

export const propertyLeaseService = {
  /**
   * Get lease contract instance
   */
  getContract(contractAddress: string, isWrite: boolean = false) {
    return web3Service.getContract(contractAddress, PROPERTY_LEASE_ABI, isWrite);
  },

  /**
   * Create new lease
   */
  async createLease(
    contractAddress: string,
    propertyId: string,
    landlord: string,
    tenant: string,
    monthlyRentMatic: string,
    securityDepositMatic: string,
    startDate: number,
    rentalPeriodDays: number
  ): Promise<string> {
    try {
      const contract = this.getContract(contractAddress, true);
      const monthlyRentWei = ethers.parseEther(monthlyRentMatic);
      const depositWei = ethers.parseEther(securityDepositMatic);

      const tx = await contract.createLease(
        propertyId,
        landlord,
        tenant,
        monthlyRentWei,
        depositWei,
        startDate,
        rentalPeriodDays,
        { value: depositWei }
      );

      const receipt = await tx.wait();
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error creating lease:', error);
      throw error;
    }
  },

  /**
   * Pay rent
   */
  async payRent(
    contractAddress: string,
    leaseId: string,
    paymentIndex: number,
    amountMatic: string
  ): Promise<string> {
    try {
      const contract = this.getContract(contractAddress, true);
      const amountWei = ethers.parseEther(amountMatic);

      const tx = await contract.payRent(leaseId, paymentIndex, { value: amountWei });
      const receipt = await tx.wait();
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error paying rent:', error);
      throw error;
    }
  },

  /**
   * Activate lease
   */
  async activateLease(contractAddress: string, leaseId: string): Promise<string> {
    try {
      const contract = this.getContract(contractAddress, true);
      const tx = await contract.activateLease(leaseId);
      const receipt = await tx.wait();
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error activating lease:', error);
      throw error;
    }
  },

  /**
   * Return security deposit
   */
  async returnDeposit(contractAddress: string, leaseId: string): Promise<string> {
    try {
      const contract = this.getContract(contractAddress, true);
      const tx = await contract.returnDeposit(leaseId);
      const receipt = await tx.wait();
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error returning deposit:', error);
      throw error;
    }
  },

  /**
   * Terminate lease
   */
  async terminateLease(contractAddress: string, leaseId: string, reason: string): Promise<string> {
    try {
      const contract = this.getContract(contractAddress, true);
      const tx = await contract.terminateLease(leaseId, reason);
      const receipt = await tx.wait();
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error terminating lease:', error);
      throw error;
    }
  },

  /**
   * Get lease details
   */
  async getLeaseDetails(contractAddress: string, leaseId: string): Promise<LeaseDetails> {
    try {
      const contract = this.getContract(contractAddress, false);
      const [landlord, tenant, monthlyRent, deposit, startDate, endDate, status] =
        await contract.getLeaseDetails(leaseId);

      return {
        landlord,
        tenant,
        monthlyRent: ethers.formatEther(monthlyRent),
        securityDeposit: ethers.formatEther(deposit),
        startDate: Number(startDate),
        endDate: Number(endDate),
        status,
      };
    } catch (error) {
      console.error('Error fetching lease details:', error);
      throw error;
    }
  },

  /**
   * Get rent payments
   */
  async getRentPayments(contractAddress: string, leaseId: string): Promise<RentPayment[]> {
    try {
      const contract = this.getContract(contractAddress, false);
      const payments = await contract.getRentPayments(leaseId);

      return payments.map((p: any) => ({
        amount: ethers.formatEther(p[0]),
        dueDate: Number(p[1]),
        paidDate: Number(p[2]),
        paid: p[3],
      }));
    } catch (error) {
      console.error('Error fetching rent payments:', error);
      throw error;
    }
  },

  /**
   * Get pending rent
   */
  async getPendingRent(contractAddress: string, leaseId: string): Promise<string> {
    try {
      const contract = this.getContract(contractAddress, false);
      const pending = await contract.getPendingRent(leaseId);
      return ethers.formatEther(pending);
    } catch (error) {
      console.error('Error fetching pending rent:', error);
      throw error;
    }
  },

  /**
   * Get tenant's leases
   */
  async getTenantLeases(contractAddress: string, tenant: string): Promise<string[]> {
    try {
      const contract = this.getContract(contractAddress, false);
      return await contract.getTenantLeases(tenant);
    } catch (error) {
      console.error('Error fetching tenant leases:', error);
      throw error;
    }
  },

  /**
   * Get landlord's leases
   */
  async getLandlordLeases(contractAddress: string, landlord: string): Promise<string[]> {
    try {
      const contract = this.getContract(contractAddress, false);
      return await contract.getLandlordLeases(landlord);
    } catch (error) {
      console.error('Error fetching landlord leases:', error);
      throw error;
    }
  },
};
