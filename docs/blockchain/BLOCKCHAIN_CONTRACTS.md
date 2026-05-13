# Blockchain Smart Contracts - Deployment & Usage Guide

## Overview

The Property Hub blockchain implementation includes 4 production-ready smart contracts on Polygon:

1. **PropertyToken** - ERC-20 token for fractional property ownership
2. **PropertyEscrow** - Escrow management for property transactions
3. **PropertyOwnership** - Ownership tracking and transfers
4. **PropertyLease** - Automated lease agreement management

All contracts are deployed on **Polygon Amoy Testnet** first, then to **Polygon Mainnet** for production.

---

## Setup

### Prerequisites

```bash
# Install dependencies
pnpm install

# Install Hardhat tools
pnpm add -D hardhat @nomicfoundation/hardhat-toolbox hardhat-gas-reporter @nomicfoundation/hardhat-chai-matchers chai @nomiclabs/hardhat-ethers

# Install ethers.js (already added to package.json)
```

### Environment Setup

Create a `.env` file in the root directory:

```bash
# Polygon RPC URLs
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology/
POLYGON_MAINNET_RPC_URL=https://polygon-rpc.com

# Your wallet private key (for deployments)
PRIVATE_KEY=your_private_key_here

# Polygonscan API key (for contract verification)
POLYGONSCAN_API_KEY=your_api_key_here
```

---

## Deployment

### 1. Get Test MATIC (Amoy Testnet)

For testing on Polygon Amoy:

