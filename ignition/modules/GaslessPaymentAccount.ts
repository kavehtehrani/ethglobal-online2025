import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { CONTRACTS, FEE_RECEIVER_ADDRESS } from "@/lib/constants";

export default buildModule("GaslessPaymentAccountModule", (m) => {
  // Contract addresses from constants
  const PYUSD_TOKEN = CONTRACTS.PYUSD;
  const FEE_RECEIVER = FEE_RECEIVER_ADDRESS;

  // Get the deployer address from module parameter
  const deployer = m.getParameter("deployerAddress");

  const gaslessPaymentAccount = m.contract("GaslessPaymentAccount", [
    PYUSD_TOKEN,
    FEE_RECEIVER,
    deployer, // owner
  ]);

  return { gaslessPaymentAccount };
});
