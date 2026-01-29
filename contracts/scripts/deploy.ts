import { ethers } from "hardhat";
// import { tryVerifyContractOnExplorer } from "./verify";

async function main() {
  console.log("Starting TradeClub deployment...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // 1. Deploy TradeClubToken
  console.log("\n1. Deploying GovernanceToken...");
  const GovernanceToken = await ethers.getContractFactory("TradeClub_GovernanceToken");
  const govToken = await GovernanceToken.deploy();
  await govToken.waitForDeployment();
  const govTokenAddress = await govToken.getAddress();
  console.log("GovernanceToken deployed to:", govTokenAddress);

  // 2. Deploy FUNDex
  console.log("\n2. Deploying FUNDex...");
  const FUNDex = await ethers.getContractFactory("FUNDex");
  const fundex = await FUNDex.deploy();
  await fundex.waitForDeployment();
  const fundexAddress = await fundex.getAddress();
  console.log("FUNDex deployed to:", fundexAddress);
  // await tryVerifyContractOnExplorer(fundexAddress, [], 1);

  // 3. Deploy MatchManager
  console.log("\n2. Deploying MatchManager...");
  const MatchManager = await ethers.getContractFactory("TradeClub_MatchManager");
  const matchManager = await MatchManager.deploy();
  await matchManager.waitForDeployment();
  const matchManagerAddress = await matchManager.getAddress();
  console.log("MatchManager deployed to:", matchManagerAddress);
  const currFunDexAddress = process.env.FUNDEX_ADDRESS;
  if (!currFunDexAddress) {
    throw new Error("FUN Dex address not set in environment variables");
  }
  console.log("Current FUN Dex address:", currFunDexAddress);
  console.log("Setting allowed DEX functions in MatchManager...");
  const tx1 = await matchManager.setAllowedDEXFunction(
    currFunDexAddress,
    "0x862a3394",
    true,
    "FUNDex.openPosition"
  );
  await tx1.wait();
  const tx2 = await matchManager.setAllowedDEXFunction(
    currFunDexAddress,
    "0x2d6ce61d",
    true,
    "FUNDex.closePosition"
  );
  await tx2.wait();
  console.log("Finished setting allowed DEX functions.");
  // await tryVerifyContractOnExplorer(matchManagerAddress, [], 1);

  // 4. Deploy BribePool
  console.log("\n4. Deploying BribePool...");
  const BribePool = await ethers.getContractFactory("TradeClub_BribePool");
  const bribePool = await BribePool.deploy(govTokenAddress);
  await bribePool.waitForDeployment();
  const bribePoolAddress = await bribePool.getAddress();
  console.log("BribePool deployed to:", bribePoolAddress);

  // // Setup: Add BribePool as minter for rewards
  // console.log("\n5. Setting up token minters...");
  // const addMinterTx = await govToken.addMinter(bribePoolAddress);
  // await addMinterTx.wait();
  // console.log("BribePool added as TCLUB token minter");

  // Print deployment summary
  console.log("\n=== Deployment Summary ===");
  console.log("TradeClubToken:", govTokenAddress);
  console.log("MatchManager:", matchManagerAddress);
  console.log("BribePool:", bribePoolAddress);
  console.log("Deployer:", deployer.address);

  // Save deployment addresses to file
  const fs = require("fs");
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      TradeClubToken: govTokenAddress,
      MatchManager: matchManagerAddress,
      FUNDex: fundexAddress,
      BribePool: bribePoolAddress,
    },
  };

  fs.writeFileSync(
    `./deployments/${Date.now()}-deployment.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\nDeployment info saved to ./deployments/");
  console.log("\nDeployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
