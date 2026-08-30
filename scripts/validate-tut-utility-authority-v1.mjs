import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const failures = [];
const read = (path) => readFileSync(path, "utf8");
const json = (path) => JSON.parse(read(path));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const fail = (condition, message) => {
  if (!condition) failures.push(message);
};

const planePath = "config/tut/authority-plane-v1.json";
const legalPath = "config/tut/legal-classification-v1.json";
const utilitiesPath = "config/tut/authorized-utilities-v1.json";
const programsPath = "config/tut/reward-programs-v1.json";
const claimsPath = "config/tut/public-claims-policy-v1.json";
const evidenceSchemaPath = "schemas/tut-evidence-receipt-v1.schema.json";
const accountingSchemaPath = "schemas/tut-accounting-entry-v1.schema.json";
const fixturePath = "fixtures/tut/taskstaff-worker-qualified-receipt.json";
const contractPath = "contracts/TUTUtilityEvidenceAuthority.sol";
const taesPath = "config/taes-v1.json";

const plane = json(planePath);
const legal = json(legalPath);
const utilities = json(utilitiesPath);
const programs = json(programsPath);
const claims = json(claimsPath);
const evidenceSchema = json(evidenceSchemaPath);
const accountingSchema = json(accountingSchemaPath);
const fixture = json(fixturePath);
const taes = json(taesPath);
const contract = read(contractPath);

fail(plane.schema === "tolani.tut.utility-evidence-authority-plane.v1", "authority plane schema drifted");
fail(plane.version === "1.0.0", "authority plane version drifted");
for (const key of ["mint", "transfer", "treasuryExecution", "entityDirectMint", "agentDirectMint", "automaticRewardDistribution"]) {
  fail(plane.productionAuthority?.[key] === false, `production authority ${key} must remain false`);
}

fail(taes.schema === "tolani.taes.project-conformance.v1", "TAES manifest missing or invalid");
fail(taes.productionMintingEnabled === false, "TAES production minting must remain disabled");
fail(
  JSON.stringify(taes.enabledAssetClasses) === JSON.stringify(["E0_EVIDENCE_ANCHOR", "TUT_UTILITY_GOVERNANCE"]),
  "DAO TAES classes must remain E0_EVIDENCE_ANCHOR + TUT_UTILITY_GOVERNANCE"
);

fail(legal.schema === "tolani.tut.legal-classification.v1", "legal classification schema drifted");
fail(legal.token?.productionMintingEnabled === false, "legal registry cannot authorize production minting");
fail(legal.wyomingDao?.entityName === "Tolani Ecosystem DAO LLC", "Wyoming DAO entity name drifted");
fail(legal.wyomingDao?.originalId === "2026-002049125", "Wyoming formation identifier drifted");
fail(legal.wyomingDao?.filedDate === "2026-08-05", "Wyoming filing date drifted");
fail(legal.wyomingDao?.memberManaged === true, "Wyoming member-managed posture drifted");
fail(
  legal.wyomingDao?.publicIdentifier === "0x90e9d7189D605a824C2481Fe88A1d9A7DDFAF71D",
  "Wyoming DAO public identifier drifted"
);
fail(
  legal.wyomingDao?.governor === "0xeEd65936FaEDb315c598F8b1aF796289BCE2B7f6",
  "Wyoming Governor identifier drifted"
);
fail(legal.wyomingDao?.operatingAgreementReconciled === false, "operating agreement must not be silently treated as reconciled");
for (const key of [
  "tokenPossessionCreatesLegalMembership",
  "tokenVotingPowerCreatesLegalMembership",
  "tokenDelegationCreatesLegalMembership",
  "utilityRewardCreatesLegalMembership",
  "smartContractMaySelfAdmitLegalMembers",
]) {
  fail(legal.membershipFirewall?.[key] === false, `membership firewall ${key} must remain false`);
}
for (const [right, value] of Object.entries(legal.investorRights ?? {})) {
  fail(value === false, `investor right ${right} must remain false`);
}

fail(utilities.schema === "tolani.tut.authorized-utilities.v1", "utility registry schema drifted");
fail(utilities.defaultAcceptanceEnabled === false, "default TUT acceptance must remain disabled");
for (const utility of utilities.utilities ?? []) {
  fail(utility.acceptanceEnabled === false, `${utility.utilityId} is not authorized for live acceptance in v1`);
  fail(utility.cashEquivalentRepresentationAllowed === false, `${utility.utilityId} cannot represent cash equivalence`);
  fail(utility.transferOrExchangeServiceAllowed === false, `${utility.utilityId} cannot create a transfer/exchange service`);
}

