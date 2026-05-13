import { ethers } from 'ethers';
import { web3Service } from './web3.service';

const PROPERTY_OWNERSHIP_ABI = [
  'function registerProperty(string _propertyId, uint256 _totalValue, address[] _initialOwners, uint256[] _percentages) public',
  'function transferOwnership(string _propertyId, address _from, address _to, uint256 _percentage) public',
  'function addCoOwner(string _propertyId, address _newOwner, uint256 _percentage) public',
  'function getPropertyOwners(string _propertyId) public view returns (address[], uint256[])',
  'function getOwnershipPercentage(string _propertyId, address _owner) public view returns (uint256)',
  'function getOwnerProperties(address _owner) public view returns (string[])',
  'function getPropertyDetails(string _propertyId) public view returns (string, uint256, uint256, uint256)',
  'event PropertyRegistered(string indexed propertyId, uint256 totalValue)',
  'event OwnershipTransferred(string indexed propertyId, address indexed from, address indexed to, uint256 percentage)',
  'event OwnershipAdded(string indexed propertyId, address indexed owner, uint256 percentage)',
  'event OwnershipRemoved(string indexed propertyId, address indexed owner)',
];

export interface PropertyOwnershipInfo {
  propertyId: string;
  totalValue: string;
  createdAt: number;
  ownerCount: number;
}

export interface OwnershipDetails {
  owners: string[];
  percentages: number[];
}

export const propertyOwnershipService = {
  /**
   * Get ownership contract instance
   */
  getContract(contractAddress: string, isWrite: boolean = false) {
    return web3Service.getContract(contractAddress, PROPERTY_OWNERSHIP_ABI, isWrite);
  },

  /**
   * Register new property
   */
  async registerProperty(
    contractAddress: string,
    propertyId: string,
    totalValueMatic: string,
    initialOwners: string[],
    percentages: number[]
  ): Promise<string> {
    try {
      const contract = this.getContract(contractAddress, true);
      const totalValueWei = ethers.parseEther(totalValueMatic);

      const tx = await contract.registerProperty(
        propertyId,
        totalValueWei,
        initialOwners,
        percentages
      );

      const receipt = await tx.wait();
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error registering property:', error);
      throw error;
    }
  },

  /**
   * Transfer ownership
   */
  async transferOwnership(
    contractAddress: string,
    propertyId: string,
    from: string,
    to: string,
    percentage: number
  ): Promise<string> {
    try {
      const contract = this.getContract(contractAddress, true);
      const tx = await contract.transferOwnership(propertyId, from, to, percentage);
      const receipt = await tx.wait();
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error transferring ownership:', error);
      throw error;
    }
  },

  /**
   * Add co-owner
   */
  async addCoOwner(
    contractAddress: string,
    propertyId: string,
    newOwner: string,
    percentage: number
  ): Promise<string> {
    try {
      const contract = this.getContract(contractAddress, true);
      const tx = await contract.addCoOwner(propertyId, newOwner, percentage);
      const receipt = await tx.wait();
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error adding co-owner:', error);
      throw error;
    }
  },

  /**
   * Get property owners and their percentages
   */
  async getPropertyOwners(
    contractAddress: string,
    propertyId: string
  ): Promise<OwnershipDetails> {
    try {
      const contract = this.getContract(contractAddress, false);
      const [owners, percentages] = await contract.getPropertyOwners(propertyId);

      return {
        owners,
        percentages: percentages.map((p: any) => Number(p)),
      };
    } catch (error) {
      console.error('Error fetching property owners:', error);
      throw error;
    }
  },

  /**
   * Get ownership percentage for address
   */
  async getOwnershipPercentage(
    contractAddress: string,
    propertyId: string,
    owner: string
  ): Promise<number> {
    try {
      const contract = this.getContract(contractAddress, false);
      const percentage = await contract.getOwnershipPercentage(propertyId, owner);
      return Number(percentage);
    } catch (error) {
      console.error('Error fetching ownership percentage:', error);
      throw error;
    }
  },

  /**
   * Get owner's properties
   */
  async getOwnerProperties(contractAddress: string, owner: string): Promise<string[]> {
    try {
      const contract = this.getContract(contractAddress, false);
      return await contract.getOwnerProperties(owner);
    } catch (error) {
      console.error('Error fetching owner properties:', error);
      throw error;
    }
  },

  /**
   * Get property details
   */
  async getPropertyDetails(
    contractAddress: string,
    propertyId: string
  ): Promise<PropertyOwnershipInfo> {
    try {
      const contract = this.getContract(contractAddress, false);
      const [id, totalValue, createdAt, ownerCount] = await contract.getPropertyDetails(
        propertyId
      );

      return {
        propertyId: id,
        totalValue: ethers.formatEther(totalValue),
        createdAt: Number(createdAt),
        ownerCount: Number(ownerCount),
      };
    } catch (error) {
      console.error('Error fetching property details:', error);
      throw error;
    }
  },
};
