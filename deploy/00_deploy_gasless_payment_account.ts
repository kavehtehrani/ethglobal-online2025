import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { privateKeyToAccount } from "viem/accounts";

const deployGaslessPaymentAccount: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments } = hre;
  const { deploy } = deployments;

  // Load environment variables
  const privateKey = process.env.PRIVATE_KEY;
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  
  if (!privateKey) {
    throw new Error("PRIVATE_KEY environment variable is required");
  }
  
  if (!rpcUrl) {
    throw new Error("SEPOLIA_RPC_URL environment variable is required");
  }

  // Create account from private key
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const deployer = account.address;

  console.log("Deploying from account:", deployer);
  console.log("Using RPC URL:", rpcUrl);

  console.log("Deploying GaslessPaymentAccount...");
  console.log("Deployer:", deployer);

  // Contract addresses from constants
  const PYUSD_TOKEN = "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9"; // Official PYUSD on Sepolia
  const FEE_RECEIVER = "0xe6DdDcbb2848983D9cAaB715611849E579759CB0"; // Fee receiver address

  const gaslessPaymentAccount = await deploy("GaslessPaymentAccount", {
    from: deployer,
    args: [PYUSD_TOKEN, FEE_RECEIVER, deployer], // pyusdToken, feeReceiver, owner
    log: true,
    waitConfirmations: 1,
  });

  console.log("✅ GaslessPaymentAccount deployed to:", gaslessPaymentAccount.address);
  console.log("📝 Contract features:");
  console.log("   - EIP-7702 compatible");
  console.log("   - Owner-controlled fee system");
  console.log("   - Tiered fee system (5 free, then 1 in 5 free)");
  console.log("   - PYUSD transfer with automatic fee collection");
  console.log("   - Owner:", deployer);
  console.log("   - PYUSD Token:", PYUSD_TOKEN);
  console.log("   - Fee Receiver:", FEE_RECEIVER);

  // Verify contract on Etherscan if on a live network
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    try {
      await hre.run("verify:verify", {
        address: gaslessPaymentAccount.address,
        constructorArguments: [PYUSD_TOKEN, FEE_RECEIVER, deployer],
      });
      console.log("✅ Contract verified on Etherscan");
    } catch (error) {
      console.log("⚠️  Contract verification failed:", error);
    }
  }
};

export default deployGaslessPaymentAccount;
deployGaslessPaymentAccount.tags = ["GaslessPaymentAccount"];
