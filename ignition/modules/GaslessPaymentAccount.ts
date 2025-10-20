import { buildModule } from "@nomicfoundation/hardhat-ignition-viem/modules";
import { CONTRACTS, FEE_RECEIVER_ADDRESS } from "@/lib/constants";

export default buildModule("GaslessPaymentAccountModule", (m) => {
  // Contract addresses from constants
  const PYUSD_TOKEN = CONTRACTS.PYUSD;
  const FEE_RECEIVER = FEE_RECEIVER_ADDRESS;

  const gaslessPaymentAccount = m.contract("GaslessPaymentAccount", [
    PYUSD_TOKEN,
    FEE_RECEIVER,
  ]);

  return { gaslessPaymentAccount };
});
