import { HardhatRuntimeEnvironment } from "hardhat/types";

export default async function deployTransactionCounter(
  hre: HardhatRuntimeEnvironment
) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("Deploying TransactionCounter...");
  console.log("Deployer:", deployer);

  // Get parameters from ignition/parameters.json
  const parameters = await import("../ignition/parameters.json");
  const config = parameters.TransactionCounterModule;

  const transactionCounter = await deploy("TransactionCounter", {
    from: deployer,
    args: [deployer], // Pass deployer as initial owner
    log: true,
    waitConfirmations: 1,
  });

  console.log("TransactionCounter deployed to:", transactionCounter.address);
  console.log("Free Tier Limit:", config.freeTierLimit);
  console.log("Free Tier Ratio:", config.freeTierRatio);

  return transactionCounter;
}
