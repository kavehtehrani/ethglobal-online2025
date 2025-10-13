import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

/**
 * Deploys MockPYUSD and SimpleAccount contracts for gasless PYUSD payments
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployGaslessPaymentContracts: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Deploy MockPYUSD (for local testing only)
  const mockPYUSD = await deploy("MockPYUSD", {
    from: deployer,
    log: true,
    autoMine: true,
  });

  // Deploy SimpleAccount (EIP-7702 compatible)
  const simpleAccount = await deploy("SimpleAccount", {
    from: deployer,
    log: true,
    autoMine: true,
  });

  // Get the deployed contracts
  const mockPYUSDContract = await hre.ethers.getContract<Contract>("MockPYUSD", deployer);

  console.log("🚀 MockPYUSD deployed at:", mockPYUSD.address);
  console.log("🚀 SimpleAccount deployed at:", simpleAccount.address);
  console.log("💰 Deployer PYUSD balance:", await mockPYUSDContract.balanceOf(deployer));
};

export default deployGaslessPaymentContracts;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags GaslessPayment
deployGaslessPaymentContracts.tags = ["GaslessPayment"];
