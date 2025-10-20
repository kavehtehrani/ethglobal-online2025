import { buildModule } from "@nomicfoundation/hardhat-ignition-viem/modules";

export default buildModule("SimpleAccountModule", (m) => {
  // PYUSD token address on Sepolia
  const PYUSD_TOKEN = "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9";

  // Fee receiver address
  const FEE_RECEIVER = "0xe6DdDcbb2848983D9cAaB715611849E579759CB0";

  const gaslessPaymentAccount = m.contract("GaslessPaymentAccount", [
    PYUSD_TOKEN,
    FEE_RECEIVER,
  ]);

  return { gaslessPaymentAccount };
});
