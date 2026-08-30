// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title TUT Utility & Evidence Authority Plane v1
/// @notice Governance firewall between Tolani source-system evidence and any future TUT reward execution.
/// @dev This contract intentionally has no ERC20 reference and no mint/transfer capability.
contract TUTUtilityEvidenceAuthority is AccessControl {
    bytes32 public constant POLICY_ADMIN_ROLE = keccak256("POLICY_ADMIN_ROLE");
    bytes32 public constant EVIDENCE_REVIEW_ROLE = keccak256("EVIDENCE_REVIEW_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");
    bytes32 public constant TREASURY_AUTHORIZER_ROLE = keccak256("TREASURY_AUTHORIZER_ROLE");
    bytes32 public constant ACCOUNTING_ROLE = keccak256("ACCOUNTING_ROLE");

    bool public constant PRODUCTION_MINTING_ENABLED = false;
    bool public constant TOKEN_POSSESSION_CREATES_LEGAL_MEMBERSHIP = false;
    bool public constant TOKEN_VOTING_POWER_CREATES_LEGAL_MEMBERSHIP = false;
    bool public constant TOKEN_DELEGATION_CREATES_LEGAL_MEMBERSHIP = false;

    enum WalletStatus { Unknown, Eligible, ReviewRequired, Blocked, Expired }
    enum ReceiptStatus { None, Submitted, Verified, Rejected, Revoked }
    enum AccountingKind { Earned, Issued, Redeemed, Expired, Burned, TreasuryHeld }

    struct EntityAuthority {
        address evidenceProducer;
        bool active;
        bytes32 policyDigest;
    }

    struct UtilityDefinition {
        bytes32 entityId;
        bytes32 useCase;
        bool active;
        bytes32 termsDigest;
    }

    struct RewardProgramConfig {
        bytes32 producerEntityId;
        bytes32 sourceEvent;
        uint128 perReceiptCap;
        uint128 epochCap;
        uint64 epochStart;
        uint64 epochEnd;
        bool complianceRequired;
        bool evidenceProductionEnabled;
        bool rewardEligibilityEnabled;
        bool emissionEnabled;
        bytes32 policyDigest;
    }

    struct RewardProgram {
        bytes32 producerEntityId;
        bytes32 sourceEvent;
        uint128 perReceiptCap;
        uint128 epochCap;
        uint128 authorizedAmount;
        uint64 epochStart;
        uint64 epochEnd;
        bool complianceRequired;
        bool evidenceProductionEnabled;
        bool rewardEligibilityEnabled;
        bool emissionEnabled;
        bytes32 policyDigest;
    }

    struct EvidenceSubmission {
        bytes32 programId;
        bytes32 subjectIdHash;
        bytes32 sourceRecordIdHash;
        bytes32 evidenceDigest;
        bytes32 decisionReceiptDigest;
        bytes32 sourceEvent;
        uint64 occurredAt;
    }

    struct EvidenceReceipt {
        bytes32 programId;
        bytes32 producerEntityId;
        bytes32 subjectIdHash;
        bytes32 sourceRecordIdHash;
        bytes32 evidenceDigest;
        bytes32 decisionReceiptDigest;
        bytes32 sourceEvent;
        bytes32 reviewDigest;
        uint64 occurredAt;
        uint64 recordedAt;
        address producer;
        ReceiptStatus status;
        bool rewardEligible;
    }

    struct WalletEligibility {
        WalletStatus status;
        uint64 validUntil;
        bytes32 evidenceDigest;
    }

    struct RewardAuthorization {
        bytes32 receiptId;
        bytes32 programId;
        address wallet;
        uint128 amount;
        uint64 expiresAt;
        bool revoked;
        address authorizedBy;
        bytes32 approvalDigest;
        bytes32 revocationDigest;
    }

    struct AccountingEntry {
        bytes32 referenceId;
        address wallet;
        uint256 amount;
        bytes32 externalReceiptDigest;
        uint64 recordedAt;
        AccountingKind kind;
        address recordedBy;
    }

    bytes32 public immutable legalClassificationDigest;
    bytes32 public immutable publicClaimsPolicyDigest;

    mapping(bytes32 => EntityAuthority) public entityAuthorities;
    mapping(bytes32 => UtilityDefinition) public utilities;
    mapping(bytes32 => RewardProgram) public rewardPrograms;
    mapping(bytes32 => EvidenceReceipt) public evidenceReceipts;
    mapping(address => WalletEligibility) public walletEligibility;
    mapping(bytes32 => RewardAuthorization) public rewardAuthorizations;
    mapping(bytes32 => AccountingEntry) public accountingEntries;
    mapping(bytes32 => bool) public accountingEntryExists;
    mapping(bytes32 => uint256) public issuedAgainstAuthorization;
    mapping(AccountingKind => uint256) public accountingTotals;

    bytes32[] private _accountingEntryIds;

    event EntityAuthoritySet(bytes32 indexed entityId, address indexed evidenceProducer, bool active, bytes32 policyDigest);
    event UtilityDefinitionSet(bytes32 indexed utilityId, bytes32 indexed entityId, bytes32 useCase, bool active, bytes32 termsDigest);
    event RewardProgramSet(bytes32 indexed programId, bytes32 indexed producerEntityId, bytes32 sourceEvent, bool evidenceProductionEnabled, bool rewardEligibilityEnabled, bool emissionEnabled);
    event WalletEligibilitySet(address indexed wallet, WalletStatus status, uint64 validUntil, bytes32 evidenceDigest);
    event EvidenceSubmitted(bytes32 indexed receiptId, bytes32 indexed programId, bytes32 indexed producerEntityId, bytes32 subjectIdHash, bytes32 evidenceDigest);
    event EvidenceReviewed(bytes32 indexed receiptId, ReceiptStatus status, bool rewardEligible, bytes32 reviewDigest);
    event RewardAuthorized(bytes32 indexed authorizationId, bytes32 indexed receiptId, address indexed wallet, uint256 amount, uint64 expiresAt, bytes32 approvalDigest);
    event RewardAuthorizationRevoked(bytes32 indexed authorizationId, bytes32 revocationDigest);
    event AccountingEntryRecorded(bytes32 indexed entryId, AccountingKind indexed kind, bytes32 indexed referenceId, address wallet, uint256 amount, bytes32 externalReceiptDigest);

    error ZeroAddress();
    error ZeroIdentifier();
    error ZeroDigest();
    error EntityInactive(bytes32 entityId);
    error ProducerMismatch(bytes32 entityId, address caller);
    error ProgramInactive(bytes32 programId);
    error ProgramEmissionMustRemainDisabled();
    error EventTypeMismatch(bytes32 expected, bytes32 received);
    error ReceiptAlreadyExists(bytes32 receiptId);
    error ReceiptNotSubmitted(bytes32 receiptId);
    error ReceiptNotVerified(bytes32 receiptId);
    error ReceiptNotRewardEligible(bytes32 receiptId);
    error InvalidReceiptReviewStatus();
    error RewardEligibilityDisabled(bytes32 programId);
    error WalletNotEligible(address wallet);
    error ProgramOutsideEpoch(bytes32 programId);
    error PerReceiptCapExceeded(bytes32 programId);
    error EpochCapExceeded(bytes32 programId);
    error AuthorizationAlreadyExists(bytes32 authorizationId);
    error AuthorizationNotFound(bytes32 authorizationId);
    error AuthorizationRevoked(bytes32 authorizationId);
    error AuthorizationExpired(bytes32 authorizationId);
    error AccountingEntryAlreadyExists(bytes32 entryId);
    error IssuanceExceedsAuthorization(bytes32 authorizationId);
    error InvalidEpoch();
    error InvalidAmount();

    constructor(address admin, bytes32 legalClassificationDigest_, bytes32 publicClaimsPolicyDigest_) {
        if (admin == address(0)) revert ZeroAddress();
        if (legalClassificationDigest_ == bytes32(0) || publicClaimsPolicyDigest_ == bytes32(0)) revert ZeroDigest();
        legalClassificationDigest = legalClassificationDigest_;
        publicClaimsPolicyDigest = publicClaimsPolicyDigest_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(POLICY_ADMIN_ROLE, admin);
        _grantRole(EVIDENCE_REVIEW_ROLE, admin);
        _grantRole(COMPLIANCE_ROLE, admin);
        _grantRole(TREASURY_AUTHORIZER_ROLE, admin);
        _grantRole(ACCOUNTING_ROLE, admin);
    }

    function setEntityAuthority(bytes32 entityId, address evidenceProducer, bool active, bytes32 policyDigest)
        external
        onlyRole(POLICY_ADMIN_ROLE)
    {
        if (entityId == bytes32(0)) revert ZeroIdentifier();
        if (evidenceProducer == address(0)) revert ZeroAddress();
        if (policyDigest == bytes32(0)) revert ZeroDigest();
        entityAuthorities[entityId] = EntityAuthority(evidenceProducer, active, policyDigest);
        emit EntityAuthoritySet(entityId, evidenceProducer, active, policyDigest);
    }

    function setUtilityDefinition(bytes32 utilityId, bytes32 entityId, bytes32 useCase, bool active, bytes32 termsDigest)
        external
        onlyRole(POLICY_ADMIN_ROLE)
    {
        if (utilityId == bytes32(0) || entityId == bytes32(0) || useCase == bytes32(0)) revert ZeroIdentifier();
        if (termsDigest == bytes32(0)) revert ZeroDigest();
        utilities[utilityId] = UtilityDefinition(entityId, useCase, active, termsDigest);
        emit UtilityDefinitionSet(utilityId, entityId, useCase, active, termsDigest);
    }

    function setRewardProgram(bytes32 programId, RewardProgramConfig calldata config)
        external
        onlyRole(POLICY_ADMIN_ROLE)
    {
        if (programId == bytes32(0) || config.producerEntityId == bytes32(0) || config.sourceEvent == bytes32(0)) {
            revert ZeroIdentifier();
        }
        if (config.policyDigest == bytes32(0)) revert ZeroDigest();
        if (config.emissionEnabled) revert ProgramEmissionMustRemainDisabled();
        if (config.epochStart != 0 || config.epochEnd != 0) {
            if (config.epochStart == 0 || config.epochEnd <= config.epochStart) revert InvalidEpoch();
        }
        if (config.rewardEligibilityEnabled && (config.perReceiptCap == 0 || config.epochCap == 0)) revert InvalidAmount();

        RewardProgram storage previous = rewardPrograms[programId];
        uint128 authorizedAmount = previous.authorizedAmount;
        if (previous.epochStart != config.epochStart || previous.epochEnd != config.epochEnd) authorizedAmount = 0;

        RewardProgram storage program = rewardPrograms[programId];
        program.producerEntityId = config.producerEntityId;
        program.sourceEvent = config.sourceEvent;
        program.perReceiptCap = config.perReceiptCap;
        program.epochCap = config.epochCap;
        program.authorizedAmount = authorizedAmount;
        program.epochStart = config.epochStart;
        program.epochEnd = config.epochEnd;
        program.complianceRequired = config.complianceRequired;
        program.evidenceProductionEnabled = config.evidenceProductionEnabled;
        program.rewardEligibilityEnabled = config.rewardEligibilityEnabled;
        program.emissionEnabled = false;
        program.policyDigest = config.policyDigest;

        emit RewardProgramSet(
            programId,
            config.producerEntityId,
            config.sourceEvent,
            config.evidenceProductionEnabled,
            config.rewardEligibilityEnabled,
            false
        );
    }

    function setWalletEligibility(address wallet, WalletStatus status, uint64 validUntil, bytes32 evidenceDigest)
        external
        onlyRole(COMPLIANCE_ROLE)
    {
        if (wallet == address(0)) revert ZeroAddress();
        if (evidenceDigest == bytes32(0)) revert ZeroDigest();
        walletEligibility[wallet] = WalletEligibility(status, validUntil, evidenceDigest);
        emit WalletEligibilitySet(wallet, status, validUntil, evidenceDigest);
    }

    function submitEvidenceReceipt(bytes32 receiptId, EvidenceSubmission calldata submission) external {
        if (
            receiptId == bytes32(0) || submission.programId == bytes32(0) ||
            submission.subjectIdHash == bytes32(0) || submission.sourceRecordIdHash == bytes32(0) ||
            submission.sourceEvent == bytes32(0)
        ) revert ZeroIdentifier();
        if (submission.evidenceDigest == bytes32(0) || submission.decisionReceiptDigest == bytes32(0)) revert ZeroDigest();
        if (evidenceReceipts[receiptId].status != ReceiptStatus.None) revert ReceiptAlreadyExists(receiptId);

        RewardProgram storage program = rewardPrograms[submission.programId];
        if (!program.evidenceProductionEnabled) revert ProgramInactive(submission.programId);
        if (submission.sourceEvent != program.sourceEvent) revert EventTypeMismatch(program.sourceEvent, submission.sourceEvent);
        EntityAuthority storage entity = entityAuthorities[program.producerEntityId];
        if (!entity.active) revert EntityInactive(program.producerEntityId);
        if (entity.evidenceProducer != msg.sender) revert ProducerMismatch(program.producerEntityId, msg.sender);

        EvidenceReceipt storage receipt = evidenceReceipts[receiptId];
        receipt.programId = submission.programId;
        receipt.producerEntityId = program.producerEntityId;
        receipt.subjectIdHash = submission.subjectIdHash;
        receipt.sourceRecordIdHash = submission.sourceRecordIdHash;
        receipt.evidenceDigest = submission.evidenceDigest;
        receipt.decisionReceiptDigest = submission.decisionReceiptDigest;
        receipt.sourceEvent = submission.sourceEvent;
        receipt.occurredAt = submission.occurredAt;
        receipt.recordedAt = uint64(block.timestamp);
        receipt.producer = msg.sender;
        receipt.status = ReceiptStatus.Submitted;
        receipt.rewardEligible = false;

        emit EvidenceSubmitted(receiptId, submission.programId, program.producerEntityId, submission.subjectIdHash, submission.evidenceDigest);
    }

    function reviewEvidenceReceipt(bytes32 receiptId, ReceiptStatus status, bool rewardEligible, bytes32 reviewDigest)
        external
        onlyRole(EVIDENCE_REVIEW_ROLE)
    {
        EvidenceReceipt storage receipt = evidenceReceipts[receiptId];
        if (receipt.status != ReceiptStatus.Submitted) revert ReceiptNotSubmitted(receiptId);
        if (status != ReceiptStatus.Verified && status != ReceiptStatus.Rejected) revert InvalidReceiptReviewStatus();
        if (reviewDigest == bytes32(0)) revert ZeroDigest();
        RewardProgram storage program = rewardPrograms[receipt.programId];
        if (rewardEligible && !program.rewardEligibilityEnabled) revert RewardEligibilityDisabled(receipt.programId);
        if (status == ReceiptStatus.Rejected) rewardEligible = false;
        receipt.status = status;
        receipt.rewardEligible = rewardEligible;
        receipt.reviewDigest = reviewDigest;
        emit EvidenceReviewed(receiptId, status, rewardEligible, reviewDigest);
    }

    function revokeEvidenceReceipt(bytes32 receiptId, bytes32 revocationDigest)
        external
        onlyRole(EVIDENCE_REVIEW_ROLE)
    {
        EvidenceReceipt storage receipt = evidenceReceipts[receiptId];
        if (receipt.status == ReceiptStatus.None) revert ReceiptNotSubmitted(receiptId);
        if (revocationDigest == bytes32(0)) revert ZeroDigest();
        receipt.status = ReceiptStatus.Revoked;
        receipt.rewardEligible = false;
        receipt.reviewDigest = revocationDigest;
        emit EvidenceReviewed(receiptId, ReceiptStatus.Revoked, false, revocationDigest);
    }

    /// @notice Records a DAO/treasury-approved reward entitlement only; no token movement occurs.
    function authorizeReward(
        bytes32 authorizationId,
        bytes32 receiptId,
        address wallet,
        uint128 amount,
        uint64 expiresAt,
        bytes32 approvalDigest
    ) external onlyRole(TREASURY_AUTHORIZER_ROLE) {
        if (authorizationId == bytes32(0)) revert ZeroIdentifier();
        if (wallet == address(0)) revert ZeroAddress();
        if (amount == 0) revert InvalidAmount();
        if (approvalDigest == bytes32(0)) revert ZeroDigest();
        if (rewardAuthorizations[authorizationId].receiptId != bytes32(0)) revert AuthorizationAlreadyExists(authorizationId);

        EvidenceReceipt storage receipt = evidenceReceipts[receiptId];
        if (receipt.status != ReceiptStatus.Verified) revert ReceiptNotVerified(receiptId);
        if (!receipt.rewardEligible) revert ReceiptNotRewardEligible(receiptId);
        RewardProgram storage program = rewardPrograms[receipt.programId];
        if (!program.rewardEligibilityEnabled) revert RewardEligibilityDisabled(receipt.programId);
        if (program.emissionEnabled) revert ProgramEmissionMustRemainDisabled();
        if (program.epochStart != 0 && (block.timestamp < program.epochStart || block.timestamp > program.epochEnd)) {
            revert ProgramOutsideEpoch(receipt.programId);
        }
        if (amount > program.perReceiptCap) revert PerReceiptCapExceeded(receipt.programId);
        if (uint256(program.authorizedAmount) + amount > program.epochCap) revert EpochCapExceeded(receipt.programId);
        if (program.complianceRequired && !isWalletEligible(wallet)) revert WalletNotEligible(wallet);

        program.authorizedAmount += amount;
        rewardAuthorizations[authorizationId] = RewardAuthorization({
            receiptId: receiptId,
            programId: receipt.programId,
            wallet: wallet,
            amount: amount,
            expiresAt: expiresAt,
            revoked: false,
            authorizedBy: msg.sender,
            approvalDigest: approvalDigest,
            revocationDigest: bytes32(0)
        });
        _recordAccountingEntry(
            keccak256(abi.encodePacked("TUT_EARNED", authorizationId)),
            AccountingKind.Earned,
            authorizationId,
            wallet,
            amount,
            approvalDigest
        );
        emit RewardAuthorized(authorizationId, receiptId, wallet, amount, expiresAt, approvalDigest);
    }

    function revokeRewardAuthorization(bytes32 authorizationId, bytes32 revocationDigest)
        external
        onlyRole(TREASURY_AUTHORIZER_ROLE)
    {
        RewardAuthorization storage authorization = rewardAuthorizations[authorizationId];
        if (authorization.receiptId == bytes32(0)) revert AuthorizationNotFound(authorizationId);
        if (revocationDigest == bytes32(0)) revert ZeroDigest();
        authorization.revoked = true;
        authorization.revocationDigest = revocationDigest;
        emit RewardAuthorizationRevoked(authorizationId, revocationDigest);
    }

    /// @notice Records an observed accounting event after an authorized external system action.
    /// @dev An immutable external receipt is required. No token movement occurs here.
    function recordAccountingEntry(
        bytes32 entryId,
        AccountingKind kind,
        bytes32 referenceId,
        address wallet,
        uint256 amount,
        bytes32 externalReceiptDigest
    ) external onlyRole(ACCOUNTING_ROLE) {
        if (entryId == bytes32(0) || referenceId == bytes32(0)) revert ZeroIdentifier();
        if (amount == 0) revert InvalidAmount();
        if (externalReceiptDigest == bytes32(0)) revert ZeroDigest();
        if (kind == AccountingKind.Issued) {
            RewardAuthorization storage authorization = rewardAuthorizations[referenceId];
            if (authorization.receiptId == bytes32(0)) revert AuthorizationNotFound(referenceId);
            if (authorization.revoked) revert AuthorizationRevoked(referenceId);
            if (authorization.expiresAt != 0 && block.timestamp > authorization.expiresAt) revert AuthorizationExpired(referenceId);
            if (authorization.wallet != wallet) revert WalletNotEligible(wallet);
            uint256 nextIssued = issuedAgainstAuthorization[referenceId] + amount;
            if (nextIssued > authorization.amount) revert IssuanceExceedsAuthorization(referenceId);
            issuedAgainstAuthorization[referenceId] = nextIssued;
        }
        _recordAccountingEntry(entryId, kind, referenceId, wallet, amount, externalReceiptDigest);
    }

    function isWalletEligible(address wallet) public view returns (bool) {
        WalletEligibility storage eligibility = walletEligibility[wallet];
        if (eligibility.status != WalletStatus.Eligible) return false;
        return eligibility.validUntil == 0 || eligibility.validUntil >= block.timestamp;
    }

    function accountingEntryCount() external view returns (uint256) { return _accountingEntryIds.length; }
    function accountingEntryIdAt(uint256 index) external view returns (bytes32) { return _accountingEntryIds[index]; }

    function _recordAccountingEntry(
        bytes32 entryId,
        AccountingKind kind,
        bytes32 referenceId,
        address wallet,
        uint256 amount,
        bytes32 externalReceiptDigest
    ) internal {
        if (accountingEntryExists[entryId]) revert AccountingEntryAlreadyExists(entryId);
        accountingEntryExists[entryId] = true;
        accountingEntries[entryId] = AccountingEntry(referenceId, wallet, amount, externalReceiptDigest, uint64(block.timestamp), kind, msg.sender);
        accountingTotals[kind] += amount;
        _accountingEntryIds.push(entryId);
        emit AccountingEntryRecorded(entryId, kind, referenceId, wallet, amount, externalReceiptDigest);
    }
}
