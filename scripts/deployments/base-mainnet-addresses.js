const BASE_MAINNET_ADDRESSES = Object.freeze({
  chainId: 8453,
  network: "base",
  deployer: "0xAdBcb3Ba539b741c386d28705858Af699856B928",
  safe: "0x57dd8B744fd527c4cbd983d2878a29c5116ab855",
  staleSafe: "0xa56eb5E3990C740C8c58F02eAD263feF02567677",
  l1Tut: "0x90e9d7189D605a824C2481Fe88A1d9A7DDFAF71D",
  tut: "0xAf7e938741a720508897Bf3a13538f6713A337A4",
  uTut: "0x6D3205ba4066260ca4B94F9221c46b95B1eedcD4",
  sessionKeyRegistry: "0x73e8fDfE1EEd5f6fbE47Ef9bCEaD76da78516025",
  tutConverter: "0xF064C89198Ce3c595bf60ac0b6A12045CB49ebeD",
  trainingRewards: "0x24D8bE6650DBb2e4F15FcCE540b1f417A48B3526",
  timelock: "0xb23f0662511ec0ee8d3760e3158a5Ab01551d52d",
  governor: "0xeEd65936FaEDb315c598F8b1aF796289BCE2B7f6",
  treasury: "0x3FaB09377944144eB991DB2a5ADf2C96A5e8587c",
  deprecatedStakingPool: "0x21Fc5CD8606e19961F38E26fd7286f7e647eFf04",
  stakingPool: "0xA2887e45E0aFF0476a841c3eE4a647A21f32A628",
});

function configuredSafeAddress() {
  return process.env.GNOSIS_SAFE_ADDRESS || BASE_MAINNET_ADDRESSES.safe;
}

function isExecuteMode(value = process.env.EXECUTE_RECONCILIATION) {
  return ["1", "true", "yes", "execute"].includes(String(value || "").toLowerCase());
}

module.exports = {
  BASE_MAINNET_ADDRESSES,
  configuredSafeAddress,
  isExecuteMode,
};
