import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const TransactionCounterModule = buildModule(
  "TransactionCounterModule",
  (m) => {
    // Get deployer address as initial owner
    const deployer = m.getAccount(0);

    const transactionCounter = m.contract("TransactionCounter", [deployer]);

    return { transactionCounter };
  }
);

export default TransactionCounterModule;
