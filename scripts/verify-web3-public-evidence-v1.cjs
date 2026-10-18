const { createHash } = require("node:crypto");

const SHA256 = /^sha256:[a-f0-9]{64}$/u;
const CID_V1 = /^b[a-z2-7]{20,150}$/u;
const CID_V0 = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/u;
function deny(reason) { throw new Error(`dao-web3-evidence-denied:${reason}`); }

function verifyPublicEvidenceObservation({ receipt, artifactBytes, policy }) {
  if (policy?.schemaVersion !== "tolani.dao-web3-evidence-adoption.v1" ||
      policy.productionEnabled !== false ||
      policy.tokenMintingEnabled !== false ||
      policy.treasuryExecutionEnabled !== false ||
      policy.daoProposalExecutionEnabled !== false ||
      policy.automaticPublicationEnabled !== false ||
      policy.authoritativeIssuanceEnabled !== false) deny("policy-not-fail-closed");
  if (receipt?.schemaVersion !== policy.requiredReceiptSchema ||
      receipt.truthState !== "OBSERVED" || receipt.z4Qualification !== "PENDING" ||
      receipt.productionAuthorityGranted !== false || receipt.publishingAuthorized !== false) {
    deny("unexpected-receipt-authority");
  }
  if (typeof receipt.sourceRef !== "string" || !receipt.sourceRef.trim() ||
      typeof receipt.approvalReceiptRef !== "string" || !receipt.approvalReceiptRef.trim()) {
    deny("missing-source-or-approval-ref");
  }
  if (typeof receipt.cid !== "string" ||
      !(CID_V1.test(receipt.cid) || CID_V0.test(receipt.cid))) deny("invalid-cid");
  if (!SHA256.test(receipt.sha256 ?? "")) deny("invalid-digest");
  if (!Buffer.isBuffer(artifactBytes) && !(artifactBytes instanceof Uint8Array)) deny("artifact-bytes-required");
  if (artifactBytes.byteLength !== receipt.sizeBytes) deny("size-mismatch");
  const hash = `sha256:${createHash("sha256").update(artifactBytes).digest("hex")}`;
  if (hash !== receipt.sha256) deny("digest-mismatch");
  return Object.freeze({
    schemaVersion: "tolani.dao-public-evidence-check.v1",
    sourceRef: receipt.sourceRef, cid: receipt.cid, sha256: hash,
    integrity: "PASS", truthState: "OBSERVED",
    governanceAuthorityGranted: false, tokenAuthorityGranted: false,
    productionAuthorityGranted: false,
    z4Qualification: "PENDING",
  });
}

if (require.main === module) {
  const { readFileSync } = require("node:fs");
  const { resolve } = require("node:path");
  const [receiptFile, artifactFile] = process.argv.slice(2);
  if (!receiptFile || !artifactFile) {
    console.error("Usage: node scripts/verify-web3-public-evidence-v1.cjs <receipt.json> <artifact-file>");
    process.exitCode = 2;
  } else {
    const policy = JSON.parse(readFileSync(resolve(__dirname, "../config/web3-gateway-evidence-adoption-v1.json"), "utf8"));
    const receipt = JSON.parse(readFileSync(resolve(receiptFile), "utf8"));
    const result = verifyPublicEvidenceObservation({
      policy, receipt, artifactBytes: readFileSync(resolve(artifactFile)),
    });
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  }
}
module.exports = { verifyPublicEvidenceObservation };
