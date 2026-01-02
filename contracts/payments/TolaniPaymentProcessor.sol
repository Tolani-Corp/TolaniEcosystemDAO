// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

interface IMerchantRegistry {
    struct Merchant {
        string name;
        string businessId;
        uint8 category;
        address payoutAddress;
        address owner;
        uint256 feeRate;
        bool acceptsUTUT;
        bool acceptsTUT;
        uint8 status;
        uint256 totalVolume;
        uint256 totalTransactions;
        uint256 registeredAt;
        uint256 lastTransactionAt;
        string metadataURI;
    }
    
    function getMerchant(bytes32 merchantId) external view returns (Merchant memory);
    
    function canAcceptPayment(
        bytes32 merchantId,
        address token,
        address uTUTAddress,
        address TUTAddress
    ) external view returns (bool);
    
    function getEffectiveFeeRate(bytes32 merchantId) external view returns (uint256);
    function recordPayment(bytes32 merchantId, uint256 amount) external;
}

/**
 * @title TolaniPaymentProcessor - Ecosystem Payment Processing
 * @author Tolani Labs
 * @notice Process uTUT/TUT payments between members and merchants
 * @dev Supports direct payments and gasless meta-transactions via relayer
 */
contract TolaniPaymentProcessor is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    /* ========== ROLES ========== */
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    /* ========== ENUMS ========== */
    enum PaymentStatus {
        Completed,
        Refunded,
        PartialRefund,
        Disputed
    }

    /* ========== STRUCTS ========== */
    struct Payment {
        bytes32 merchantId;
        address payer;
        address token;
        uint256 amount;
        uint256 fee;
        uint256 merchantAmount;
        uint256 timestamp;
        PaymentStatus status;
        bytes32 orderId;
        string memo;
        uint256 refundedAmount;  // Track partial refunds
    }

    struct DailyLimit {
        uint256 spent;
        uint256 day;
    }

    /* ========== STATE VARIABLES ========== */
    IERC20 public uTUT;
    IERC20 public TUT;
    IMerchantRegistry public merchantRegistry;
    address public feeCollector;  // Treasury address for fees
    
    mapping(bytes32 => Payment) public payments;
    bytes32[] public paymentIds;
    
    mapping(address => DailyLimit) public dailyLimits;
    mapping(address => uint256) public nonces;  // For meta-transactions
    
    uint256 public gaslessLimit = 100 * 1e6;  // 100 uTUT daily limit for gasless
    uint256 public minPayment = 1e5;          // 0.1 uTUT minimum
    uint256 public constant FEE_DENOMINATOR = 10000;
    
    // Domain separator for EIP-712
    bytes32 public DOMAIN_SEPARATOR;
    bytes32 public constant PAYMENT_TYPEHASH = keccak256(
        "Payment(address payer,bytes32 merchantId,address token,uint256 amount,bytes32 orderId,string memo,uint256 nonce,uint256 deadline)"
    );

    /* ========== EVENTS ========== */
    event PaymentProcessed(
        bytes32 indexed paymentId,
        bytes32 indexed merchantId,
        address indexed payer,
        address token,
        uint256 amount,
        uint256 fee,
        bytes32 orderId
    );
    
    event PaymentRefunded(
        bytes32 indexed paymentId,
        address indexed refundedTo,
        uint256 amount
    );
    
    event MerchantRefund(
        bytes32 indexed paymentId,
        bytes32 indexed merchantId,
        address indexed refundedTo,
        uint256 refundAmount,
        bool isPartial
    );
    
    event GaslessPayment(
        bytes32 indexed paymentId,
        address indexed payer,
        address indexed relayer
    );
    
    event FeeCollectorUpdated(address oldCollector, address newCollector);
    event LimitsUpdated(uint256 gaslessLimit, uint256 minPayment);

    /* ========== ERRORS ========== */
    error InvalidAddress();
    error InvalidAmount();
    error InvalidToken();
    error PaymentNotFound();
    error MerchantCannotAccept();
    error DailyLimitExceeded();
    error InvalidSignature();
    error DeadlineExpired();
    error PaymentAlreadyProcessed();
    error RefundFailed();
    error InsufficientBalance();
    error NotMerchantOwner();
    error RefundExceedsRemaining();
    error AlreadyFullyRefunded();

    /* ========== CONSTRUCTOR ========== */
    constructor(
        address _uTUT,
        address _TUT,
        address _merchantRegistry,
        address _feeCollector,
        address _admin
    ) {
        if (_uTUT == address(0) || _TUT == address(0)) revert InvalidAddress();
        if (_merchantRegistry == address(0) || _feeCollector == address(0)) revert InvalidAddress();
        if (_admin == address(0)) revert InvalidAddress();

        uTUT = IERC20(_uTUT);
        TUT = IERC20(_TUT);
        merchantRegistry = IMerchantRegistry(_merchantRegistry);
        feeCollector = _feeCollector;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
        _grantRole(RELAYER_ROLE, _admin);

        // EIP-712 domain separator
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("TolaniPayments"),
                keccak256("1"),
                block.chainid,
                address(this)
            )
        );
    }

    /* ========== PAYMENT FUNCTIONS ========== */

    /**
     * @notice Process a direct payment from member to merchant
     * @param merchantId The merchant receiving payment
     * @param token Address of token (uTUT or TUT)
     * @param amount Payment amount (in token's smallest unit)
     * @param orderId Optional order reference from merchant's system
     * @param memo Optional payment memo/description
     */
    function pay(
        bytes32 merchantId,
        address token,
        uint256 amount,
        bytes32 orderId,
        string calldata memo
    ) external nonReentrant whenNotPaused returns (bytes32 paymentId) {
        return _processPayment(msg.sender, merchantId, token, amount, orderId, memo);
    }

    /**
     * @notice Process a gasless payment via relayer (meta-transaction)
     * @param payer The member paying
     * @param merchantId The merchant receiving payment
     * @param token Address of token (uTUT or TUT)
     * @param amount Payment amount
     * @param orderId Order reference
     * @param memo Payment memo
     * @param deadline Signature expiry timestamp
     * @param signature EIP-712 signature from payer
     */
    function payWithSignature(
        address payer,
        bytes32 merchantId,
        address token,
        uint256 amount,
        bytes32 orderId,
        string calldata memo,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant whenNotPaused onlyRole(RELAYER_ROLE) returns (bytes32 paymentId) {
        // Check deadline
        if (block.timestamp > deadline) revert DeadlineExpired();
        
        // Check daily limit for gasless
        _checkAndUpdateDailyLimit(payer, amount);
        
        // Get current nonce
        uint256 currentNonce = nonces[payer];
        
        // Verify signature (EIP-712)
        bytes32 structHash = keccak256(
            abi.encode(
                PAYMENT_TYPEHASH,
                payer,
                merchantId,
                token,
                amount,
                orderId,
                keccak256(bytes(memo)),
                currentNonce,
                deadline
            )
        );
        
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );
        
        address signer = digest.recover(signature);
        if (signer != payer) revert InvalidSignature();
        
        // Increment nonce
        nonces[payer] = currentNonce + 1;
        
        // Process payment
        paymentId = _processPayment(payer, merchantId, token, amount, orderId, memo);
        
        emit GaslessPayment(paymentId, payer, msg.sender);
    }

    /**
     * @notice Internal payment processing
     */
    function _processPayment(
        address payer,
        bytes32 merchantId,
        address token,
        uint256 amount,
        bytes32 orderId,
        string memory memo
    ) internal returns (bytes32 paymentId) {
        // Validate token
        if (token != address(uTUT) && token != address(TUT)) revert InvalidToken();
        if (amount < minPayment) revert InvalidAmount();
        
        // Check merchant can accept this token
        if (!merchantRegistry.canAcceptPayment(merchantId, token, address(uTUT), address(TUT))) {
            revert MerchantCannotAccept();
        }
        
        // Get merchant payout address
        IMerchantRegistry.Merchant memory merchant = merchantRegistry.getMerchant(merchantId);
        address payoutAddress = merchant.payoutAddress;
        
        // Calculate fee
        uint256 feeRate = merchantRegistry.getEffectiveFeeRate(merchantId);
        uint256 fee = (amount * feeRate) / FEE_DENOMINATOR;
        uint256 merchantAmount = amount - fee;
        
        // Generate unique payment ID
        paymentId = keccak256(abi.encodePacked(
            merchantId,
            payer,
            amount,
            block.timestamp,
            orderId,
            block.number
        ));
        
        // Check for collision (extremely unlikely)
        if (payments[paymentId].timestamp != 0) revert PaymentAlreadyProcessed();
        
        // Check payer balance
        if (IERC20(token).balanceOf(payer) < amount) revert InsufficientBalance();
        
        // Store payment record
        payments[paymentId] = Payment({
            merchantId: merchantId,
            payer: payer,
            token: token,
            amount: amount,
            fee: fee,
            merchantAmount: merchantAmount,
            timestamp: block.timestamp,
            status: PaymentStatus.Completed,
            orderId: orderId,
            memo: memo,
            refundedAmount: 0
        });
        
        paymentIds.push(paymentId);
        
        // Transfer tokens
        IERC20(token).safeTransferFrom(payer, payoutAddress, merchantAmount);
        if (fee > 0) {
            IERC20(token).safeTransferFrom(payer, feeCollector, fee);
        }
        
        // Record in merchant registry
        merchantRegistry.recordPayment(merchantId, amount);
        
        emit PaymentProcessed(paymentId, merchantId, payer, token, amount, fee, orderId);
    }

    /**
     * @notice Check and update daily gasless limit
     */
    function _checkAndUpdateDailyLimit(address payer, uint256 amount) internal {
        uint256 today = block.timestamp / 1 days;
        DailyLimit storage limit = dailyLimits[payer];
        
        // Reset if new day
        if (limit.day < today) {
            limit.spent = 0;
            limit.day = today;
        }
        
        if (limit.spent + amount > gaslessLimit) revert DailyLimitExceeded();
        limit.spent += amount;
    }

    /* ========== REFUND FUNCTIONS ========== */

    /**
     * @notice Merchant-initiated refund (full or partial)
     * @dev Merchant pushes tokens back to the payer. No pre-approval needed.
     * @param paymentId Payment to refund
     * @param refundAmount Amount to refund (0 = full refund)
     */
    function merchantRefund(
        bytes32 paymentId, 
        uint256 refundAmount
    ) external nonReentrant {
        Payment storage payment = payments[paymentId];
        if (payment.timestamp == 0) revert PaymentNotFound();
        if (payment.status == PaymentStatus.Refunded) revert AlreadyFullyRefunded();
        
        // Verify caller is the merchant owner
        IMerchantRegistry.Merchant memory merchant = merchantRegistry.getMerchant(payment.merchantId);
        if (msg.sender != merchant.owner && msg.sender != merchant.payoutAddress) {
            revert NotMerchantOwner();
        }
        
        // Calculate remaining refundable amount
        uint256 remainingRefundable = payment.merchantAmount - payment.refundedAmount;
        if (remainingRefundable == 0) revert AlreadyFullyRefunded();
        
        // If refundAmount is 0 or exceeds remaining, do full refund of remaining
        uint256 actualRefund = (refundAmount == 0 || refundAmount > remainingRefundable) 
            ? remainingRefundable 
            : refundAmount;
        
        // Update payment state
        payment.refundedAmount += actualRefund;
        bool isFullRefund = (payment.refundedAmount >= payment.merchantAmount);
        payment.status = isFullRefund ? PaymentStatus.Refunded : PaymentStatus.PartialRefund;
        
        // Merchant transfers tokens back to payer
        IERC20(payment.token).safeTransferFrom(msg.sender, payment.payer, actualRefund);
        
        emit MerchantRefund(
            paymentId, 
            payment.merchantId, 
            payment.payer, 
            actualRefund, 
            !isFullRefund
        );
    }

    /**
     * @notice Operator-initiated full refund (admin override)
     * @dev Requires merchant to have approved this contract. Use merchantRefund() instead when possible.
     * @param paymentId Payment to refund
     */
    function refund(bytes32 paymentId) external nonReentrant onlyRole(OPERATOR_ROLE) {
        Payment storage payment = payments[paymentId];
        if (payment.timestamp == 0) revert PaymentNotFound();
        if (payment.status == PaymentStatus.Refunded) revert AlreadyFullyRefunded();
        
        // Get merchant details
        IMerchantRegistry.Merchant memory merchant = merchantRegistry.getMerchant(payment.merchantId);
        address payoutAddress = merchant.payoutAddress;
        
        // Calculate remaining to refund
        uint256 remainingMerchant = payment.merchantAmount - payment.refundedAmount;
        
        // Mark as fully refunded
        payment.refundedAmount = payment.merchantAmount;
        payment.status = PaymentStatus.Refunded;
        
        // Transfer back to payer (from merchant + fee collector)
        if (remainingMerchant > 0) {
            IERC20(payment.token).safeTransferFrom(payoutAddress, payment.payer, remainingMerchant);
        }
        if (payment.fee > 0) {
            IERC20(payment.token).safeTransferFrom(feeCollector, payment.payer, payment.fee);
        }
        
        emit PaymentRefunded(paymentId, payment.payer, payment.amount);
    }

    /**
     * @notice Get remaining refundable amount for a payment
     * @param paymentId Payment to check
     * @return remaining Amount that can still be refunded
     */
    function getRefundableAmount(bytes32 paymentId) external view returns (uint256 remaining) {
        Payment storage payment = payments[paymentId];
        if (payment.status == PaymentStatus.Refunded) return 0;
        return payment.merchantAmount - payment.refundedAmount;
    }

    /* ========== VIEW FUNCTIONS ========== */

    /**
     * @notice Get payment details
     */
    function getPayment(bytes32 paymentId) external view returns (Payment memory) {
        return payments[paymentId];
    }

    /**
     * @notice Get total payment count
     */
    function getPaymentCount() external view returns (uint256) {
        return paymentIds.length;
    }

    /**
     * @notice Get payer's current nonce (for meta-transactions)
     */
    function getNonce(address payer) external view returns (uint256) {
        return nonces[payer];
    }

    /**
     * @notice Get payer's remaining daily gasless limit
     */
    function getRemainingDailyLimit(address payer) external view returns (uint256) {
        uint256 today = block.timestamp / 1 days;
        DailyLimit storage limit = dailyLimits[payer];
        
        if (limit.day < today) {
            return gaslessLimit;
        }
        
        return gaslessLimit > limit.spent ? gaslessLimit - limit.spent : 0;
    }

    /**
     * @notice Calculate fee for a payment amount
     */
    function calculateFee(bytes32 merchantId, uint256 amount) external view returns (uint256) {
        uint256 feeRate = merchantRegistry.getEffectiveFeeRate(merchantId);
        return (amount * feeRate) / FEE_DENOMINATOR;
    }

    /* ========== ADMIN FUNCTIONS ========== */

    /**
     * @notice Update fee collector address
     */
    function setFeeCollector(address newCollector) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newCollector == address(0)) revert InvalidAddress();
        address old = feeCollector;
        feeCollector = newCollector;
        emit FeeCollectorUpdated(old, newCollector);
    }

    /**
     * @notice Update limits
     */
    function setLimits(uint256 _gaslessLimit, uint256 _minPayment) external onlyRole(DEFAULT_ADMIN_ROLE) {
        gaslessLimit = _gaslessLimit;
        minPayment = _minPayment;
        emit LimitsUpdated(_gaslessLimit, _minPayment);
    }

    /**
     * @notice Add relayer
     */
    function addRelayer(address relayer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(RELAYER_ROLE, relayer);
    }

    /**
     * @notice Remove relayer
     */
    function removeRelayer(address relayer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(RELAYER_ROLE, relayer);
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

    /**
     * @notice Rescue accidentally sent tokens (not uTUT/TUT)
     * @dev Only for tokens that aren't part of normal operations
     */
    function rescueTokens(
        address token,
        address to,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (to == address(0)) revert InvalidAddress();
        // Don't allow rescuing operational tokens during normal ops
        // But allow if paused (emergency recovery)
        if (!paused()) {
            if (token == address(uTUT) || token == address(TUT)) {
                revert("Cannot rescue operational tokens while active");
            }
        }
        IERC20(token).transfer(to, amount);
    }

    /**
     * @notice Rescue accidentally sent ETH
     */
    function rescueETH(address payable to) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (to == address(0)) revert InvalidAddress();
        (bool success, ) = to.call{value: address(this).balance}("");
        require(success, "ETH transfer failed");
    }

    // Allow receiving ETH (for potential future use)
    receive() external payable {}
}