fail(programs.schema === "tolani.tut.reward-programs.v1", "reward program registry schema drifted");
fail(programs.defaultEmissionEnabled === false, "default reward emission must remain disabled");
const taskstaff = (programs.programs ?? []).find((item) => item.programId === "taskstaff.worker-qualification-evidence.v1");
fail(Boolean(taskstaff), "TaskStaff evidence pilot is required");
if (taskstaff) {
  fail(taskstaff.producerEntityId === "tolani.taskstaff", "TaskStaff producer authority drifted");
  fail(taskstaff.sourceEvent === "worker_intake.qualified", "TaskStaff source event drifted");
  fail(taskstaff.evidenceProductionEnabled === true, "TaskStaff must be enabled as evidence producer");
  fail(taskstaff.rewardEligibilityEnabled === false, "worker qualification must not itself be reward eligible");
  fail(taskstaff.emissionEnabled === false, "TaskStaff must not emit TUT");
  fail(taskstaff.perReceiptCapTUT === "0" && taskstaff.epochCapTUT === "0", "TaskStaff evidence pilot caps must remain zero");
}
for (const program of programs.programs ?? []) {
  fail(program.emissionEnabled === false, `${program.programId} cannot enable emission in v1`);
}

fail(claims.schema === "tolani.tut.public-claims-policy.v1", "public claims policy schema drifted");
for (const blocked of [
  "price_appreciation",
  "guaranteed_value",
  "guaranteed_return",
  "dividend",
  "revenue_share",
  "equity_or_subsidiary_ownership",
  "automatic_legal_dao_membership",
  "guaranteed_liquidity",
]) {
  fail(claims.prohibitedThemes?.includes(blocked), `claims firewall missing ${blocked}`);
}
fail(claims.aiCampaignGenerationEnabled === false, "AI token campaign generation must remain disabled");
fail(claims.publicSaleOrLiquidityMarketingEnabled === false, "public sale/liquidity marketing must remain disabled");

fail(evidenceSchema.additionalProperties === false, "evidence receipt must reject unknown fields");
for (const required of [
  "receiptId",
  "producerEntityId",
  "sourceEvent",
  "sourceRecordIdHash",
  "subjectIdHash",
  "evidenceDigestSha256",
  "decisionReceiptDigestSha256",
  "rewardProgramId",
  "rewardEligible",
]) {
  fail(evidenceSchema.required?.includes(required), `evidence schema missing ${required}`);
}
for (const forbiddenField of ["walletAddress", "email", "name", "ssn", "dateOfBirth", "amountTUT", "requestedTUT"]) {
  fail(!(forbiddenField in (evidenceSchema.properties ?? {})), `producer evidence schema must not expose ${forbiddenField}`);
}

fail(accountingSchema.additionalProperties === false, "accounting schema must reject unknown fields");
fail(
  JSON.stringify(accountingSchema.properties?.kind?.enum) === JSON.stringify(["EARNED", "ISSUED", "REDEEMED", "EXPIRED", "BURNED", "TREASURY_HELD"]),
  "accounting kinds drifted"
);

const digestPattern = /^sha256:[a-f0-9]{64}$/;
fail(fixture.schema === "tolani.tut.evidence-receipt.v1", "TaskStaff fixture schema drifted");
fail(fixture.producerEntityId === "tolani.taskstaff", "TaskStaff fixture producer drifted");
fail(fixture.sourceEvent === "worker_intake.qualified", "TaskStaff fixture event drifted");
fail(fixture.rewardProgramId === "taskstaff.worker-qualification-evidence.v1", "TaskStaff fixture program drifted");
fail(fixture.rewardEligible === false, "TaskStaff qualification fixture cannot be reward eligible");
for (const field of ["sourceRecordIdHash", "subjectIdHash", "evidenceDigestSha256", "decisionReceiptDigestSha256", "metadataDigestSha256"]) {
  fail(digestPattern.test(fixture[field]), `TaskStaff fixture ${field} is not a SHA-256 reference`);
}
for (const forbidden of ["email", "phone", "preferredName", "name", "ssn", "dateOfBirth", "walletAddress"]) {
  fail(!(forbidden in fixture), `TaskStaff evidence fixture leaked ${forbidden}`);
}

fail(contract.includes("bool public constant PRODUCTION_MINTING_ENABLED = false;"), "contract production mint firewall missing");
fail(contract.includes("TOKEN_POSSESSION_CREATES_LEGAL_MEMBERSHIP = false"), "contract possession membership firewall missing");
fail(contract.includes("TOKEN_VOTING_POWER_CREATES_LEGAL_MEMBERSHIP = false"), "contract voting membership firewall missing");
for (const forbiddenCode of ["IERC20", "MINTER_ROLE", ".mint(", ".transfer(", "safeTransfer("]) {
  fail(!contract.includes(forbiddenCode), `authority contract must not contain token execution primitive ${forbiddenCode}`);
}

if (failures.length) {
  console.error("TUT Utility & Evidence Authority Plane v1 validation failed");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const inputs = [planePath, legalPath, utilitiesPath, programsPath, claimsPath, evidenceSchemaPath, accountingSchemaPath, fixturePath, contractPath, taesPath];
const receipt = {
  schema: "tolani.tut.utility-evidence-authority-validation-receipt.v1",
  valid: true,
  productionMintingEnabled: false,
  legalMembershipByTokenPossession: false,
  activeUtilityAcceptanceCount: (utilities.utilities ?? []).filter((item) => item.acceptanceEnabled).length,
  taskstaffEvidenceProducer: true,
  taskstaffRewardEligibility: false,
  taskstaffEmissionEnabled: false,
  inputs: Object.fromEntries(inputs.map((path) => [path, `sha256:${sha256(read(path))}`])),
};
writeFileSync("tut-utility-authority-v1-validation-receipt.json", `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
