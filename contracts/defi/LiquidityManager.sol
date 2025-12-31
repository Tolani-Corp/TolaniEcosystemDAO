// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title LiquidityManager
 * @notice Manages DAO-owned liquidity on Uniswap V3
 * @dev Allows governance to add/remove liquidity and collect fees
 */

// Uniswap V3 interfaces
interface INonfungiblePositionManager {
    struct MintParams {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        address recipient;
        uint256 deadline;
    }

    struct IncreaseLiquidityParams {
        uint256 tokenId;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }

    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }

    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }

    function mint(MintParams calldata params)
        external
        payable
        returns (
            uint256 tokenId,
            uint128 liquidity,
            uint256 amount0,
            uint256 amount1
        );

    function increaseLiquidity(IncreaseLiquidityParams calldata params)
        external
        payable
        returns (
            uint128 liquidity,
            uint256 amount0,
            uint256 amount1
        );

    function decreaseLiquidity(DecreaseLiquidityParams calldata params)
        external
        payable
        returns (uint256 amount0, uint256 amount1);

    function collect(CollectParams calldata params)
        external
        payable
        returns (uint256 amount0, uint256 amount1);

    function positions(uint256 tokenId)
        external
        view
        returns (
            uint96 nonce,
            address operator,
            address token0,
            address token1,
            uint24 fee,
            int24 tickLower,
            int24 tickUpper,
            uint128 liquidity,
            uint256 feeGrowthInside0LastX128,
            uint256 feeGrowthInside1LastX128,
            uint128 tokensOwed0,
            uint128 tokensOwed1
        );

    function safeTransferFrom(address from, address to, uint256 tokenId) external;
}

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
    function createPool(address tokenA, address tokenB, uint24 fee) external returns (address pool);
}

interface IUniswapV3Pool {
    function initialize(uint160 sqrtPriceX96) external;
    function slot0() external view returns (
        uint160 sqrtPriceX96,
        int24 tick,
        uint16 observationIndex,
        uint16 observationCardinality,
        uint16 observationCardinalityNext,
        uint8 feeProtocol,
        bool unlocked
    );
}

