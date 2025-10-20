import { network } from "hardhat";
import { FEE_RECEIVER_ADDRESS } from "@/lib/constants";

async function main() {
  console.log("Deploying GaslessPaymentAccount for testing...");

  // Connect to network and get viem
  const { viem } = await network.connect();

  // Deploy MockPYUSD first - local testing only
  const mockPYUSD = await viem.deployContract("MockPYUSD", [1000000e6]); // 1M PYUSD
  console.log("MockPYUSD deployed to:", mockPYUSD.address);

  // Fee receiver address from constants
  const FEE_RECEIVER = FEE_RECEIVER_ADDRESS;

  // Deploy GaslessPaymentAccount with MockPYUSD
  const gaslessPaymentAccount = await viem.deployContract(
    "GaslessPaymentAccount",
    [mockPYUSD.address, FEE_RECEIVER]
  );

  console.log(
    "GaslessPaymentAccount deployed to:",
    gaslessPaymentAccount.address
  );
  console.log("MockPYUSD Token:", mockPYUSD.address);
  console.log("Fee Receiver:", FEE_RECEIVER);

  console.log("✅ Test deployment completed successfully!");
  console.log("📝 You can now test the contract with MockPYUSD");
  console.log("📝 Use the MockPYUSD address to mint tokens for testing");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
