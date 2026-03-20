const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployCanonicalTUT } = require("../scripts/lib/deploy-tut");

describe("TUTToken", function () {
  let token;
  let owner;
  let alice;
  let bob;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    const deployment = await deployCanonicalTUT({
      owner: owner.address,
    });
    token = deployment.token;
  });

  it("has the correct metadata and initial economics", async function () {
    expect(await token.name()).to.equal("Tolani Utility Token");
    expect(await token.symbol()).to.equal("TUT");
    expect(await token.decimals()).to.equal(18);
    expect(await token.totalSupply()).to.equal(ethers.parseEther("50000000"));
    expect(await token.cap()).to.equal(ethers.parseEther("100000000"));
    expect(await token.balanceOf(owner.address)).to.equal(ethers.parseEther("50000000"));
  });

  it("grants core operational roles to the owner", async function () {
    const adminRole = await token.DEFAULT_ADMIN_ROLE();
    const minterRole = await token.MINTER_ROLE();
    const pauserRole = await token.PAUSER_ROLE();
    const upgraderRole = await token.UPGRADER_ROLE();
    const blacklistRole = await token.BLACKLIST_ROLE();

    expect(await token.hasRole(adminRole, owner.address)).to.equal(true);
    expect(await token.hasRole(minterRole, owner.address)).to.equal(true);
    expect(await token.hasRole(pauserRole, owner.address)).to.equal(true);
    expect(await token.hasRole(upgraderRole, owner.address)).to.equal(true);
    expect(await token.hasRole(blacklistRole, owner.address)).to.equal(true);
  });

  it("tracks voting power after self-delegation", async function () {
    const transferAmount = ethers.parseEther("250000");
    await token.transfer(alice.address, transferAmount);

    expect(await token.getVotes(alice.address)).to.equal(0n);
    await token.connect(alice).delegate(alice.address);
    expect(await token.getVotes(alice.address)).to.equal(transferAmount);
  });

  it("pauses and unpauses transfers", async function () {
    const transferAmount = ethers.parseEther("10");
    await token.transfer(alice.address, transferAmount);

    await token.pause();
    await expect(
      token.connect(alice).transfer(bob.address, ethers.parseEther("1"))
    ).to.be.reverted;

    await token.unpause();
    await expect(
      token.connect(alice).transfer(bob.address, ethers.parseEther("1"))
    ).to.not.be.reverted;
  });

  it("blocks transfers involving blacklisted accounts", async function () {
    const transferAmount = ethers.parseEther("50");
    await token.transfer(alice.address, transferAmount);
    await token.blacklist(alice.address);

    await expect(
      token.connect(alice).transfer(bob.address, ethers.parseEther("1"))
    )
      .to.be.revertedWithCustomError(token, "AccountBlacklisted")
      .withArgs(alice.address);
  });

  it("allows minting until the cap is reached", async function () {
    const remaining = (await token.cap()) - (await token.totalSupply());
    await token.mint(owner.address, remaining);
    expect(await token.totalSupply()).to.equal(await token.cap());
    await expect(token.mint(owner.address, 1n)).to.be.reverted;
  });
});
