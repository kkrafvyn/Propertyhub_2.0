import { ethers } from 'ethers';
import { web3Service } from './web3.service';

const PROPERTY_ESCROW_ABI = [
  'function createEscrow(string _propertyId, address _buyer, address _seller, uint256 _depositAmount, uint256 _releaseTime) public payable',
  'function approveEscrow(string _propertyId) public',
  'function approveInspection(string _propertyId) public',
  'function releaseToSeller(string _propertyId) public',
  'function returnDepositToBuyer(string _propertyId) public',
  'function cancelEscrow(string _propertyId) public',
  'function getEscrowStatus(string _propertyId) public view returns (address, address, uint256, uint256, uint256, bool, bool, bool, bool, bool)',
  'function getBalance() public view returns (uint256)',
  'event EscrowCreated(string indexed propertyId, address indexed buyer, address indexed seller, uint256 escrowAmount, uint256 depositAmount)',
  'event EscrowApproved(string indexed propertyId, address indexed approver)',
  'event InspectionApproved(string indexed propertyId)',
  'event EscrowReleased(string indexed propertyId, address indexed recipient, uint256 amount)',
  'event EscrowCancelled(string indexed propertyId)',
  'event DepositReturned(string indexed propertyId, address indexed recipient, uint256 amount)',
];

export interface EscrowStatus {
  buyer: string;
  seller: string;
  escrowAmount: string;
  depositAmount: string;
  releaseTime: number;
  buyerApproved: boolean;
  sellerApproved: boolean;
  inspectionPassed: boolean;
  released: boolean;
  cancelled: boolean;
}

export const propertyEscrowService = {
  /**
   * Get escrow contract instance
   */
  getContract(contractAddress: string, isWrite: boolean = false) {
    return web3Service.getContract(contractAddress, PROPERTY_ESCROW_ABI, isWrite);
  },

  /**
   * Create new escrow
   */
  async createEscrow(
    contractAddress: string,
    propertyId: string,
    buyer: string,
    seller: string,
    depositAmountMatic: string,
    releaseTime: number
  ): Promise<string> {
    try {
      const contract = this.getContract(contractAddress, true);
      const depositWei = ethers.parseEther(depositAmountMatic);

      const tx = await contract.createEscrow(
        propertyId,
        buyer,
        seller,
        depositWei,
        releaseTime,
        { value: depositWei }
      );

      const receipt = await tx.wait();
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error creating escrow:', error);
      throw error;
    }
  },

  /**
   * Get escrow status
   */
  async getEscrowStatus(contractAddress: string, propertyId: string): Promise<EscrowStatus> {
    try {
      const contract = this.getContract(contractAddress, false);
      const [
        buyer,
        seller,
        escrowAmount,
        depositAmount,
        releaseTime,
        buyerApproved,
        sellerApproved,
        inspectionPassed,
        released,
        cancelled,
      ] = await contract.getEscrowStatus(propertyId);

      return {
        buyer,
        seller,
        escrowAmount: ethers.formatEther(escrowAmount),
        depositAmount: ethers.formatEther(depositAmount),
        releaseTime: Number(releaseTime),
        buyerApproved,
        sellerApproved,
        inspectionPassed,
        released,
        cancelled,
      };
    } catch (error) {
      console.error('Error fetching escrow status:', error);
      throw error;
    }
  },

  /**
   * Approve escrow
   */
  async approveEscrow(contractAddress: string, propertyId: string): Promise<string> {
    try {
      const contract = this.getContract(contractAddress, true);
      const tx = await contract.approveEscrow(propertyId);
      const receipt = await tx.wait();
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error approving escrow:', error);
      throw error;
    }
  },

  /**
   * Approve inspection
   */
  async approveInspection(contractAddress: string, propertyId: string): Promise<string> {
    try {
      const contract = this.getContract(contractAddress, true);
      const tx = await contract.approveInspection(propertyId);
      const receipt = await tx.wait();
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error approving inspection:', error);
      throw error;
    }
  },

  /**
   * Release funds to seller
   */
  async releaseToSeller(contractAddress: string, propertyId: string): Promise<string> {
    try {
      const contract = this.getContract(contractAddress, true);
      const tx = await contract.releaseToSeller(propertyId);
      const receipt = await tx.wait();
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error releasing funds to seller:', error);
      throw error;
    }
  },

  /**
   * Return deposit to buyer
   */
  async returnDepositToBuyer(contractAddress: string, propertyId: string): Promise<string> {
    try {
      const contract = this.getContract(contractAddress, true);
      const tx = await contract.returnDepositToBuyer(propertyId);
      const receipt = await tx.wait();
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error returning deposit:', error);
      throw error;
    }
  },

  /**
   * Cancel escrow
   */
  async cancelEscrow(contractAddress: string, propertyId: string): Promise<string> {
    try {
      const contract = this.getContract(contractAddress, true);
      const tx = await contract.cancelEscrow(propertyId);
      const receipt = await tx.wait();
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error cancelling escrow:', error);
      throw error;
    }
  },

  /**
   * Get contract balance
   */
  async getBalance(contractAddress: string): Promise<string> {
    try {
      const contract = this.getContract(contractAddress, false);
      const balance = await contract.getBalance();
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error fetching contract balance:', error);
      throw error;
    }
  },
};
