// Contract addresses - Update these after deployment
export const CONTRACT_ADDRESSES = {
  // Testnet (Sepolia)
  sepolia: {
    governor: "0x0000000000000000000000000000000000000000",
    timelock: "0x0000000000000000000000000000000000000000",
    treasury: "0x0000000000000000000000000000000000000000",
    token: "0x0000000000000000000000000000000000000000", // TUT Token
  },
  // Localhost
  localhost: {
    governor: "0x0000000000000000000000000000000000000000",
    timelock: "0x0000000000000000000000000000000000000000",
    treasury: "0x0000000000000000000000000000000000000000",
    token: "0x0000000000000000000000000000000000000000",
  },
} as const;

// Governor ABI (key functions)
export const GOVERNOR_ABI = [
  "function name() view returns (string)",
  "function proposalCount() view returns (uint256)",
  "function proposalThreshold() view returns (uint256)",
  "function votingDelay() view returns (uint256)",
  "function votingPeriod() view returns (uint256)",
  "function quorum(uint256 blockNumber) view returns (uint256)",
  "function state(uint256 proposalId) view returns (uint8)",
  "function proposalVotes(uint256 proposalId) view returns (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes)",
  "function proposalSnapshot(uint256 proposalId) view returns (uint256)",
  "function proposalDeadline(uint256 proposalId) view returns (uint256)",
  "function proposalProposer(uint256 proposalId) view returns (address)",
  "function hasVoted(uint256 proposalId, address account) view returns (bool)",
  "function getVotes(address account, uint256 timepoint) view returns (uint256)",
  "function propose(address[] targets, uint256[] values, bytes[] calldatas, string description) returns (uint256)",
  "function castVote(uint256 proposalId, uint8 support) returns (uint256)",
  "function castVoteWithReason(uint256 proposalId, uint8 support, string reason) returns (uint256)",
  "function queue(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) returns (uint256)",
  "function execute(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) returns (uint256)",
  "event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)",
  "event VoteCast(address indexed voter, uint256 proposalId, uint8 support, uint256 weight, string reason)",
] as const;

// Token ABI (ERC20Votes)
export const TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function getVotes(address account) view returns (uint256)",
  "function delegates(address account) view returns (address)",
  "function delegate(address delegatee)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate)",
  "event DelegateVotesChanged(address indexed delegate, uint256 previousBalance, uint256 newBalance)",
] as const;

// Treasury ABI
export const TREASURY_ABI = [
  "function owner() view returns (address)",
  "function getBalance() view returns (uint256)",
  "function getTokenBalance(address token) view returns (uint256)",
  "function withdrawFunds(address payable recipient, uint256 amount)",
  "function withdrawTokens(address token, address recipient, uint256 amount)",
  "event FundsWithdrawn(address indexed recipient, uint256 amount)",
  "event TokensWithdrawn(address indexed token, address indexed recipient, uint256 amount)",
] as const;

// Timelock ABI
export const TIMELOCK_ABI = [
  "function getMinDelay() view returns (uint256)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function PROPOSER_ROLE() view returns (bytes32)",
  "function EXECUTOR_ROLE() view returns (bytes32)",
  "function CANCELLER_ROLE() view returns (bytes32)",
] as const;

// Proposal states
export const PROPOSAL_STATES = [
  "Pending",
  "Active",
  "Canceled",
  "Defeated",
  "Succeeded",
  "Queued",
  "Expired",
  "Executed",
] as const;

export type ProposalState = (typeof PROPOSAL_STATES)[number];
