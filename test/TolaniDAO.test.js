const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * Tests for the Tolani Ecosystem DAO
 * 
 * This DAO is designed to manage the TUT token ecosystem from:
 * https://github.com/Tolani-Corp/TolaniToken
 * 
 * For testing, we use a MockGovernanceToken that mimics TUT's ERC20Votes interface.
 */
describe("Tolani Ecosystem DAO", function () {
  let token, timelock, governor, treasury;
  let owner, voter1, voter2, voter3;
  const MIN_DELAY = 3600; // 1 hour
  const VOTING_DELAY = 7200; // blocks
  const VOTING_PERIOD = 50400; // blocks

  beforeEach(async function () {
    [owner, voter1, voter2, voter3] = await ethers.getSigners();

    // Deploy Mock Token (simulating TUT token for testing)
    const MockToken = await ethers.getContractFactory("MockGovernanceToken");
    token = await MockToken.deploy();
    await token.waitForDeployment();

    // Deploy Timelock
    const TolaniTimelock = await ethers.getContractFactory("TolaniEcosystemTimelock");
    timelock = await TolaniTimelock.deploy(
      MIN_DELAY,
      [],
      [],
      owner.address
    );
    await timelock.waitForDeployment();

    // Deploy Governor
    const TolaniGovernor = await ethers.getContractFactory("TolaniEcosystemGovernor");
    governor = await TolaniGovernor.deploy(
      await token.getAddress(),
      await timelock.getAddress()
    );
    await governor.waitForDeployment();

    // Deploy Treasury
    const TolaniTreasury = await ethers.getContractFactory("TolaniTreasury");
    treasury = await TolaniTreasury.deploy(await timelock.getAddress());
    await treasury.waitForDeployment();

    // Setup roles
    const proposerRole = await timelock.PROPOSER_ROLE();
    const executorRole = await timelock.EXECUTOR_ROLE();
    const cancellerRole = await timelock.CANCELLER_ROLE();

    await timelock.grantRole(proposerRole, await governor.getAddress());
    await timelock.grantRole(executorRole, ethers.ZeroAddress);
    await timelock.grantRole(cancellerRole, await governor.getAddress());

    // Distribute tokens to voters
    const amount = ethers.parseEther("1000000"); // 1M tokens each
    await token.transfer(voter1.address, amount);
    await token.transfer(voter2.address, amount);
    await token.transfer(voter3.address, amount);

    // Delegate voting power
    await token.connect(voter1).delegate(voter1.address);
    await token.connect(voter2).delegate(voter2.address);
    await token.connect(voter3).delegate(voter3.address);
    await token.delegate(owner.address);
  });

  describe("MockGovernanceToken (TUT Simulator)", function () {
    it("Should have correct name and symbol", async function () {
      expect(await token.name()).to.equal("Mock TUT Token");
      expect(await token.symbol()).to.equal("mTUT");
    });

    it("Should have correct max supply", async function () {
      const maxSupply = ethers.parseEther("100000000"); // 100M
      expect(await token.totalSupply()).to.equal(maxSupply);
    });

    it("Should allow delegation", async function () {
      const votes = await token.getVotes(voter1.address);
      expect(votes).to.be.gt(0);
    });
  });

  describe("TolaniEcosystemGovernor", function () {
    it("Should have correct voting delay", async function () {
      expect(await governor.votingDelay()).to.equal(VOTING_DELAY);
    });

    it("Should have correct voting period", async function () {
      expect(await governor.votingPeriod()).to.equal(VOTING_PERIOD);
    });

    it("Should have correct proposal threshold (100K TUT)", async function () {
      const threshold = ethers.parseEther("100000"); // 100K tokens
      expect(await governor.proposalThreshold()).to.equal(threshold);
    });

    it("Should have 4% quorum", async function () {
      expect(await governor.quorumNumerator()).to.equal(4);
    });

    it("Should have correct name", async function () {
      expect(await governor.name()).to.equal("Tolani Ecosystem Governor");
    });
  });

  describe("TolaniTreasury", function () {
    it("Should accept ETH deposits", async function () {
      await owner.sendTransaction({
        to: await treasury.getAddress(),
        value: ethers.parseEther("1"),
      });
      expect(await treasury.getBalance()).to.equal(ethers.parseEther("1"));
    });

    it("Should only allow owner (timelock) to withdraw", async function () {
      await expect(
        treasury.connect(voter1).withdrawFunds(voter1.address, ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(treasury, "OwnableUnauthorizedAccount");
    });

    it("Should track token balances", async function () {
      // Transfer some tokens to treasury
      await token.transfer(await treasury.getAddress(), ethers.parseEther("1000"));
      expect(await treasury.getTokenBalance(await token.getAddress())).to.equal(ethers.parseEther("1000"));
    });
  });

  describe("TolaniEcosystemTimelock", function () {
    it("Should have correct min delay (1 hour)", async function () {
      expect(await timelock.getMinDelay()).to.equal(MIN_DELAY);
    });

    it("Should have governor as proposer", async function () {
      const proposerRole = await timelock.PROPOSER_ROLE();
      expect(await timelock.hasRole(proposerRole, await governor.getAddress())).to.be.true;
    });

    it("Should allow anyone to execute (executor role to zero address)", async function () {
      const executorRole = await timelock.EXECUTOR_ROLE();
      expect(await timelock.hasRole(executorRole, ethers.ZeroAddress)).to.be.true;
    });
  });
});
