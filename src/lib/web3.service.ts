import { ethers } from 'ethers';

export interface WalletConnectionState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  balance: string | null;
  provider: ethers.Provider | null;
  signer: ethers.Signer | null;
}

class Web3Service {
  private provider: ethers.Provider | null = null;
  private signer: ethers.Signer | null = null;
  private walletAddress: string | null = null;
  private chainId: number | null = null;

  private listeners: ((state: WalletConnectionState) => void)[] = [];

  /**
   * Initialize Web3 provider
   */
  async initializeProvider(rpcUrl: string = 'https://rpc-amoy.polygon.technology/') {
    try {
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      return this.provider;
    } catch (error) {
      console.error('Failed to initialize provider:', error);
      throw error;
    }
  }

  /**
   * Connect to MetaMask wallet
   */
  async connectMetaMask(): Promise<WalletConnectionState> {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[];

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      this.walletAddress = accounts[0];

      // Get chain ID
      const chainIdHex = await window.ethereum.request({
        method: 'eth_chainId',
      }) as string;
      this.chainId = parseInt(chainIdHex, 16);

      // Create provider and signer from MetaMask
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      this.provider = browserProvider;
      this.signer = await browserProvider.getSigner();

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        this.walletAddress = accounts[0] || null;
        this.notifyListeners();
      });

      // Listen for network changes
      window.ethereum.on('chainChanged', (chainId: string) => {
        this.chainId = parseInt(chainId, 16);
        this.notifyListeners();
      });

      this.notifyListeners();
      return this.getState();
    } catch (error) {
      console.error('MetaMask connection failed:', error);
      throw error;
    }
  }

  /**
   * Switch to Polygon Amoy testnet
   */
  async switchToPolygonAmoy(): Promise<void> {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }

      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x13882' }], // 80002 in hex
        });
      } catch (error: any) {
        if (error.code === 4902) {
          // Network not added, add it
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x13882',
                chainName: 'Polygon Amoy',
                rpcUrls: ['https://rpc-amoy.polygon.technology/'],
                blockExplorerUrls: ['https://amoy.polygonscan.com/'],
                nativeCurrency: {
                  name: 'MATIC',
                  symbol: 'MATIC',
                  decimals: 18,
                },
              },
            ],
          });
        } else {
          throw error;
        }
      }

      this.chainId = 80002;
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to switch network:', error);
      throw error;
    }
  }

  /**
   * Switch to Polygon Mainnet
   */
  async switchToPolygonMainnet(): Promise<void> {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }

      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x89' }], // 137 in hex
      });

      this.chainId = 137;
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to switch network:', error);
      throw error;
    }
  }

  /**
   * Get wallet balance
   */
  async getBalance(): Promise<string> {
    if (!this.provider || !this.walletAddress) {
      return '0';
    }

    try {
      const balance = await this.provider.getBalance(this.walletAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Failed to get balance:', error);
      return '0';
    }
  }

  /**
   * Get contract instance
   */
  getContract(contractAddress: string, contractABI: any[], isWrite: boolean = false) {
    if (isWrite && this.signer) {
      return new ethers.Contract(contractAddress, contractABI, this.signer);
    } else if (this.provider) {
      return new ethers.Contract(contractAddress, contractABI, this.provider);
    }

    throw new Error('Provider or signer not initialized');
  }

  /**
   * Sign message
   */
  async signMessage(message: string): Promise<string> {
    if (!this.signer) {
      throw new Error('Signer not initialized');
    }

    try {
      return await this.signer.signMessage(message);
    } catch (error) {
      console.error('Failed to sign message:', error);
      throw error;
    }
  }

  /**
   * Get current state
   */
  async getState(): Promise<WalletConnectionState> {
    return {
      isConnected: !!this.walletAddress,
      address: this.walletAddress,
      chainId: this.chainId,
      balance: await this.getBalance(),
      provider: this.provider,
      signer: this.signer,
    };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: WalletConnectionState) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Notify listeners of state change
   */
  private async notifyListeners(): Promise<void> {
    const state = await this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  /**
   * Disconnect wallet
   */
  disconnect(): void {
    this.walletAddress = null;
    this.chainId = null;
    this.signer = null;
    this.notifyListeners();
  }

  /**
   * Check if network is correct
   */
  isCorrectNetwork(): boolean {
    return this.chainId === 80002 || this.chainId === 137;
  }

  /**
   * Get provider
   */
  getProvider(): ethers.Provider | null {
    return this.provider;
  }

  /**
   * Get signer
   */
  getSigner(): ethers.Signer | null {
    return this.signer;
  }
}

export const web3Service = new Web3Service();

// Declare window.ethereum for TypeScript
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: Function) => void;
      off: (event: string, callback: Function) => void;
    };
  }
}
