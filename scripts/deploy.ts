import { network } from "hardhat";
import { CONTRACTS, FEE_RECEIVER_ADDRESS } from "@/lib/constants";

async function main() {
  console.log("Deploying GaslessPaymentAccount...");

  // Contract addresses from constants
  const PYUSD_TOKEN = CONTRACTS.PYUSD;
  const FEE_RECEIVER = FEE_RECEIVER_ADDRESS;

  // Connect to network and get viem
  const { viem } = await network.connect();

  // Deploy the contract using viem
  const gaslessPaymentAccount = await viem.deployContract(
    "GaslessPaymentAccount",
    [PYUSD_TOKEN, FEE_RECEIVER]
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