1. Go to [Polygon Faucet](https://faucet.polygon.technology/)
2. Select "Polygon Amoy"
3. Paste your wallet address
4. Claim test MATIC

### 2. Deploy All Contracts

```bash
# Deploy to Amoy testnet
npx hardhat run scripts/deployAll.js --network polygonAmoy

# Deploy to Polygon mainnet
npx hardhat run scripts/deployAll.js --network polygonMainnet
```

### 3. Individual Contract Deployment

```bash
# Deploy PropertyToken
npx hardhat run scripts/deployPropertyToken.js --network polygonAmoy

# Deploy PropertyEscrow
npx hardhat run scripts/deployPropertyEscrow.js --network polygonAmoy

# Deploy PropertyOwnership
npx hardhat run scripts/deployPropertyOwnership.js --network polygonAmoy

# Deploy PropertyLease
npx hardhat run scripts/deployPropertyLease.js --network polygonAmoy
```

### 4. Verify Deployment

After deployment, contract addresses are automatically saved to:
- `deployments/all_deployments.json` - All contracts
- `.env` - Environment variables updated with contract addresses

Check Polygonscan:
- Amoy: https://amoy.polygonscan.com/
- Mainnet: https://polygonscan.com/

---

## Contract Usage

### PropertyToken (ERC-20)

```typescript
import { propertyTokenService } from '@/lib/property-token.service';

// Get token info
const tokenInfo = await propertyTokenService.getTokenInfo(
  contractAddress,
  userAddress
);
// Returns: { name, symbol, decimals, totalSupply, balance }

// Transfer tokens
const txHash = await propertyTokenService.transfer(
  contractAddress,
  recipientAddress,
  amount
);

// Approve tokens for spending
const txHash = await propertyTokenService.approve(
  contractAddress,
  spenderAddress,
  amount
);

// Claim dividends
const txHash = await propertyTokenService.claimDividends(contractAddress);

// Get dividend info
const dividends = await propertyTokenService.getDividendInfo(
  contractAddress,
  userAddress
);
// Returns: { claimable, claimed }
```

### PropertyEscrow

```typescript
import { propertyEscrowService } from '@/lib/property-escrow.service';

// Create escrow
const txHash = await propertyEscrowService.createEscrow(
  contractAddress,
  propertyId,
  buyerAddress,
  sellerAddress,
  depositAmount, // in MATIC
  releaseTime // Unix timestamp
);

// Get escrow status
const status = await propertyEscrowService.getEscrowStatus(
  contractAddress,
  propertyId
);
// Returns: { buyer, seller, escrowAmount, depositAmount, ... }

// Approve escrow (buyer/seller)
const txHash = await propertyEscrowService.approveEscrow(
  contractAddress,
  propertyId
);

// Approve inspection (agent)
const txHash = await propertyEscrowService.approveInspection(
  contractAddress,
  propertyId
);

// Release funds to seller
const txHash = await propertyEscrowService.releaseToSeller(
  contractAddress,
  propertyId
);

// Cancel escrow
const txHash = await propertyEscrowService.cancelEscrow(
  contractAddress,
  propertyId
);
```

### PropertyOwnership

```typescript
import { propertyOwnershipService } from '@/lib/property-ownership.service';

// Register property
const txHash = await propertyOwnershipService.registerProperty(
  contractAddress,
  propertyId,
  totalValue, // in MATIC
  [owner1, owner2], // array of owner addresses
  [50, 50] // array of ownership percentages
);

// Get property owners
const { owners, percentages } = await propertyOwnershipService.getPropertyOwners(
  contractAddress,
  propertyId
);

// Transfer ownership
const txHash = await propertyOwnershipService.transferOwnership(
  contractAddress,
  propertyId,
  fromAddress,
  toAddress,
  percentage
);

// Add co-owner
const txHash = await propertyOwnershipService.addCoOwner(
  contractAddress,
  propertyId,
  newOwnerAddress,
  percentage
);

// Get property details
const details = await propertyOwnershipService.getPropertyDetails(
  contractAddress,
  propertyId
);
// Returns: { propertyId, totalValue, createdAt, ownerCount }
```

### PropertyLease

```typescript
import { propertyLeaseService } from '@/lib/property-lease.service';

// Create lease
const txHash = await propertyLeaseService.createLease(
  contractAddress,
  propertyId,
  landlordAddress,
  tenantAddress,
  monthlyRent, // in MATIC
  securityDeposit, // in MATIC
  startDate, // Unix timestamp
  rentalPeriodDays // number of days
);

// Get lease details
const lease = await propertyLeaseService.getLeaseDetails(
  contractAddress,
  leaseId
);
// Returns: { landlord, tenant, monthlyRent, deposit, ... }

// Pay rent
const txHash = await propertyLeaseService.payRent(
  contractAddress,
  leaseId,
  paymentIndex,
  amount
);

// Activate lease
const txHash = await propertyLeaseService.activateLease(
  contractAddress,
  leaseId
);

// Get rent payments
const payments = await propertyLeaseService.getRentPayments(
  contractAddress,
  leaseId
);
// Returns: [{ amount, dueDate, paidDate, paid }, ...]

// Return security deposit
const txHash = await propertyLeaseService.returnDeposit(
  contractAddress,
  leaseId
);

// Terminate lease
const txHash = await propertyLeaseService.terminateLease(
  contractAddress,
  leaseId,
  reason
);
```

---

## Web3 Integration

### Connect Wallet

```typescript
import { useWeb3 } from '@/app/context/Web3Context';

function MyComponent() {
  const { wallet, connectWallet, disconnectWallet, switchToAmoy } = useWeb3();

  return (
    <div>
      {!wallet.isConnected ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <>
          <p>Connected: {wallet.address}</p>
          <p>Balance: {wallet.balance} MATIC</p>
          <button onClick={() => switchToAmoy()}>Switch to Amoy</button>
          <button onClick={disconnectWallet}>Disconnect</button>
        </>
      )}
    </div>
  );
}
```

### Use Web3ConnectButton Component

```typescript
import { Web3ConnectButton } from '@/app/components/Web3ConnectButton';

export function MyPage() {
  return (
    <div>
      <h1>My App</h1>
      <Web3ConnectButton />
    </div>
  );
}
```

---

## Integration with Blockchain Service

The existing blockchain service is updated to use ethers.js:

```typescript
import { blockchainService } from '@/lib/blockchain.service';

// Record verification to Supabase
const verificationRecord = await blockchainService.recordVerification({
  organizationId: 'org-123',
  propertyId: 'prop-456',
  transactionHash: '0x...',
  recordType: 'document',
  dataHash: 'sha256hash...',
});

// Get verification status
const status = await blockchainService.getVerificationStatus(
  'org-123',
  'prop-456'
);
```

---

## Testing

```bash
# Run hardhat tests
npx hardhat test

# Run tests on specific network
npx hardhat test --network polygonAmoy

# Gas reporter
GAS_REPORTER=true npx hardhat test
```

---

## Verification & Explorer Links

### Amoy Testnet
- Explorer: https://amoy.polygonscan.com/
- Faucet: https://faucet.polygon.technology/

### Polygon Mainnet
- Explorer: https://polygonscan.com/
- Bridge: https://bridge.polygon.technology/

---

## Security Best Practices

1. **Never commit private keys** - Use environment variables only
2. **Test before mainnet** - Always test on Amoy first
3. **Verify contracts** - Use Hardhat for contract verification
4. **Rate limit** - Implement rate limiting on contract interactions
5. **Audit trails** - All transactions logged in Supabase

---

## Troubleshooting

### "Insufficient funds for gas"
- Ensure you have enough MATIC for gas fees
- Use Amoy testnet for development

### "Network not found"
- Update RPC URL in `.env`
- Check network availability

### "Contract not deployed"
- Verify contract address in `.env`
- Check Polygonscan for deployment status

### "Transaction failed"
- Check gas limit and gas price
- Verify contract method parameters
- Check account has necessary permissions

---

## Next Steps

1. Deploy contracts to Polygon Amoy
2. Test with Web3ConnectButton
3. Create UI components for contract interactions
4. Deploy to Polygon Mainnet
5. Monitor contracts on Polygonscan
6. Set up automated verification tasks

---

## Support

For issues or questions:
1. Check contract ABI in service files
2. Review Polygon documentation
3. Check Hardhat documentation
4. View contract events on Polygonscan
