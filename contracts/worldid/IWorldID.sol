// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IWorldID
 * @notice Interface for World ID verification
 * @dev World ID is a privacy-preserving proof of personhood protocol
 */
interface IWorldID {
    /**
     * @notice Verifies a World ID proof
     * @param root The root of the Merkle tree (from World ID sequencer)
     * @param groupId The group ID (1 = Orb verified, 0 = Device verified)
     * @param signalHash Hash of the signal being verified
     * @param nullifierHash Hash of the nullifier (unique per action per user)
     * @param externalNullifierHash Hash of the external nullifier (action ID)
     * @param proof The zero-knowledge proof
     */
    function verifyProof(
        uint256 root,
        uint256 groupId,
        uint256 signalHash,
        uint256 nullifierHash,
        uint256 externalNullifierHash,
        uint256[8] calldata proof
    ) external view;
}
