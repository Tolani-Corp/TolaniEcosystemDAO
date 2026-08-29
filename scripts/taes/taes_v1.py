#!/usr/bin/env python3
"""Tolani Asset & Evidence Standard (TAES) v1 fail-closed conformance validator."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

TAES_VERSION = "1.0.0"
DIGEST_RE = re.compile(r"^sha256:[a-f0-9]{64}$")

ASSET_CLASSES = {
    "E0_EVIDENCE_ANCHOR",
    "E1_CREDENTIAL_ATTESTATION",
    "D1_DATA_ASSET",
    "IP1_DIGITAL_IP_ASSET",
    "R1_RWA_DIGITAL_TWIN",
    "F1_FINANCIAL_RWA_INSTRUMENT",
    "C1_COLLATERAL_ELIGIBLE_ASSET",
    "TUT_UTILITY_GOVERNANCE",
}
FINANCIAL_CLASSES = {"F1_FINANCIAL_RWA_INSTRUMENT", "C1_COLLATERAL_ELIGIBLE_ASSET"}
RIGHTS_REQUIRED_CLASSES = {
    "D1_DATA_ASSET",
    "IP1_DIGITAL_IP_ASSET",
    "R1_RWA_DIGITAL_TWIN",
    "F1_FINANCIAL_RWA_INSTRUMENT",
    "C1_COLLATERAL_ELIGIBLE_ASSET",
}
INVESTOR_RIGHTS = {"OWNERSHIP", "PRINCIPAL", "INTEREST", "DIVIDEND", "REVENUE_SHARE", "REDEMPTION"}
FINANCIAL_LEGAL_CLASSES = {"SECURITY", "FUND_INTEREST", "DEBT", "EQUITY"}


@dataclass(frozen=True)
class Decision:
    allowed: bool
    status: str
    reasons: tuple[str, ...]


def _load(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        raise ValueError(f"invalid-json:{path}:{exc}") from exc
    if not isinstance(value, dict):
        raise ValueError(f"root-object-required:{path}")
    return value


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _get(value: dict[str, Any], *path: str, default: Any = None) -> Any:
    cursor: Any = value
    for part in path:
        if not isinstance(cursor, dict) or part not in cursor:
            return default
        cursor = cursor[part]
    return cursor


def _nonempty(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _validate_evidence_refs(refs: Any, prefix: str, reasons: list[str], *, required: bool) -> None:
    items = _list(refs)
    if required and not items:
        reasons.append(f"{prefix}-required")
        return
    for index, ref in enumerate(items):
        if not isinstance(ref, dict):
            reasons.append(f"{prefix}[{index}]-object-required")
            continue
        if not _nonempty(ref.get("evidenceId")):
            reasons.append(f"{prefix}[{index}]-evidence-id-required")
        digest = ref.get("digestSha256")
        if not isinstance(digest, str) or not DIGEST_RE.fullmatch(digest):
            reasons.append(f"{prefix}[{index}]-sha256-invalid")
        if ref.get("authority") not in {"PRIMARY", "ISSUER", "CONTRACTUAL", "INDEPENDENT", "DERIVED"}:
            reasons.append(f"{prefix}[{index}]-authority-invalid")
        if not _nonempty(ref.get("recordedAt")):
            reasons.append(f"{prefix}[{index}]-recorded-at-required")


def validate_project_manifest(manifest: dict[str, Any]) -> Decision:
    reasons: list[str] = []
    if manifest.get("schema") != "tolani.taes.project-conformance.v1":
        reasons.append("project-schema-invalid")
    if manifest.get("standardVersion") != TAES_VERSION:
        reasons.append("project-standard-version-invalid")
    if manifest.get("required") is not True:
        reasons.append("taes-must-be-required")
    if not _nonempty(manifest.get("projectId")):
        reasons.append("project-id-required")
    if not _nonempty(manifest.get("repository")):
        reasons.append("repository-required")
    if not _nonempty(manifest.get("contractPackage")):
        reasons.append("contract-package-required")

    evidence_system = manifest.get("evidenceSystem")
    if not isinstance(evidence_system, dict):
        reasons.append("evidence-system-required")
    else:
        if not _nonempty(evidence_system.get("metadataAuthority")):
            reasons.append("metadata-authority-required")
        if not _nonempty(evidence_system.get("artifactAuthority")):
            reasons.append("artifact-authority-required")
        if evidence_system.get("rawObjectKeysUserFacing") is not False:
            reasons.append("raw-evidence-object-keys-must-not-be-user-facing")

    enabled = _list(manifest.get("enabledAssetClasses"))
    if not enabled:
        reasons.append("enabled-asset-classes-required")
    for asset_class in enabled:
        if asset_class not in ASSET_CLASSES:
            reasons.append(f"unknown-asset-class:{asset_class}")

    if manifest.get("legalGateRequiredForFinancialAssets") is not True:
        reasons.append("financial-asset-legal-gate-required")
    if manifest.get("humanGateRequiredForMinting") is not True:
        reasons.append("human-mint-gate-required")
    if manifest.get("productionMintingEnabled") is True and not _nonempty(manifest.get("productionMintAuthorityReceipt")):
        reasons.append("production-mint-authority-receipt-required")

    unique = tuple(dict.fromkeys(reasons))
    return Decision(not unique, "CONFORMANT" if not unique else "DENIED", unique)


def validate_asset_manifest(asset: dict[str, Any]) -> Decision:
    reasons: list[str] = []
    if asset.get("schema") != "tolani.taes.asset-manifest.v1":
        reasons.append("asset-schema-invalid")
    if asset.get("standardVersion") != TAES_VERSION:
        reasons.append("asset-standard-version-invalid")
    asset_class = asset.get("assetClass")
    if asset_class not in ASSET_CLASSES:
        reasons.append("asset-class-invalid")

    source = asset.get("sourceSystem")
    if not isinstance(source, dict) or source.get("authoritative") is not True:
        reasons.append("authoritative-source-system-required")

    provenance = asset.get("provenance")
    if not isinstance(provenance, dict):
        reasons.append("provenance-required")
    else:
        _validate_evidence_refs(provenance.get("evidenceRefs"), "evidence-refs", reasons, required=True)
        root = provenance.get("evidenceRootSha256")
        if not isinstance(root, str) or not DIGEST_RE.fullmatch(root):
            reasons.append("evidence-root-sha256-invalid")
        if asset_class in RIGHTS_REQUIRED_CLASSES:
            _validate_evidence_refs(provenance.get("rightsEvidenceRefs"), "rights-evidence-refs", reasons, required=True)

    rights = asset.get("rights")
    economic_rights: set[str] = set()
    if not isinstance(rights, dict):
        reasons.append("rights-required")
    else:
        economic_rights = {str(item) for item in _list(rights.get("economicRights"))}
        if not economic_rights:
            reasons.append("economic-rights-required")
        if asset_class in RIGHTS_REQUIRED_CLASSES and rights.get("status") in {None, "UNVERIFIED", "ISSUER_ATTESTED"}:
            reasons.append("verified-rights-required")

    privacy = asset.get("privacy")
    token = asset.get("token")
    if not isinstance(privacy, dict):
        reasons.append("privacy-required")
    if not isinstance(token, dict):
        reasons.append("token-policy-required")
        token = {}

    token_requested = token.get("requested") is True
    token_mode = token.get("mode")
    if token_requested and token_mode in {None, "NONE"}:
        reasons.append("token-request-requires-token-mode")
    if not token_requested and token_mode not in {None, "NONE"}:
        reasons.append("token-mode-requires-token-request")
    if isinstance(privacy, dict):
        if token.get("metadataVisibility") == "PUBLIC" and privacy.get("publicDisclosureAllowed") is not True:
            reasons.append("public-token-metadata-not-authorized")
        if privacy.get("containsSensitivePersonalData") is True and token.get("metadataVisibility") == "PUBLIC":
            reasons.append("sensitive-personal-data-cannot-be-public-token-metadata")

    transfer = asset.get("transferPolicy")
    if not isinstance(transfer, dict):
        reasons.append("transfer-policy-required")
        transfer = {}

    approvals = asset.get("approvals")
    if not isinstance(approvals, dict):
        approvals = {}
        reasons.append("approvals-required")

    if asset_class in {"E0_EVIDENCE_ANCHOR", "E1_CREDENTIAL_ATTESTATION"}:
        if transfer.get("transferability") != "NON_TRANSFERABLE":
            reasons.append("evidence-and-credential-assets-are-non-transferable")
        if any(right != "NONE" for right in economic_rights):
            reasons.append("evidence-and-credential-assets-cannot-grant-economic-rights")
        if token_mode not in {None, "NONE", "ATTESTATION"}:
            reasons.append("evidence-and-credential-assets-are-attestation-only")

    compliance = asset.get("compliance")
    if not isinstance(compliance, dict):
        reasons.append("compliance-required")
        compliance = {}

    if asset_class == "TUT_UTILITY_GOVERNANCE":
        if compliance.get("legalClassification") != "UTILITY_TOKEN":
            reasons.append("tut-must-remain-utility-token-classification")
        if INVESTOR_RIGHTS.intersection(economic_rights):
            reasons.append("tut-cannot-grant-investor-economic-rights")

    if token_requested and not _nonempty(approvals.get("humanApprovalReceipt")):
        reasons.append("human-mint-approval-required")

    if asset_class == "R1_RWA_DIGITAL_TWIN":
        valuation = asset.get("valuation")
        if not isinstance(valuation, dict) or valuation.get("method") in {None, "NOT_APPLICABLE"}:
            reasons.append("rwa-valuation-required")

    if asset_class in FINANCIAL_CLASSES:
        if compliance.get("legalClassification") not in FINANCIAL_LEGAL_CLASSES:
            reasons.append("financial-rwa-requires-financial-legal-classification")
        if compliance.get("legalReviewStatus") != "APPROVED":
            reasons.append("approved-legal-review-required")
        if not _nonempty(approvals.get("legalApprovalReceipt")):
            reasons.append("legal-approval-receipt-required")
        if compliance.get("kycAmlPolicy") == "NOT_REQUIRED" or compliance.get("kycAmlPolicy") is None:
            reasons.append("kyc-aml-policy-required")
        if compliance.get("sanctionsScreening") == "NOT_REQUIRED" or compliance.get("sanctionsScreening") is None:
            reasons.append("sanctions-screening-required")
        if transfer.get("transferability") not in {"RESTRICTED", "PERMISSIONED"}:
            reasons.append("financial-rwa-v1-requires-restricted-or-permissioned-transfer")
        if transfer.get("allowlistRequired") is not True:
            reasons.append("financial-rwa-requires-transfer-allowlist")
        if not _nonempty(compliance.get("custodian")):
            reasons.append("custodian-required")
        if not _nonempty(compliance.get("registrarOrTransferAgent")):
            reasons.append("registrar-or-transfer-agent-required")
        if not _nonempty(compliance.get("servicer")):
            reasons.append("servicer-required")
        valuation = asset.get("valuation")
        if not isinstance(valuation, dict) or valuation.get("method") in {None, "NOT_APPLICABLE"} or valuation.get("amountMinor") is None:
            reasons.append("financial-valuation-required")
        if not isinstance(provenance, dict) or provenance.get("independentlyVerified") is not True:
            reasons.append("independent-provenance-verification-required")
        if token.get("productionMintAuthority") is True and not _nonempty(approvals.get("independentReviewReceipt")):
            reasons.append("independent-review-required-for-production-mint")

    lifecycle = asset.get("lifecycleState")
    if lifecycle in {"SUSPENDED", "RETIRED"}:
        reasons.append("asset-not-active")

    unique = tuple(dict.fromkeys(reasons))
    if unique:
        status = "INSTITUTIONAL_REVIEW_REQUIRED" if asset_class in FINANCIAL_CLASSES else "DENIED"
        return Decision(False, status, unique)
    if not token_requested:
        return Decision(True, "EVIDENCE_ONLY", ())
    if asset_class in {"E0_EVIDENCE_ANCHOR", "E1_CREDENTIAL_ATTESTATION"}:
        return Decision(True, "ATTESTATION_ELIGIBLE", ())
    return Decision(True, "ASSET_TOKEN_ELIGIBLE", ())


def build_receipt(project_path: Path, project: dict[str, Any], project_decision: Decision, asset_path: Path | None, asset_decision: Decision | None) -> dict[str, Any]:
    return {
        "schema": "tolani.taes.conformance-receipt.v1",
        "standardVersion": TAES_VERSION,
        "validator": "TolaniCorp-HQ/platform/taes/v1/taes_v1.py",
        "evaluatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "projectId": project.get("projectId"),
        "repository": project.get("repository"),
        "projectManifestSha256": _sha256(project_path),
        "projectDecision": {
            "allowed": project_decision.allowed,
            "status": project_decision.status,
            "reasons": list(project_decision.reasons),
        },
        "asset": None if asset_path is None else {
            "manifestSha256": _sha256(asset_path),
            "decision": None if asset_decision is None else {
                "allowed": asset_decision.allowed,
                "status": asset_decision.status,
                "reasons": list(asset_decision.reasons),
            },
        },
        "productionAuthorityGranted": False,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project-manifest", required=True, type=Path)
    parser.add_argument("--asset-manifest", type=Path)
    parser.add_argument("--output", type=Path, default=Path("taes-v1-conformance-receipt.json"))
    args = parser.parse_args()

    project = _load(args.project_manifest)
    project_decision = validate_project_manifest(project)
    asset_decision: Decision | None = None
    if args.asset_manifest:
        asset_decision = validate_asset_manifest(_load(args.asset_manifest))

    receipt = build_receipt(args.project_manifest, project, project_decision, args.asset_manifest, asset_decision)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    if not project_decision.allowed or (asset_decision is not None and not asset_decision.allowed):
        print(json.dumps(receipt, indent=2, sort_keys=True))
        return 2
    print(json.dumps(receipt, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
