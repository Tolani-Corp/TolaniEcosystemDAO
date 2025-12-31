// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TolaniEscrow
 * @notice A reusable escrow contract for the Tolani ecosystem. Payers deposit TUT
 *         tokens into escrow for specific payees. Funds can be released by the payer
 *         or payee (after expiration) or refunded if the deadline lapses without
 *         release. Designed for secure payment handling in DAO operations.
 * @dev Adapted from TUTEscrow for non-upgradeable use in the DAO ecosystem.
 *      All amounts are denominated in the same ERC20 token (e.g. TUT).
 */
contract TolaniEscrow is Ownable, ReentrancyGuard {
    struct Escrow {
        address payer;
        address payee;
        uint256 amount;
        uint256 expireAt;
        bool released;
    }

    /// @notice Mapping of escrow id to escrow details
    mapping(bytes32 => Escrow) public escrows;
    
    /// @notice ERC20 token used for payments
    IERC20 public immutable token;

    /// @dev Cached permit interface for tokens that support EIP-2612
    IERC20Permit private immutable _permitToken;

    event Deposited(bytes32 indexed id, address indexed payer, address indexed payee, uint256 amount, uint256 expireAt);
    event Released(bytes32 indexed id, address indexed payer, address indexed payee, uint256 amount);
    event Refunded(bytes32 indexed id, address indexed payer, uint256 amount);

    /**
     * @dev Constructor sets the token and owner
     * @param tokenAddress The ERC20 token to use for escrow
     * @param owner_ The owner address (typically timelock for DAO control)
     */
    constructor(address tokenAddress, address owner_) Ownable(owner_) {
        require(tokenAddress != address(0), "Invalid token");
        token = IERC20(tokenAddress);
        _permitToken = IERC20Permit(tokenAddress);
    }

    /**
     * @notice Generates a unique escrow identifier
     * @param payer Address of the person depositing funds
     * @param payee Address of the intended recipient
     * @param amount Amount of tokens to be held in escrow
     * @param expireAt Unix timestamp when the payee can independently claim funds
     */
    function computeId(
        address payer,
        address payee,
        uint256 amount,
        uint256 expireAt
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(payer, payee, amount, expireAt));
    }

    /**
     * @notice Deposit tokens into escrow. Requires prior approval for token transfer.
     * @param payee Address of the payee
     * @param amount Amount of tokens to deposit
     * @param expireAt Timestamp after which the payee can claim funds if not released
     */
    function deposit(address payee, uint256 amount, uint256 expireAt) external nonReentrant returns (bytes32 id) {
        require(payee != address(0), "Invalid payee");
        require(amount > 0, "Amount must be > 0");
        require(expireAt > block.timestamp, "Expiry must be in the future");
        
        id = computeId(msg.sender, payee, amount, expireAt);
        Escrow storage e = escrows[id];
        require(e.amount == 0, "Escrow already exists");
        
        e.payer = msg.sender;
        e.payee = payee;
        e.amount = amount;
        e.expireAt = expireAt;
        e.released = false;
        
        require(token.transferFrom(msg.sender, address(this), amount), "Token transfer failed");
        emit Deposited(id, msg.sender, payee, amount, expireAt);
    }

    /**
     * @notice Deposit tokens into escrow using an ERC20 permit (gasless approval)
     * @param payer Address providing the funds and signature
     * @param payee Address of the payee
     * @param amount Amount of tokens to deposit
     * @param expireAt Timestamp when the payee can claim funds if not released
     * @param deadline EIP-2612 permit deadline
     * @param v Permit signature parameter
     * @param r Permit signature parameter
     * @param s Permit signature parameter
     */
    function depositWithPermit(
        address payer,
        address payee,
        uint256 amount,
        uint256 expireAt,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant returns (bytes32 id) {
        require(payer != address(0), "Invalid payer");
        require(payee != address(0), "Invalid payee");
        require(amount > 0, "Amount must be > 0");
        require(expireAt > block.timestamp, "Expiry must be in the future");
        
        id = computeId(payer, payee, amount, expireAt);
        Escrow storage e = escrows[id];
        require(e.amount == 0, "Escrow already exists");
        
        // Execute permit
        _permitToken.permit(payer, address(this), amount, deadline, v, r, s);
        
        e.payer = payer;
        e.payee = payee;
        e.amount = amount;
        e.expireAt = expireAt;
        e.released = false;
        
        require(token.transferFrom(payer, address(this), amount), "Token transfer failed");
        emit Deposited(id, payer, payee, amount, expireAt);
    }

    /**
     * @notice Release funds from escrow to the payee
     * @dev Can be called by payer at any time, or by payee after expiration
     * @param id The escrow id returned by deposit()
     */
    function release(bytes32 id) external nonReentrant {
        Escrow storage e = escrows[id];
        require(e.amount > 0, "Escrow does not exist");
        require(!e.released, "Already released");
        require(
            msg.sender == e.payer || (msg.sender == e.payee && block.timestamp >= e.expireAt),
            "Not authorized"
        );
        
        e.released = true;
        uint256 amount = e.amount;
        address payee = e.payee;
        address payer = e.payer;
        
        // Clean up storage for gas refund
        delete escrows[id];
        
        require(token.transfer(payee, amount), "Token transfer failed");
        emit Released(id, payer, payee, amount);
    }

    /**
     * @notice Refund payer if escrow expired and payee did not claim
     * @param id The escrow id
     */
    function refund(bytes32 id) external nonReentrant {
        Escrow storage e = escrows[id];
        require(e.amount > 0, "Escrow does not exist");
        require(!e.released, "Already released");
        require(block.timestamp >= e.expireAt, "Not expired yet");
        require(msg.sender == e.payer, "Only payer can refund");
        
        e.released = true;
        uint256 amount = e.amount;
        address payer = e.payer;
        
        delete escrows[id];
        
        require(token.transfer(payer, amount), "Token transfer failed");
        emit Refunded(id, payer, amount);
    }

    /**
     * @notice Owner can rescue tokens accidentally sent (not the escrow token)
     * @param otherToken Address of the token to rescue
     * @param to Recipient of the rescued tokens
     * @param amount Amount to rescue
     */
    function rescueTokens(IERC20 otherToken, address to, uint256 amount) external onlyOwner {
        require(address(otherToken) != address(token), "Cannot rescue escrow token");
        require(otherToken.transfer(to, amount), "Rescue failed");
    }
}
