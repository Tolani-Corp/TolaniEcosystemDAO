// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TolaniVesting
 * @notice Linear vesting contract that releases tokens over time
 * @dev The contract holds a supply of tokens and gradually releases them to a beneficiary.
 *      Useful for team allocations, investor distributions, and community grants.
 */
contract TolaniVesting is Ownable {
    IERC20 public immutable token;
    address public beneficiary;
    uint256 public immutable start;
    uint256 public immutable cliff;
    uint256 public immutable duration;
    uint256 public released;
    bool public revocable;
    bool public revoked;

    event TokensReleased(address indexed beneficiary, uint256 amount);
    event VestingRevoked(address indexed beneficiary, uint256 amountReturned);
    event BeneficiaryChanged(address indexed oldBeneficiary, address indexed newBeneficiary);

    /**
     * @param token_ The ERC20 token being vested
     * @param beneficiary_ The address receiving vested tokens
     * @param start_ Timestamp when vesting starts
     * @param cliffDuration Duration of the cliff period in seconds
     * @param duration_ Total duration of the vesting schedule in seconds
     * @param revocable_ Whether the vesting can be revoked by owner
     * @param owner_ The owner address (typically DAO timelock)
     */
    constructor(
        IERC20 token_,
        address beneficiary_,
        uint256 start_,
        uint256 cliffDuration,
        uint256 duration_,
        bool revocable_,
        address owner_
    ) Ownable(owner_) {
        require(address(token_) != address(0), "Invalid token");
        require(beneficiary_ != address(0), "Invalid beneficiary");
        require(duration_ > cliffDuration, "Duration must be greater than cliff");
        require(duration_ > 0, "Duration must be > 0");
        
        token = token_;
        beneficiary = beneficiary_;
        start = start_;
        cliff = start_ + cliffDuration;
        duration = duration_;
        revocable = revocable_;
    }

    /**
     * @notice Compute the amount of tokens that have vested up to now
     * @return The total amount of tokens vested
     */
    function vestedAmount() public view returns (uint256) {
        if (revoked) {
            return released;
        }
        
        uint256 total = token.balanceOf(address(this)) + released;
        
        if (block.timestamp < cliff) {
            return 0;
        } else if (block.timestamp >= start + duration) {
            return total;
        } else {
            return (total * (block.timestamp - start)) / duration;
        }
    }

    /**
     * @notice Compute the amount of tokens that can be released now
     * @return The releasable amount
     */
    function releasable() public view returns (uint256) {
        return vestedAmount() - released;
    }

    /**
     * @notice Release vested tokens to the beneficiary
     * @dev Anyone can call this, but only beneficiary receives tokens
     */
    function release() external {
        require(!revoked, "Vesting has been revoked");
        uint256 amount = releasable();
        require(amount > 0, "No tokens to release");
        
        released += amount;
        require(token.transfer(beneficiary, amount), "Transfer failed");
        emit TokensReleased(beneficiary, amount);
    }

    /**
     * @notice Revoke the vesting and return unvested tokens to owner
     * @dev Only callable by owner, and only if revocable
     */
    function revoke() external onlyOwner {
        require(revocable, "Vesting is not revocable");
        require(!revoked, "Already revoked");
        
        uint256 vested = vestedAmount();
        uint256 unvested = token.balanceOf(address(this)) + released - vested;
        
        revoked = true;
        
        if (unvested > 0) {
            require(token.transfer(owner(), unvested), "Transfer failed");
        }
        
        emit VestingRevoked(beneficiary, unvested);
    }

    /**
     * @notice Update the beneficiary address
     * @param newBeneficiary The new beneficiary address
     */
    function setBeneficiary(address newBeneficiary) external onlyOwner {
        require(newBeneficiary != address(0), "Invalid beneficiary");
        address old = beneficiary;
        beneficiary = newBeneficiary;
        emit BeneficiaryChanged(old, newBeneficiary);
    }

    /**
     * @notice Get vesting schedule info
     * @return _beneficiary Current beneficiary
     * @return _start Start timestamp
     * @return _cliff Cliff timestamp
     * @return _duration Total duration in seconds
     * @return _released Total released so far
     * @return _releasable Currently releasable
     * @return _revoked Whether revoked
     */
    function getVestingInfo() external view returns (
        address _beneficiary,
        uint256 _start,
        uint256 _cliff,
        uint256 _duration,
        uint256 _released,
        uint256 _releasable,
        bool _revoked
    ) {
        return (beneficiary, start, cliff, duration, released, releasable(), revoked);
    }
}
