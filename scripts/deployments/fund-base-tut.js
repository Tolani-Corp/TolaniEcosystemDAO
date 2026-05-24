/**
 * Fund Base mainnet DAO Treasury and TUTConverter with official Base TUT.
 *
 * Default mode is dry-run. To send transactions, set:
 *   EXECUTE_TUT_FUNDING=true
 *
 * Defaults:
 *   Treasury:  9,750,000 TUT
 *   Converter:   250,000 TUT
 */

require("dotenv").config();
const { ethers } = require("hardhat");
const { BASE_MAINNET_ADDRESSES, isExecuteMode } = require("./base-mainnet-addresses");

const EXECUTE = isExecuteMode(process.env.EXECUTE_TUT_FUNDING || process.env.EXECUTE_FUNDING);
const TREASURY_AMOUNT = process.env.TREASURY_TUT_AMOUNT || "9750000";
const CONVERTER_AMOUNT = process.env.CONVERTER_TUT_AMOUNT || "250000";

const ERC20_ABI = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

async function requireCode(address, label) {
  const code = await ethers.provider.getCode(address);
  if (code === "0x") {
    throw new Error(`${label} has no contract code on Base: ${address}`);
  }
}

async function maybeSend(description, fn) {
  if (!EXECUTE) {
    console.log(`DRY-RUN: ${description}`);
    return null;
  }

  const tx = await fn();
  console.log(`TX: ${tx.hash}`);
  await tx.wait(2);
  console.log(`Done: ${description}`);
  return tx;
}

async function readFundingBalances(tut, source) {
  return {
    source: await tut.balanceOf(source.address),
    treasury: await tut.balanceOf(BASE_MAINNET_ADDRESSES.treasury),
    converter: await tut.balanceOf(BASE_MAINNET_ADDRESSES.tutConverter),
  };
}

async function readFinalBalances(tut, source, expectedTreasuryMinimum, expectedConverterMinimum) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const balances = await readFundingBalances(tut, source);
    if (balances.treasury >= expectedTreasuryMinimum && balances.converter >= expectedConverterMinimum) {
      return balances;
    }

    if (attempt < 5) {
      console.log(`Waiting for RPC balance consistency (${attempt}/5)...`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  return readFundingBalances(tut, source);
}

async function main() {
  const [source] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("\nBASE MAINNET TUT FUNDING");
  console.log("=".repeat(70));
  console.log(`Network: ${network.name} (${network.chainId})`);
  console.log(`Mode: ${EXECUTE ? "EXECUTE" : "DRY-RUN"}`);
  console.log(`Source: ${source.address}`);
  console.log(`Treasury: ${BASE_MAINNET_ADDRESSES.treasury}`);
  console.log(`Converter: ${BASE_MAINNET_ADDRESSES.tutConverter}`);

  if (network.chainId !== BigInt(BASE_MAINNET_ADDRESSES.chainId)) {
    throw new Error(`Run this on Base mainnet (${BASE_MAINNET_ADDRESSES.chainId})`);
  }

  if (source.address.toLowerCase() !== BASE_MAINNET_ADDRESSES.deployer.toLowerCase()) {
    throw new Error(`Signer is not the expected source wallet: ${BASE_MAINNET_ADDRESSES.deployer}`);
  }

  await requireCode(BASE_MAINNET_ADDRESSES.tut, "Official Base TUT");
  await requireCode(BASE_MAINNET_ADDRESSES.treasury, "Treasury");
  await requireCode(BASE_MAINNET_ADDRESSES.tutConverter, "TUTConverter");

  const tut = new ethers.Contract(BASE_MAINNET_ADDRESSES.tut, ERC20_ABI, source);
  const converter = await ethers.getContractAt("TUTConverter", BASE_MAINNET_ADDRESSES.tutConverter);

  const [symbol, decimals] = await Promise.all([tut.symbol(), tut.decimals()]);
  const tokenDecimals = Number(decimals);
  const treasuryAmount = ethers.parseUnits(TREASURY_AMOUNT, tokenDecimals);
  const converterAmount = ethers.parseUnits(CONVERTER_AMOUNT, tokenDecimals);
  const totalAmount = treasuryAmount + converterAmount;

  console.log(`Token: ${symbol} (${tokenDecimals} decimals)`);
  console.log(`Treasury funding: ${ethers.formatUnits(treasuryAmount, tokenDecimals)} ${symbol}`);
  console.log(`Converter reserve: ${ethers.formatUnits(converterAmount, tokenDecimals)} ${symbol}`);
  console.log(`Total funding: ${ethers.formatUnits(totalAmount, tokenDecimals)} ${symbol}`);

  const before = await readFundingBalances(tut, source);

  console.log("\nBefore");
  console.log(`Source:    ${ethers.formatUnits(before.source, tokenDecimals)} ${symbol}`);
  console.log(`Treasury:  ${ethers.formatUnits(before.treasury, tokenDecimals)} ${symbol}`);
  console.log(`Converter: ${ethers.formatUnits(before.converter, tokenDecimals)} ${symbol}`);

  if (before.source < totalAmount) {
    throw new Error(
      `Insufficient source balance. Need ${ethers.formatUnits(totalAmount, tokenDecimals)} ${symbol}, have ${ethers.formatUnits(before.source, tokenDecimals)} ${symbol}`
    );
  }

  await maybeSend(`transfer ${TREASURY_AMOUNT} ${symbol} to Treasury`, () =>
    tut.transfer(BASE_MAINNET_ADDRESSES.treasury, treasuryAmount)
  );

  if (converterAmount > 0n) {
    const allowance = await tut.allowance(source.address, BASE_MAINNET_ADDRESSES.tutConverter);
    if (allowance < converterAmount) {
      await maybeSend(`approve ${CONVERTER_AMOUNT} ${symbol} for TUTConverter`, () =>
        tut.approve(BASE_MAINNET_ADDRESSES.tutConverter, converterAmount)
      );
    } else {
      console.log(`Allowance already sufficient: ${ethers.formatUnits(allowance, tokenDecimals)} ${symbol}`);
    }

    await maybeSend(`deposit ${CONVERTER_AMOUNT} ${symbol} into TUTConverter`, () =>
      converter.depositTut(converterAmount)
    );
  }

  const after = EXECUTE
    ? await readFinalBalances(tut, source, before.treasury + treasuryAmount, before.converter + converterAmount)
    : await readFundingBalances(tut, source);

  console.log("\nAfter");
  console.log(`Source:    ${ethers.formatUnits(after.source, tokenDecimals)} ${symbol}`);
  console.log(`Treasury:  ${ethers.formatUnits(after.treasury, tokenDecimals)} ${symbol}`);
  console.log(`Converter: ${ethers.formatUnits(after.converter, tokenDecimals)} ${symbol}`);

  console.log("\n" + "=".repeat(70));
  console.log(EXECUTE ? "Funding completed." : "Dry-run complete. Set EXECUTE_TUT_FUNDING=true to apply.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