contract LiquidityManager is AccessControl, ReentrancyGuard, IERC721Receiver {
    using SafeERC20 for IERC20;

    bytes32 public constant LIQUIDITY_MANAGER_ROLE = keccak256("LIQUIDITY_MANAGER_ROLE");

    // Uniswap V3 addresses (Mainnet/Sepolia)
    INonfungiblePositionManager public immutable positionManager;
    IUniswapV3Factory public immutable factory;
    
    // TUT token
    IERC20 public immutable tutToken;

    // Fee tiers
    uint24 public constant FEE_LOW = 500;      // 0.05%
    uint24 public constant FEE_MEDIUM = 3000;  // 0.3%
    uint24 public constant FEE_HIGH = 10000;   // 1%

    // Track our LP positions
    struct LPPosition {
        uint256 tokenId;
        address token0;
        address token1;
        uint24 fee;
        uint128 liquidity;
        bool active;
    }

    mapping(uint256 => LPPosition) public positions;
    uint256[] public positionIds;
    mapping(address => mapping(address => uint256)) public pairToPosition; // token0 => token1 => positionId

    // Events
    event PoolCreated(address indexed token0, address indexed token1, uint24 fee, address pool);
    event LiquidityAdded(uint256 indexed tokenId, address token0, address token1, uint256 amount0, uint256 amount1, uint128 liquidity);
    event LiquidityRemoved(uint256 indexed tokenId, uint256 amount0, uint256 amount1);
    event FeesCollected(uint256 indexed tokenId, uint256 amount0, uint256 amount1);
    event PositionTransferred(uint256 indexed tokenId, address indexed to);

    constructor(
        address _tutToken,
        address _positionManager,
        address _factory,
        address _governance
    ) {
        require(_tutToken != address(0), "Invalid TUT address");
        require(_positionManager != address(0), "Invalid position manager");
        require(_factory != address(0), "Invalid factory");
        require(_governance != address(0), "Invalid governance");

        tutToken = IERC20(_tutToken);
        positionManager = INonfungiblePositionManager(_positionManager);
        factory = IUniswapV3Factory(_factory);

        _grantRole(DEFAULT_ADMIN_ROLE, _governance);
        _grantRole(LIQUIDITY_MANAGER_ROLE, _governance);
    }

    // ============ Pool Creation ============

    /**
     * @notice Create a new Uniswap V3 pool for TUT paired with another token
     * @param pairedToken The token to pair with TUT
     * @param fee Fee tier (500, 3000, or 10000)
     * @param initialPrice Initial price as sqrtPriceX96
     */
    function createPool(
        address pairedToken,
        uint24 fee,
        uint160 initialPrice
    ) external onlyRole(LIQUIDITY_MANAGER_ROLE) returns (address pool) {
        require(pairedToken != address(0), "Invalid paired token");
        require(pairedToken != address(tutToken), "Cannot pair with self");

        // Sort tokens (Uniswap requires token0 < token1)
        (address token0, address token1) = _sortTokens(address(tutToken), pairedToken);

        // Check if pool exists
        pool = factory.getPool(token0, token1, fee);
        
        if (pool == address(0)) {
            // Create new pool
            pool = factory.createPool(token0, token1, fee);
            
            // Initialize with price
            IUniswapV3Pool(pool).initialize(initialPrice);
            
            emit PoolCreated(token0, token1, fee, pool);
        }
    }

    /**
     * @notice Add liquidity to a TUT pair
     * @param pairedToken The token paired with TUT
     * @param fee Fee tier
     * @param tutAmount Amount of TUT to add
     * @param pairedAmount Amount of paired token to add
     * @param tickLower Lower tick bound
     * @param tickUpper Upper tick bound
     */
    function addLiquidity(
        address pairedToken,
        uint24 fee,
        uint256 tutAmount,
        uint256 pairedAmount,
        int24 tickLower,
        int24 tickUpper
    ) external onlyRole(LIQUIDITY_MANAGER_ROLE) nonReentrant returns (uint256 tokenId, uint128 liquidity) {
        require(pairedToken != address(0), "Invalid paired token");
        
        (address token0, address token1) = _sortTokens(address(tutToken), pairedToken);
        
        // Determine amounts based on token order
        (uint256 amount0, uint256 amount1) = token0 == address(tutToken) 
            ? (tutAmount, pairedAmount) 
            : (pairedAmount, tutAmount);

        // Transfer tokens to this contract
        IERC20(token0).safeTransferFrom(msg.sender, address(this), amount0);
        IERC20(token1).safeTransferFrom(msg.sender, address(this), amount1);

        // Approve position manager
        IERC20(token0).approve(address(positionManager), amount0);
        IERC20(token1).approve(address(positionManager), amount1);

        // Check if we already have a position for this pair
        uint256 existingPositionId = pairToPosition[token0][token1];
        
        if (existingPositionId != 0 && positions[existingPositionId].active) {
            // Increase existing position
            INonfungiblePositionManager.IncreaseLiquidityParams memory params = 
                INonfungiblePositionManager.IncreaseLiquidityParams({
                    tokenId: existingPositionId,
                    amount0Desired: amount0,
                    amount1Desired: amount1,
                    amount0Min: 0,
                    amount1Min: 0,
                    deadline: block.timestamp + 1800
                });

            (liquidity, amount0, amount1) = positionManager.increaseLiquidity(params);
            tokenId = existingPositionId;
            positions[tokenId].liquidity += liquidity;
        } else {
            // Mint new position
            INonfungiblePositionManager.MintParams memory params = 
                INonfungiblePositionManager.MintParams({
                    token0: token0,
                    token1: token1,
                    fee: fee,
                    tickLower: tickLower,
                    tickUpper: tickUpper,
                    amount0Desired: amount0,
                    amount1Desired: amount1,
                    amount0Min: 0,
                    amount1Min: 0,
                    recipient: address(this),
                    deadline: block.timestamp + 1800
                });

            (tokenId, liquidity, amount0, amount1) = positionManager.mint(params);

            // Record position
            positions[tokenId] = LPPosition({
                tokenId: tokenId,
                token0: token0,
                token1: token1,
                fee: fee,
                liquidity: liquidity,
                active: true
            });
            positionIds.push(tokenId);
            pairToPosition[token0][token1] = tokenId;
        }

        emit LiquidityAdded(tokenId, token0, token1, amount0, amount1, liquidity);
    }

    /**
     * @notice Remove liquidity from a position
     * @param tokenId The LP position NFT ID
     * @param liquidityToRemove Amount of liquidity to remove (0 = all)
     */
    function removeLiquidity(
        uint256 tokenId,
        uint128 liquidityToRemove
    ) external onlyRole(LIQUIDITY_MANAGER_ROLE) nonReentrant returns (uint256 amount0, uint256 amount1) {
        LPPosition storage position = positions[tokenId];
        require(position.active, "Position not active");

        uint128 liquidity = liquidityToRemove == 0 ? position.liquidity : liquidityToRemove;
        require(liquidity <= position.liquidity, "Insufficient liquidity");

        // Decrease liquidity
        INonfungiblePositionManager.DecreaseLiquidityParams memory params = 
            INonfungiblePositionManager.DecreaseLiquidityParams({
                tokenId: tokenId,
                liquidity: liquidity,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp + 1800
            });

        (amount0, amount1) = positionManager.decreaseLiquidity(params);

        // Collect the tokens
        INonfungiblePositionManager.CollectParams memory collectParams = 
            INonfungiblePositionManager.CollectParams({
                tokenId: tokenId,
                recipient: msg.sender,
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            });

        positionManager.collect(collectParams);

        // Update position
        position.liquidity -= liquidity;
        if (position.liquidity == 0) {
            position.active = false;
        }

        emit LiquidityRemoved(tokenId, amount0, amount1);
    }

    /**
     * @notice Collect trading fees from a position
     * @param tokenId The LP position NFT ID
     */
    function collectFees(uint256 tokenId) external onlyRole(LIQUIDITY_MANAGER_ROLE) nonReentrant returns (uint256 amount0, uint256 amount1) {
        LPPosition storage position = positions[tokenId];
        require(position.active || position.tokenId == tokenId, "Invalid position");

        INonfungiblePositionManager.CollectParams memory params = 
            INonfungiblePositionManager.CollectParams({
                tokenId: tokenId,
                recipient: msg.sender, // Send to caller (governance/treasury)
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            });

        (amount0, amount1) = positionManager.collect(params);

        emit FeesCollected(tokenId, amount0, amount1);
    }

    /**
     * @notice Collect fees from all positions
     */
    function collectAllFees() external onlyRole(LIQUIDITY_MANAGER_ROLE) nonReentrant {
        for (uint256 i = 0; i < positionIds.length; i++) {
            uint256 tokenId = positionIds[i];
            if (positions[tokenId].active) {
                INonfungiblePositionManager.CollectParams memory params = 
                    INonfungiblePositionManager.CollectParams({
                        tokenId: tokenId,
                        recipient: msg.sender,
                        amount0Max: type(uint128).max,
                        amount1Max: type(uint128).max
                    });

                (uint256 amount0, uint256 amount1) = positionManager.collect(params);
                
                if (amount0 > 0 || amount1 > 0) {
                    emit FeesCollected(tokenId, amount0, amount1);
                }
            }
        }
    }

    // ============ View Functions ============

    function getPosition(uint256 tokenId) external view returns (
        address token0,
        address token1,
        uint24 fee,
        uint128 liquidity,
        bool active
    ) {
        LPPosition storage pos = positions[tokenId];
        return (pos.token0, pos.token1, pos.fee, pos.liquidity, pos.active);
    }

    function getAllPositions() external view returns (uint256[] memory) {
        return positionIds;
    }

    function getActivePositionCount() external view returns (uint256 count) {
        for (uint256 i = 0; i < positionIds.length; i++) {
            if (positions[positionIds[i]].active) {
                count++;
            }
        }
    }

    function getPoolAddress(address pairedToken, uint24 fee) external view returns (address) {
        (address token0, address token1) = _sortTokens(address(tutToken), pairedToken);
        return factory.getPool(token0, token1, fee);
    }

    // ============ Internal Functions ============

    function _sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
    }

    // ============ ERC721 Receiver ============

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    // ============ Emergency Functions ============

    /**
     * @notice Transfer an LP position NFT out (emergency governance action)
     */
    function transferPosition(uint256 tokenId, address to) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(to != address(0), "Invalid recipient");
        positionManager.safeTransferFrom(address(this), to, tokenId);
        positions[tokenId].active = false;
        emit PositionTransferred(tokenId, to);
    }

    /**
     * @notice Withdraw any stuck tokens
     */
    function rescueTokens(address token, address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(to != address(0), "Invalid recipient");
        IERC20(token).safeTransfer(to, amount);
    }
}
