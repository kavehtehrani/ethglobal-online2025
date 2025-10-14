import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys SimpleAccount contract for gasless PYUSD payments on Sepolia
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deploySepoliaContracts: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Only deploy on Sepolia
  if (hre.network.name !== "sepolia") {
    console.log("⏭️ Skipping deployment on", hre.network.name, "- only deploying to Sepolia");
    return;
  }

  // Deploy SimpleAccount (EIP-7702 compatible)
  const simpleAccount = await deploy("SimpleAccount", {
    from: deployer,
    log: true,
    autoMine: true,
  });

  console.log("🚀 SimpleAccount deployed at:", simpleAccount.address);
  console.log("📝 PYUSD contract on Sepolia: 0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9");
  console.log("💡 Users can now use EIP-7702 + Pimlico for gasless PYUSD transfers!");
};

export default deploySepoliaContracts;

deploySepoliaContracts.tags = ["SepoliaPayment"];
