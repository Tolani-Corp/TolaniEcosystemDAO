const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TUTUtilityEvidenceAuthority", function () {
  let authority;
  let admin;
  let producer;
  let workerWallet;

  const id = (value) => ethers.id(value);
  const digest = (value) => ethers.keccak256(ethers.toUtf8Bytes(value));
  const programConfig = (overrides = {}) => ({
    producerEntityId: id("tolani.taskstaff"),
    sourceEvent: id("worker_intake.qualified"),
    perReceiptCap: 0,
    epochCap: 0,
    epochStart: 0,
    epochEnd: 0,
    complianceRequired: false,
    evidenceProductionEnabled: true,
    rewardEligibilityEnabled: false,
    emissionEnabled: false,
    policyDigest: digest("default-program-policy"),
    ...overrides,
  });
  const evidenceSubmission = (programId, sourceEvent, overrides = {}) => ({
    programId,
    subjectIdHash: digest("subject"),
    sourceRecordIdHash: digest("source"),
    evidenceDigest: digest("evidence"),
    decisionReceiptDigest: digest("decision"),
    sourceEvent,
    occurredAt: 1,
    ...overrides,
  });

  beforeEach(async function () {
    [admin, producer, workerWallet] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("TUTUtilityEvidenceAuthority");
    authority = await Factory.deploy(
      admin.address,
      digest("legal-classification-v1"),
      digest("public-claims-policy-v1")
    );
    await authority.waitForDeployment();
  });

  it("hard-codes the non-minting and legal-membership firewall", async function () {
    expect(await authority.PRODUCTION_MINTING_ENABLED()).to.equal(false);
    expect(await authority.TOKEN_POSSESSION_CREATES_LEGAL_MEMBERSHIP()).to.equal(false);
    expect(await authority.TOKEN_VOTING_POWER_CREATES_LEGAL_MEMBERSHIP()).to.equal(false);
    expect(await authority.TOKEN_DELEGATION_CREATES_LEGAL_MEMBERSHIP()).to.equal(false);
  });

  it("allows TaskStaff evidence production without allowing the producer to declare a reward", async function () {
    const entityId = id("tolani.taskstaff");
    const programId = id("taskstaff.worker-qualification-evidence.v1");
    const sourceEvent = id("worker_intake.qualified");
    const receiptId = id("receipt-1");

    await authority.setEntityAuthority(entityId, producer.address, true, digest("taskstaff-policy"));
    await authority.setRewardProgram(programId, programConfig({
      producerEntityId: entityId,
      sourceEvent,
      policyDigest: digest("evidence-pilot-policy"),
    }));

    await authority.connect(producer).submitEvidenceReceipt(
      receiptId,
      evidenceSubmission(programId, sourceEvent, {
        subjectIdHash: digest("subject-pseudonym"),
        sourceRecordIdHash: digest("source-record"),
        evidenceDigest: digest("evidence-root"),
        decisionReceiptDigest: digest("human-decision-receipt"),
      })
    );

    const receipt = await authority.evidenceReceipts(receiptId);
    expect(receipt.producer).to.equal(producer.address);
    expect(receipt.rewardEligible).to.equal(false);
    expect(receipt.status).to.equal(1n);

    await expect(
      authority.reviewEvidenceReceipt(receiptId, 2, true, digest("review"))
    ).to.be.revertedWithCustomError(authority, "RewardEligibilityDisabled");

    await authority.reviewEvidenceReceipt(receiptId, 2, false, digest("review-no-reward"));
    const reviewed = await authority.evidenceReceipts(receiptId);
    expect(reviewed.status).to.equal(2n);
    expect(reviewed.rewardEligible).to.equal(false);
  });

  it("rejects any program that attempts to enable emission in v1", async function () {
    await expect(
      authority.setRewardProgram(id("program"), programConfig({
        producerEntityId: id("entity"),
        sourceEvent: id("event"),
        perReceiptCap: 100,
        epochCap: 1000,
        rewardEligibilityEnabled: true,
        emissionEnabled: true,
        policyDigest: digest("policy"),
      }))
    ).to.be.revertedWithCustomError(authority, "ProgramEmissionMustRemainDisabled");
  });

  it("requires reviewed evidence, wallet eligibility and budget caps before reward authorization", async function () {
    const entityId = id("tolani.taskstaff");
    const programId = id("taskstaff.accepted-mission-outcome.v1");
    const sourceEvent = id("mission_outcome.accepted");
    const receiptId = id("receipt-rewardable");
    const authorizationId = id("auth-1");
    const block = await ethers.provider.getBlock("latest");
    const now = BigInt(block.timestamp);

    await authority.setEntityAuthority(entityId, producer.address, true, digest("taskstaff-policy"));
    await authority.setRewardProgram(programId, programConfig({
      producerEntityId: entityId,
      sourceEvent,
      perReceiptCap: 100,
      epochCap: 500,
      epochStart: now - 10n,
      epochEnd: now + 3600n,
      complianceRequired: true,
      rewardEligibilityEnabled: true,
      policyDigest: digest("reward-policy"),
    }));

    await authority.connect(producer).submitEvidenceReceipt(
      receiptId,
      evidenceSubmission(programId, sourceEvent, { occurredAt: Number(now) })
    );
    await authority.reviewEvidenceReceipt(receiptId, 2, true, digest("review-approved"));

    await expect(
      authority.authorizeReward(
        authorizationId,
        receiptId,
        workerWallet.address,
        80,
        Number(now + 1800n),
        digest("treasury-approval")
      )
    ).to.be.revertedWithCustomError(authority, "WalletNotEligible");

    await authority.setWalletEligibility(
      workerWallet.address,
      1,
      Number(now + 3600n),
      digest("wallet-screening")
    );

    await authority.authorizeReward(
      authorizationId,
      receiptId,
      workerWallet.address,
      80,
      Number(now + 1800n),
      digest("treasury-approval")
    );

    const reward = await authority.rewardAuthorizations(authorizationId);
    expect(reward.amount).to.equal(80n);
    expect(reward.wallet).to.equal(workerWallet.address);
    expect(await authority.accountingTotals(0)).to.equal(80n);

    await expect(
      authority.authorizeReward(
        id("auth-too-large"),
        receiptId,
        workerWallet.address,
        101,
        Number(now + 1800n),
        digest("too-large")
      )
    ).to.be.revertedWithCustomError(authority, "PerReceiptCapExceeded");
  });

  it("records observed issuance only against an existing authorization and never moves tokens itself", async function () {
    const entityId = id("tolani.taskstaff");
    const programId = id("program-issued-ledger");
    const sourceEvent = id("mission_outcome.accepted");
    const receiptId = id("receipt-issued");
    const authorizationId = id("auth-issued");
    const block = await ethers.provider.getBlock("latest");
    const now = BigInt(block.timestamp);

    await authority.setEntityAuthority(entityId, producer.address, true, digest("entity"));
    await authority.setRewardProgram(programId, programConfig({
      producerEntityId: entityId,
      sourceEvent,
      perReceiptCap: 100,
      epochCap: 500,
      epochStart: now - 10n,
      epochEnd: now + 3600n,
      rewardEligibilityEnabled: true,
      policyDigest: digest("program"),
    }));
    await authority.connect(producer).submitEvidenceReceipt(
      receiptId,
      evidenceSubmission(programId, sourceEvent, { occurredAt: Number(now) })
    );
    await authority.reviewEvidenceReceipt(receiptId, 2, true, digest("review"));
    await authority.authorizeReward(
      authorizationId,
      receiptId,
      workerWallet.address,
      75,
      0,
      digest("approval")
    );

    await authority.recordAccountingEntry(
      id("issued-entry-1"),
      1,
      authorizationId,
      workerWallet.address,
      50,
      digest("external-treasury-receipt")
    );
    expect(await authority.issuedAgainstAuthorization(authorizationId)).to.equal(50n);
    expect(await authority.accountingTotals(1)).to.equal(50n);

    await expect(
      authority.recordAccountingEntry(
        id("issued-entry-overage"),
        1,
        authorizationId,
        workerWallet.address,
        26,
        digest("external-overage")
      )
    ).to.be.revertedWithCustomError(authority, "IssuanceExceedsAuthorization");
  });
});
