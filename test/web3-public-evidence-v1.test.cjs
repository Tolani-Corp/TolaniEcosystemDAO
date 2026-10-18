const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { verifyPublicEvidenceObservation } = require("../scripts/verify-web3-public-evidence-v1.cjs");
const policy = JSON.parse(readFileSync(resolve(__dirname, "../config/web3-gateway-evidence-adoption-v1.json"), "utf8"));
const bytes = Buffer.from("approved-public-dao-evidence");
const cid = "bafybeigdyrzt5sfp7udm7hu76uhkcbztsrx4u2n5nxkijgjltu7n6n46gi";
function receipt(overrides = {}) {
  return {
    schemaVersion: "tolani.web3-evidence-observation.v1",
    cid, sourceRef: "dao-evidence:case-001", approvalReceiptRef: "approval:public-001",
    sha256: "sha256:" + createHash("sha256").update(bytes).digest("hex"),
    sizeBytes: bytes.length, truthState: "OBSERVED", z4Qualification: "PENDING",
    publishingAuthorized: false, productionAuthorityGranted: false, ...overrides,
  };
}
test("DAO accepts byte-identical approved public observation without mint or treasury authority", () => {
  const check = verifyPublicEvidenceObservation({ policy, receipt: receipt(), artifactBytes: bytes });
  assert.equal(check.integrity, "PASS");
  assert.equal(check.governanceAuthorityGranted, false);
  assert.equal(check.tokenAuthorityGranted, false);
  assert.equal(check.productionAuthorityGranted, false);
  assert.equal(check.z4Qualification, "PENDING");
});
test("DAO rejects altered, missing, or prematurely promoted evidence", () => {
  for (const r of [
    receipt({ sizeBytes: 4 }), receipt({ sha256: "sha256:" + "0".repeat(64) }),
    receipt({ truthState: "AUTHORITATIVE" }), receipt({ z4Qualification: "PASS" }),
    receipt({ productionAuthorityGranted: true }), receipt({ publishingAuthorized: true }),
    receipt({ approvalReceiptRef: "" }), receipt({ cid: "../private" }),
  ]) {
    assert.throws(() => verifyPublicEvidenceObservation({ policy, receipt: r, artifactBytes: bytes }),
      /dao-web3-evidence-denied/u);
  }
});
test("DAO rejects accidental feature activation in policy", () => {
  for (const flag of ["productionEnabled", "tokenMintingEnabled", "treasuryExecutionEnabled", "daoProposalExecutionEnabled", "automaticPublicationEnabled", "authoritativeIssuanceEnabled"]) {
    assert.throws(() => verifyPublicEvidenceObservation({
      policy: { ...policy, [flag]: true }, receipt: receipt(), artifactBytes: bytes,
    }), /policy-not-fail-closed/u);
  }
});
