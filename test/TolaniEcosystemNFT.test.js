const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TolaniEcosystemNFT", function () {
  let credential;
  let owner;
  let issuer;
  let revoker;
  let learner;
  let other;

  const credentialId = ethers.keccak256(ethers.toUtf8Bytes("TCA-FOUNDATION-CULTURE-L0-001"));
  const credentialType = ethers.keccak256(ethers.toUtf8Bytes("non_transferable_certification"));
  const evidenceHash = ethers.keccak256(ethers.toUtf8Bytes("evidence-packet"));
  const sourceHash = ethers.keccak256(ethers.toUtf8Bytes("tolani.tcas.credential-issue.v1"));
  const metadataUri = "ipfs://tcas-credential-metadata";

  beforeEach(async function () {
    [owner, issuer, revoker, learner, other] = await ethers.getSigners();

    const Credential = await ethers.getContractFactory("TolaniEcosystemNFT");
    credential = await Credential.deploy(owner.address);
    await credential.waitForDeployment();

    await credential.approveIssuer(issuer.address, "Tolani Foundation");
    await credential.grantRole(await credential.REVOKER_ROLE(), revoker.address);
  });

  it("issues a locked ERC-5192-style credential with public-safe references", async function () {
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60);

    await expect(
      credential
        .connect(issuer)
        .issueCredentialWithEvidence(
          learner.address,
          credentialId,
          metadataUri,
          credentialType,
          evidenceHash,
          sourceHash,
          expiresAt
        )
    )
      .to.emit(credential, "CredentialIssued")
      .withArgs(learner.address, credentialId, metadataUri)
      .and.to.emit(credential, "Locked")
      .withArgs(1);

    expect(await credential.ownerOf(1)).to.equal(learner.address);
    expect(await credential.tokenURI(1)).to.equal(metadataUri);
    expect(await credential.locked(1)).to.equal(true);
    expect(await credential.isCredentialActive(1)).to.equal(true);
    expect(await credential.getCredentialTokenId(credentialId)).to.equal(1n);
    expect(await credential.getIssuerType(issuer.address)).to.equal("Tolani Foundation");

    const record = await credential.getCredentialRecord(1);
    expect(record.credentialId).to.equal(credentialId);
    expect(record.credentialType).to.equal(credentialType);
    expect(record.evidenceHash).to.equal(evidenceHash);
    expect(record.sourceHash).to.equal(sourceHash);
    expect(record.issuer).to.equal(issuer.address);
    expect(record.expiresAt).to.equal(expiresAt);
    expect(record.revoked).to.equal(false);
  });

  it("rejects every wallet-to-wallet transfer path", async function () {
    await credential.connect(issuer).issueCredential(learner.address, credentialId, metadataUri, 0);

    await expect(
      credential.connect(learner).transferFrom(learner.address, other.address, 1)
    ).to.be.revertedWithCustomError(credential, "CredentialNonTransferable").withArgs(1);

    await expect(
      credential
        .connect(learner)
        ["safeTransferFrom(address,address,uint256)"](learner.address, other.address, 1)
    ).to.be.revertedWithCustomError(credential, "CredentialNonTransferable").withArgs(1);

    await expect(
      credential
        .connect(learner)
        ["safeTransferFrom(address,address,uint256,bytes)"](
          learner.address,
          other.address,
          1,
          "0x"
        )
    ).to.be.revertedWithCustomError(credential, "CredentialNonTransferable").withArgs(1);
  });

  it("prevents duplicate credential issuance", async function () {
    await credential.connect(issuer).issueCredential(learner.address, credentialId, metadataUri, 0);

    await expect(
      credential.connect(issuer).issueCredential(other.address, credentialId, metadataUri, 0)
    ).to.be.revertedWithCustomError(credential, "CredentialAlreadyIssued").withArgs(credentialId);
  });

  it("role-gates issuer and revocation authority", async function () {
    await expect(
      credential.connect(other).issueCredential(learner.address, credentialId, metadataUri, 0)
    )
      .to.be.revertedWithCustomError(credential, "AccessControlUnauthorizedAccount")
      .withArgs(other.address, await credential.ISSUER_ROLE());

    await credential.connect(issuer).issueCredential(learner.address, credentialId, metadataUri, 0);

    await expect(credential.connect(other).revokeCredential(1, "misconduct"))
      .to.be.revertedWithCustomError(credential, "AccessControlUnauthorizedAccount")
      .withArgs(other.address, await credential.REVOKER_ROLE());
  });

  it("revokes and renews credentials without making them transferable", async function () {
    await credential.connect(issuer).issueCredential(learner.address, credentialId, metadataUri, 0);

    await expect(credential.connect(revoker).revokeCredential(1, "assessment invalidated"))
      .to.emit(credential, "CredentialRevoked")
      .withArgs(learner.address, credentialId, "assessment invalidated");
    expect(await credential.isCredentialActive(1)).to.equal(false);

    const newExpiration = BigInt(Math.floor(Date.now() / 1000) + 730 * 24 * 60 * 60);
    await expect(credential.connect(issuer).renewCredential(1, newExpiration))
      .to.emit(credential, "CredentialRenewed")
      .withArgs(learner.address, credentialId, newExpiration);

    const record = await credential.getCredentialRecord(1);
    expect(record.expiresAt).to.equal(newExpiration);

    await expect(
      credential.connect(learner).transferFrom(learner.address, other.address, 1)
    ).to.be.revertedWithCustomError(credential, "CredentialNonTransferable").withArgs(1);
  });

  it("supports issuer approval and removal events", async function () {
    const freshIssuer = other;

    await expect(credential.approveIssuer(freshIssuer.address, "Tolani Labs"))
      .to.emit(credential, "IssuerApproved")
      .withArgs(freshIssuer.address, "Tolani Labs");
    expect(await credential.hasRole(await credential.ISSUER_ROLE(), freshIssuer.address)).to.equal(true);

    await expect(credential.removeIssuer(freshIssuer.address))
      .to.emit(credential, "IssuerRemoved")
      .withArgs(freshIssuer.address);
    expect(await credential.hasRole(await credential.ISSUER_ROLE(), freshIssuer.address)).to.equal(false);
  });
});
