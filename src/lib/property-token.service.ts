import { ethers } from 'ethers';
import { web3Service } from './web3.service';

const PROPERTY_TOKEN_ABI = [
  'function transfer(address to, uint256 amount) public returns (bool)',
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function balanceOf(address account) public view returns (uint256)',
  'function allowance(address owner, address spender) public view returns (uint256)',
  'function totalSupply() public view returns (uint256)',
  'function decimals() public view returns (uint8)',
  'function name() public view returns (string)',
  'function symbol() public view returns (string)',
  'function propertyId() public view returns (string)',
  'function setDividendEnabled(bool enabled) public',
  'function setTransferable(bool _transferable) public',
  'function payDividend() public payable',
  'function claimDividends() public',
  'function getClaimableDividends(address holder) public view returns (uint256)',
  'function mint(address to, uint256 amount) public',
  'function burn(uint256 amount) public',
  'function withdraw() public',
];

export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  balance: string;
}

export interface DividendInfo {
  claimable: string;
  claimed: string;
}

export const propertyTokenService = {
  /**
   * Get token contract instance
   */
  getContract(contractAddress: string, isWrite: boolean = false) {
    return web3Service.getContract(contractAddress, PROPERTY_TOKEN_ABI, isWrite);
  },

  /**
   * Get token info
   */
  async getTokenInfo(contractAddress: string, userAddress?: string): Promise<TokenInfo> {
    try {
      const contract = this.getContract(contractAddress, false);
      
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals(),
        contract.totalSupply(),
      ]);

      let balance = '0';
      if (userAddress) {
        const userBalance = await contract.balanceOf(userAddress);
        balance = ethers.formatUnits(userBalance, decimals);
      }

      return {
        address: contractAddress,
        name,
        symbol,
        decimals,
        totalSupply: ethers.formatUnits(totalSupply, decimals),
        balance,
      };
    } catch (error) {
      console.error('Error fetching token info:', error);
      throw error;
    }
  },

  /**
   * Get user balance
   */
  async getBalance(contractAddress: string, userAddress: string): Promise<string> {
    try {
      const contract = this.getContract(contractAddress, false);
      const decimals = await contract.decimals();
      const balance = await contract.balanceOf(userAddress);
      return ethers.formatUnits(balance, decimals);
    } catch (error) {
      console.error('Error fetching balance:', error);
      throw error;
    }
  },

  /**
   * Transfer tokens
   */
  async transfer(contractAddress: string, to: string, amount: string): Promise<string> {
    try {
      const contract = this.getContract(contractAddress, true);
      const decimals = await contract.decimals();
      const amountWei = ethers.parseUnits(amount, decimals);
      
      const tx = await contract.transfer(to, amountWei);
      const receipt = await tx.wait();
      
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error transferring tokens:', error);
      throw error;
    }
  },

  /**
   * Approve tokens for spending
   */
  async approve(contractAddress: string, spender: string, amount: string): Promise<string> {
    try {
      const contract = this.getContract(contractAddress, true);
      const decimals = await contract.decimals();
      const amountWei = ethers.parseUnits(amount, decimals);
      
      const tx = await contract.approve(spender, amountWei);
      const receipt = await tx.wait();
      
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error approving tokens:', error);
      throw error;
    }
  },

  /**
   * Get dividend info
   */
  async getDividendInfo(contractAddress: string, userAddress: string): Promise<DividendInfo> {
    try {
      const contract = this.getContract(contractAddress, false);
      
      const claimable = await contract.getClaimableDividends(userAddress);
      
      return {
        claimable: ethers.formatEther(claimable),
        claimed: '0', // Could be added to contract if needed
      };
    } catch (error) {
      console.error('Error fetching dividend info:', error);
      throw error;
    }
  },

  /**
   * Claim dividends
   */
  async claimDividends(contractAddress: string): Promise<string> {
    try {
      const contract = this.getContract(contractAddress, true);
      const tx = await contract.claimDividends();
      const receipt = await tx.wait();
      
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error claiming dividends:', error);
      throw error;
    }
  },

  /**
   * Enable dividends (owner only)
   */
  async enableDividends(contractAddress: string, enabled: boolean): Promise<string> {
    try {
      const contract = this.getContract(contractAddress, true);
      const tx = await contract.setDividendEnabled(enabled);
      const receipt = await tx.wait();
      
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error enabling dividends:', error);
      throw error;
    }
  },

  /**
   * Pay dividend (owner only)
   */
  async payDividend(contractAddress: string, amountMatic: string): Promise<string> {
    try {
      const contract = this.getContract(contractAddress, true);
      const amountWei = ethers.parseEther(amountMatic);
      
      const tx = await contract.payDividend({ value: amountWei });
      const receipt = await tx.wait();
      
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error paying dividend:', error);
      throw error;
    }
  },

  /**
   * Set transferability (owner only)
   */
  async setTransferable(contractAddress: string, transferable: boolean): Promise<string> {
    try {
      const contract = this.getContract(contractAddress, true);
      const tx = await contract.setTransferable(transferable);
      const receipt = await tx.wait();
      
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error setting transferability:', error);
      throw error;
    }
  },

  /**
   * Burn tokens
   */
  async burn(contractAddress: string, amount: string): Promise<string> {
    try {
      const contract = this.getContract(contractAddress, true);
      const decimals = await contract.decimals();
      const amountWei = ethers.parseUnits(amount, decimals);
      
      const tx = await contract.burn(amountWei);
      const receipt = await tx.wait();
      
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error burning tokens:', error);
      throw error;
    }
  },

  /**
   * Mint tokens (owner only)
   */
  async mint(contractAddress: string, to: string, amount: string): Promise<string> {
    try {
      const contract = this.getContract(contractAddress, true);
      const decimals = await contract.decimals();
      const amountWei = ethers.parseUnits(amount, decimals);
      
      const tx = await contract.mint(to, amountWei);
      const receipt = await tx.wait();
      
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error minting tokens:', error);
      throw error;
    }
  },
};
