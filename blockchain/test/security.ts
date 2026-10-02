import { expect } from "chai";
import { network } from "hardhat";

describe("restored property contracts", function () {
  it("prevents a cancelled escrow deposit from being withdrawn twice", async function () {
    const { ethers } = await network.getOrCreate();
    const [agent, buyer, seller] = await ethers.getSigners();
    const escrow = await ethers.deployContract("PropertyEscrow", [agent.address]);
    await escrow.waitForDeployment();
    const latest = await ethers.provider.getBlock("latest");
    const deposit = ethers.parseEther("1");

    await escrow.createEscrow("property-1", buyer.address, seller.address, deposit, Number(latest!.timestamp) + 3600, { value: deposit });
    await escrow.cancelEscrow("property-1");
    await expect(escrow.returnDepositToBuyer("property-1")).to.be.revertedWith("Escrow must be released");
  });

  it("prevents an unrelated wallet from transferring another owner's share", async function () {
    const { ethers } = await network.getOrCreate();
    const [registryOwner, propertyOwner, attacker, recipient] = await ethers.getSigners();
    const ownership = await ethers.deployContract("PropertyOwnership");
    await ownership.waitForDeployment();
    await ownership.connect(registryOwner).registerProperty("property-1", 1000n, [propertyOwner.address], [100n]);

    await expect(
      ownership.connect(attacker).transferOwnership("property-1", propertyOwner.address, recipient.address, 10n),
    ).to.be.revertedWith("Not authorized to transfer this ownership");
  });

  it("preserves earned dividends when tokens move after a distribution", async function () {
    const { ethers } = await network.getOrCreate();
    const [owner, recipient] = await ethers.getSigners();
    const token = await ethers.deployContract("PropertyToken", ["Property", "PROP", 100n, 0, "property-1", 1000n]);
    await token.waitForDeployment();
    await token.setDividendEnabled(true);
    await token.payDividend({ value: 100n });
    await token.transfer(recipient.address, 100n);

    expect(await token.getClaimableDividends(owner.address)).to.equal(100n);
    expect(await token.getClaimableDividends(recipient.address)).to.equal(0n);
    await expect(token.withdrawUnallocated()).to.be.revertedWith("No unallocated balance");
  });

  it("requires both lease parties to activate a tenant-funded lease", async function () {
    const { ethers } = await network.getOrCreate();
    const [landlord, tenant, outsider] = await ethers.getSigners();
    const lease = await ethers.deployContract("PropertyLease");
    await lease.waitForDeployment();
    const latest = await ethers.provider.getBlock("latest");
    const start = Number(latest!.timestamp) + 3600;

    await expect(
      lease.connect(outsider).createLease("property-1", landlord.address, tenant.address, 10n, 20n, start, 30, { value: 20n }),
    ).to.be.revertedWith("Tenant must create and fund lease");

    await lease.connect(tenant).createLease("property-1", landlord.address, tenant.address, 10n, 20n, start, 30, { value: 20n });
    await lease.connect(tenant).activateLease("property-1");
    expect((await lease.getLeaseDetails("property-1")).status).to.equal(0n);
    await lease.connect(landlord).activateLease("property-1");
    expect((await lease.getLeaseDetails("property-1")).status).to.equal(1n);
  });

  it("restricts verification records to the registry owner", async function () {
    const { ethers } = await network.getOrCreate();
    const [, outsider] = await ethers.getSigners();
    const registry = await ethers.deployContract("VerificationRegistry");
    await registry.waitForDeployment();
    const receiptHash = ethers.keccak256(ethers.toUtf8Bytes("receipt"));

    await expect(
      registry.connect(outsider).recordVerification(receiptHash, "payment-1", "property-1", "receipt-1"),
    ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
  });
});
