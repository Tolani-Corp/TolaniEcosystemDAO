// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title MerchantRegistry - Ecosystem Merchant Management
 * @author Tolani Labs
 * @notice Register and manage merchants accepting uTUT/TUT payments
 * @dev Part of Tolani Payment Rails system
 */
contract MerchantRegistry is AccessControl, Pausable {
    /* ========== ROLES ========== */
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    /* ========== ENUMS ========== */
    enum MerchantCategory {
        Restaurant,
        Retail,
        Services,
        Education,
        Healthcare,
        Transportation,
        Entertainment,
        Other
    }

    enum MerchantStatus {
        Pending,
        Active,
        Suspended,
        Terminated
    }

    /* ========== STRUCTS ========== */
    struct Merchant {
        string name;
        string businessId;          // Business registration number
        MerchantCategory category;
        address payoutAddress;
        address owner;              // Can update merchant details
        uint256 feeRate;            // Custom fee rate (0 = use default)
        bool acceptsUTUT;
        bool acceptsTUT;
        MerchantStatus status;
        uint256 totalVolume;
        uint256 totalTransactions;
        uint256 registeredAt;
        uint256 lastTransactionAt;
        string metadataURI;         // IPFS hash for additional info
    }

    /* ========== STATE VARIABLES ========== */
    mapping(bytes32 => Merchant) public merchants;
    mapping(address => bytes32) public ownerToMerchant;
    mapping(address => bytes32) public payoutToMerchant;
    bytes32[] public merchantIds;
    
    uint256 public defaultFeeRate = 100;  // 1% in basis points (10000 = 100%)
    uint256 public constant MAX_FEE_RATE = 500;  // 5% max
    uint256 public constant MIN_FEE_RATE = 0;    // 0% min (for ecosystem partners)

    /* ========== EVENTS ========== */
    event MerchantRegistered(
        bytes32 indexed merchantId,
        string name,
        address indexed owner,
        address payoutAddress,
        MerchantCategory category
    );
    
    event MerchantUpdated(
        bytes32 indexed merchantId,
        string field,
        address indexed updatedBy
    );
    
    event MerchantStatusChanged(
        bytes32 indexed merchantId,
        MerchantStatus oldStatus,
        MerchantStatus newStatus
    );
    
    event MerchantVolumeUpdated(
        bytes32 indexed merchantId,
        uint256 amount,
        uint256 newTotalVolume
    );

    /* ========== ERRORS ========== */
    error MerchantAlreadyExists();
    error MerchantNotFound();
    error InvalidAddress();
    error InvalidFeeRate();
    error UnauthorizedAccess();
    error MerchantNotActive();
    error OwnerAlreadyHasMerchant();

    /* ========== CONSTRUCTOR ========== */
    constructor(address admin) {
        if (admin == address(0)) revert InvalidAddress();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRAR_ROLE, admin);
        _grantRole(VERIFIER_ROLE, admin);
    }

    /* ========== REGISTRATION FUNCTIONS ========== */

    /**
     * @notice Register a new merchant
     * @param name Business name
     * @param businessId Official business registration ID
     * @param category Business category
     * @param payoutAddress Address to receive payments
     * @param acceptsUTUT Whether merchant accepts uTUT
     * @param acceptsTUT Whether merchant accepts TUT
     * @param metadataURI IPFS URI for additional merchant info
     */
    function registerMerchant(
        string calldata name,
        string calldata businessId,
        MerchantCategory category,
        address payoutAddress,
        bool acceptsUTUT,
        bool acceptsTUT,
        string calldata metadataURI
    ) external returns (bytes32 merchantId) {
        if (payoutAddress == address(0)) revert InvalidAddress();
        if (ownerToMerchant[msg.sender] != bytes32(0)) revert OwnerAlreadyHasMerchant();
        if (payoutToMerchant[payoutAddress] != bytes32(0)) revert MerchantAlreadyExists();
        
        merchantId = keccak256(abi.encodePacked(
            name,
            businessId,
            msg.sender,
            block.timestamp
        ));
        
        if (merchants[merchantId].registeredAt != 0) revert MerchantAlreadyExists();
        
        merchants[merchantId] = Merchant({
            name: name,
            businessId: businessId,
            category: category,
            payoutAddress: payoutAddress,
            owner: msg.sender,
            feeRate: 0,  // Use default
            acceptsUTUT: acceptsUTUT,
            acceptsTUT: acceptsTUT,
            status: MerchantStatus.Pending,  // Requires verification
            totalVolume: 0,
            totalTransactions: 0,
            registeredAt: block.timestamp,
            lastTransactionAt: 0,
            metadataURI: metadataURI
        });
        
        ownerToMerchant[msg.sender] = merchantId;
        payoutToMerchant[payoutAddress] = merchantId;
        merchantIds.push(merchantId);
        
        emit MerchantRegistered(merchantId, name, msg.sender, payoutAddress, category);
    }

    /**
     * @notice Register merchant directly (admin/registrar only)
     * @dev Bypasses pending status - immediately active
     */
    function registerMerchantDirect(
        string calldata name,
        string calldata businessId,
        MerchantCategory category,
        address owner,
        address payoutAddress,
        bool acceptsUTUT,
        bool acceptsTUT,
        uint256 customFeeRate,
        string calldata metadataURI
    ) external onlyRole(REGISTRAR_ROLE) returns (bytes32 merchantId) {
        if (owner == address(0) || payoutAddress == address(0)) revert InvalidAddress();
        if (customFeeRate > MAX_FEE_RATE) revert InvalidFeeRate();
        
        merchantId = keccak256(abi.encodePacked(
            name,
            businessId,
            owner,
            block.timestamp
        ));
        
        // Create merchant in storage
        Merchant storage m = merchants[merchantId];
        m.name = name;
        m.businessId = businessId;
        m.category = category;
        m.payoutAddress = payoutAddress;
        m.owner = owner;
        m.feeRate = customFeeRate;
        m.acceptsUTUT = acceptsUTUT;
        m.acceptsTUT = acceptsTUT;
        m.status = MerchantStatus.Active;
        m.registeredAt = block.timestamp;
        
        ownerToMerchant[owner] = merchantId;
        payoutToMerchant[payoutAddress] = merchantId;
        merchantIds.push(merchantId);
        
        emit MerchantRegistered(merchantId, name, owner, payoutAddress, category);
    }

    /* ========== VERIFICATION FUNCTIONS ========== */

    /**
     * @notice Verify/activate a pending merchant
     */
    function verifyMerchant(bytes32 merchantId) external onlyRole(VERIFIER_ROLE) {
        Merchant storage merchant = merchants[merchantId];
        if (merchant.registeredAt == 0) revert MerchantNotFound();
        
        MerchantStatus oldStatus = merchant.status;
        merchant.status = MerchantStatus.Active;
        
        emit MerchantStatusChanged(merchantId, oldStatus, MerchantStatus.Active);
    }

    /**
     * @notice Suspend a merchant
     */
    function suspendMerchant(bytes32 merchantId) external onlyRole(VERIFIER_ROLE) {
        Merchant storage merchant = merchants[merchantId];
        if (merchant.registeredAt == 0) revert MerchantNotFound();
        
        MerchantStatus oldStatus = merchant.status;
        merchant.status = MerchantStatus.Suspended;
        
        emit MerchantStatusChanged(merchantId, oldStatus, MerchantStatus.Suspended);
    }

    /**
     * @notice Reactivate a suspended merchant
     */
    function reactivateMerchant(bytes32 merchantId) external onlyRole(VERIFIER_ROLE) {
        Merchant storage merchant = merchants[merchantId];
        if (merchant.registeredAt == 0) revert MerchantNotFound();
        if (merchant.status != MerchantStatus.Suspended) revert MerchantNotActive();
        
        merchant.status = MerchantStatus.Active;
        
        emit MerchantStatusChanged(merchantId, MerchantStatus.Suspended, MerchantStatus.Active);
    }

    /* ========== UPDATE FUNCTIONS ========== */

    /**
     * @notice Update payout address (merchant owner only)
     */
    function updatePayoutAddress(bytes32 merchantId, address newPayoutAddress) external {
        Merchant storage merchant = merchants[merchantId];
        if (merchant.owner != msg.sender) revert UnauthorizedAccess();
        if (newPayoutAddress == address(0)) revert InvalidAddress();
        
        // Clear old mapping
        delete payoutToMerchant[merchant.payoutAddress];
        
        // Set new
        merchant.payoutAddress = newPayoutAddress;
        payoutToMerchant[newPayoutAddress] = merchantId;
        
        emit MerchantUpdated(merchantId, "payoutAddress", msg.sender);
    }

    /**
     * @notice Update accepted tokens (merchant owner only)
     */
    function updateAcceptedTokens(
        bytes32 merchantId,
        bool acceptsUTUT,
        bool acceptsTUT
    ) external {
        Merchant storage merchant = merchants[merchantId];
        if (merchant.owner != msg.sender) revert UnauthorizedAccess();
        
        merchant.acceptsUTUT = acceptsUTUT;
        merchant.acceptsTUT = acceptsTUT;
        
        emit MerchantUpdated(merchantId, "acceptedTokens", msg.sender);
    }

    /**
     * @notice Update metadata URI (merchant owner only)
     */
    function updateMetadata(bytes32 merchantId, string calldata newMetadataURI) external {
        Merchant storage merchant = merchants[merchantId];
        if (merchant.owner != msg.sender) revert UnauthorizedAccess();
        
        merchant.metadataURI = newMetadataURI;
        
        emit MerchantUpdated(merchantId, "metadataURI", msg.sender);
    }

    /**
     * @notice Set custom fee rate (admin only)
     */
    function setMerchantFeeRate(bytes32 merchantId, uint256 newFeeRate) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newFeeRate > MAX_FEE_RATE) revert InvalidFeeRate();
        
        Merchant storage merchant = merchants[merchantId];
        if (merchant.registeredAt == 0) revert MerchantNotFound();
        
        merchant.feeRate = newFeeRate;
        
        emit MerchantUpdated(merchantId, "feeRate", msg.sender);
    }

    /* ========== PAYMENT PROCESSOR INTERFACE ========== */

    /**
     * @notice Record a payment (called by PaymentProcessor only)
     * @dev Should be called by authorized payment processor contract
     */
    function recordPayment(
        bytes32 merchantId,
        uint256 amount
    ) external onlyRole(REGISTRAR_ROLE) {
        Merchant storage merchant = merchants[merchantId];
        if (merchant.registeredAt == 0) revert MerchantNotFound();
        
        merchant.totalVolume += amount;
        merchant.totalTransactions += 1;
        merchant.lastTransactionAt = block.timestamp;
        
        emit MerchantVolumeUpdated(merchantId, amount, merchant.totalVolume);
    }

    /* ========== VIEW FUNCTIONS ========== */

    /**
     * @notice Get merchant details
     */
    function getMerchant(bytes32 merchantId) external view returns (Merchant memory) {
        return merchants[merchantId];
    }

    /**
     * @notice Check if merchant is active and accepts token
     */
    function canAcceptPayment(
        bytes32 merchantId,
        address token,
        address uTUTAddress,
        address TUTAddress
    ) external view returns (bool) {
        Merchant storage merchant = merchants[merchantId];
        
        if (merchant.status != MerchantStatus.Active) return false;
        
        if (token == uTUTAddress && merchant.acceptsUTUT) return true;
        if (token == TUTAddress && merchant.acceptsTUT) return true;
        
        return false;
    }

    /**
     * @notice Get effective fee rate for merchant
     */
    function getEffectiveFeeRate(bytes32 merchantId) external view returns (uint256) {
        Merchant storage merchant = merchants[merchantId];
        return merchant.feeRate > 0 ? merchant.feeRate : defaultFeeRate;
    }

    /**
     * @notice Get total number of merchants
     */
    function getMerchantCount() external view returns (uint256) {
        return merchantIds.length;
    }

    /**
     * @notice Get merchant by owner address
     */
    function getMerchantByOwner(address owner) external view returns (bytes32) {
        return ownerToMerchant[owner];
    }

    /**
     * @notice Get merchant by payout address
     */
    function getMerchantByPayout(address payout) external view returns (bytes32) {
        return payoutToMerchant[payout];
    }

    /* ========== ADMIN FUNCTIONS ========== */

    /**
     * @notice Update default fee rate
     */
    function setDefaultFeeRate(uint256 newRate) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newRate > MAX_FEE_RATE) revert InvalidFeeRate();
        defaultFeeRate = newRate;
    }

    /**
     * @notice Pause contract
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause contract
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
