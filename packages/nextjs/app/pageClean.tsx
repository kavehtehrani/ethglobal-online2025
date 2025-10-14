import { useState } from "react";
import { NextPage } from "next";
import { sepolia } from "viem/chains";
import { useAccount, useSignMessage, useSignTypedData } from "wagmi";
import { useReadContract } from "wagmi";
import { Address, AddressInput, EtherInput } from "~~/components/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { CONTRACTS, DEFAULT_TEST_VALUES } from "~~/lib/constants";
import { executeGaslessPayment } from "~~/lib/gaslessPayment";
import { notification } from "~~/utils/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { signTypedDataAsync } = useSignTypedData();
  const [recipient, setRecipient] = useState(DEFAULT_TEST_VALUES.RECIPIENT_ADDRESS);
  const [amount, setAmount] = useState(DEFAULT_TEST_VALUES.AMOUNT_PYUSD);
  const [isLoading, setIsLoading] = useState(false);
  const { targetNetwork } = useTargetNetwork();

  // Read PYUSD balance on Sepolia
  const { data: pyusdBalance } = useReadContract({
    address: CONTRACTS.PYUSD,
    abi: [
      {
        inputs: [{ internalType: "address", name: "account", type: "address" }],
        name: "balanceOf",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    ],
    functionName: "balanceOf",
    args: connectedAddress ? [connectedAddress] : ["0x0000000000000000000000000000000000000000"],
    chainId: sepolia.id,
  });

  const handleGaslessPayment = async () => {
    if (!connectedAddress) {
      notification.error("Please connect your wallet first");
      return;
    }

    if (!recipient || !amount) {
      notification.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);

    try {
      const result = await executeGaslessPayment({
        userAddress: connectedAddress,
        recipientAddress: recipient as `0x${string}`,
        amount,
        signMessage: signMessageAsync,
        signTypedData: signTypedDataAsync,
      });

      if (result.success) {
        notification.success(`Gasless payment successful! TX: ${result.txHash}`);
      } else {
        notification.error(`Payment failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Payment error:", error);
      notification.error(`Payment failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center flex-col flex-grow pt-10">
      <div className="px-5">
        <h1 className="text-center">
          <span className="block text-2xl mb-2">🚀 Gasless PYUSD Payments</span>
          <span className="block text-4xl font-bold">EIP-7702 + Pimlico</span>
        </h1>
        <div className="flex justify-center items-center space-x-2">
          <p className="my-2 font-medium">Send PYUSD on Sepolia without paying gas fees!</p>
        </div>
      </div>

      <div className="flex-grow bg-base-300 w-full mt-16 px-8 py-12">
        <div className="flex justify-center items-center gap-12 flex-col sm:flex-row">
          <div className="flex flex-col bg-base-100 px-10 py-10 rounded-3xl shadow-xl">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Your PYUSD Balance</h2>
              {connectedAddress ? (
                <div className="text-lg">
                  <Address address={connectedAddress} />
                  <div className="mt-2">
                    <strong>{pyusdBalance ? (Number(pyusdBalance) / 1e6).toFixed(2) : "0.00"} PYUSD</strong>
                  </div>
                </div>
              ) : (
                <p>Connect your wallet to see balance</p>
              )}
            </div>
          </div>

          <div className="flex flex-col bg-base-100 px-10 py-10 rounded-3xl shadow-xl">
            <h2 className="text-2xl font-bold mb-4">Send PYUSD (Gasless)</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Recipient Address</label>
                <AddressInput value={recipient} onChange={setRecipient} placeholder="Enter recipient address" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Amount (PYUSD)</label>
                <EtherInput value={amount} onChange={setAmount} placeholder="Enter amount" />
              </div>
              <button
                className="btn btn-primary w-full"
                onClick={handleGaslessPayment}
                disabled={isLoading || !connectedAddress}
              >
                {isLoading ? "Processing..." : "Send PYUSD (Gasless)"}
              </button>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p>✅ Uses EIP-7702 to make your EOA act as a smart account</p>
              <p>✅ Pimlico sponsors the gas fees</p>
              <p>✅ Real PYUSD transactions on Sepolia</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
