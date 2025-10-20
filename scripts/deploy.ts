import { network } from "hardhat";
import { CONTRACTS, FEE_RECEIVER_ADDRESS } from "@/src/lib/constants";
import { privateKeyToAccount } from "viem/accounts";

async function main() {
  console.log("Deploying GaslessPaymentAccount...");

  // Contract addresses from constants
  const PYUSD_TOKEN = CONTRACTS.PYUSD;
  const FEE_RECEIVER = FEE_RECEIVER_ADDRESS;

  // Load environment variables
  const privateKey = process.env.PRIVATE_KEY;
  const rpcUrl = process.env.SEPOLIA_RPC_URL;

  if (!privateKey) {
    throw new Error("PRIVATE_KEY environment variable is required");
  }

  if (!rpcUrl) {
    throw new Error("SEPOLIA_RPC_URL environment variable is required");
  }

  console.log("Using RPC URL:", rpcUrl);
  console.log(
    "Deploying from account:",
    privateKeyToAccount(privateKey as `0x${string}`).address
  );

  // Connect to network and get viem
  const { viem } = await network.connect();

  // Deploy the contract using viem
  const gaslessPaymentAccount = await viem.deployContract(
    "GaslessPaymentAccount",
    [PYUSD_TOKEN, FEE_RECEIVER, FEE_RECEIVER] // Using fee receiver as initial owner
  );

  console.log(
    "GaslessPaymentAccount deployed to:",
    gaslessPaymentAccount.address
  );
  console.log("PYUSD Token:", PYUSD_TOKEN);
  console.log("Fee Receiver:", FEE_RECEIVER);

  console.log("✅ GaslessPaymentAccount deployed successfully!");
  console.log("📝 Contract features:");
  console.log("   - EIP-7702 compatible");
  console.log("   - Tiered fee system (5 free, then 1 in 5 free)");
  console.log("   - Paid tier support");
  console.log("   - PYUSD transfer with automatic fee collection");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
