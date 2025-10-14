"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { formatUnits, parseUnits } from "viem";
import { sepolia } from "viem/chains";
import { useAccount, useSignMessage, useSignTypedData } from "wagmi";
import { useReadContract } from "wagmi";
import { Address, AddressInput, EtherInput } from "~~/components/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { executeGaslessPayment } from "~~/lib/gaslessPayment";
import { CONTRACTS, DEFAULT_TEST_VALUES } from "~~/lib/constants";
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
    address: "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9" as `0x${string}`, // PYUSD address
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
    if (!connectedAddress || !recipient || !amount) {
      notification.error("Please fill in all fields");
      return;
    }

    // Check if user is on Sepolia
    if (targetNetwork.id !== sepolia.id) {
      notification.error("Please switch to Sepolia network");
      return;
    }

    setIsLoading(true);

    try {
      // Convert amount to proper units (6 decimals for PYUSD)
      const amountInWei = parseUnits(amount, 6);

      // Check if user has enough PYUSD balance
      if (!pyusdBalance || BigInt(pyusdBalance.toString()) < amountInWei) {
        notification.error("Insufficient PYUSD balance");
        return;
      }

      // Execute real gasless payment with EIP-7702 + Pimlico
      notification.info("🚀 Executing gasless payment on Sepolia...");

      const result = await executeGaslessPayment({
        userAddress: connectedAddress as `0x${string}`,
        recipientAddress: recipient as `0x${string}`,
        amount,
        signMessage: async (message: string) => {
          return await signMessageAsync({ message });
        },
        signTypedData: async (typedData: any) => {
          return await signTypedDataAsync(typedData);
        },
      });

      if (result.success) {
        notification.success(
          <div>
            <p>
              ✅ <strong>Gasless payment successful!</strong>
            </p>
            <p>
              TX:{" "}
              <a
                href={`https://sepolia.etherscan.io/tx/${result.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="link"
              >
                {result.txHash?.slice(0, 10)}...
              </a>
            </p>
            <p className="text-xs mt-1">
              🚀 <strong>Real gasless transaction executed on Sepolia!</strong>
            </p>
          </div>,
        );
      } else {
        notification.error(`❌ Gasless payment failed: ${result.error}`);
      }

      // Clear form
      setRecipient("");
      setAmount("");
    } catch (error) {
      console.error("Payment failed:", error);
      notification.error("Payment failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center flex-col grow pt-10">
        <div className="px-5 w-full max-w-2xl">
          <h1 className="text-center">
            <span className="block text-2xl mb-2">🚀</span>
            <span className="block text-4xl font-bold">Gasless PYUSD Payments</span>
          </h1>
          <p className="text-center text-lg mb-8">Send PYUSD without holding ETH for gas fees</p>

          {connectedAddress ? (
            <div className="bg-base-100 p-6 rounded-3xl shadow-lg">
              <div className="mb-6">
                <p className="text-sm font-medium mb-2">Your Address:</p>
                <Address address={connectedAddress} />
              </div>

              <div className="mb-6">
                <p className="text-sm font-medium mb-2">PYUSD Balance:</p>
                <div className="text-2xl font-bold">
                  {pyusdBalance ? formatUnits(BigInt(pyusdBalance.toString()), 6) : "0"} PYUSD
                </div>
                <p className="text-xs text-base-content/60 mt-1">Real PYUSD on Sepolia</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Recipient Address</label>
                  <AddressInput value={recipient} onChange={setRecipient} placeholder="0x..." />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Amount (PYUSD)</label>
                  <EtherInput value={amount} onChange={setAmount} placeholder="0.00" />
                </div>

                <button
                  className={`btn btn-primary w-full ${isLoading ? "loading" : ""}`}
                  onClick={handleGaslessPayment}
                  disabled={!recipient || !amount || isLoading}
                >
                  {isLoading ? "Processing..." : "Send PYUSD (Gasless)"}
                </button>
              </div>

              <div className="mt-6 p-4 bg-info/10 rounded-lg">
                <p className="text-sm">
                  <strong>Real Gasless Payments:</strong> This uses EIP-7702 + Pimlico for actual gasless payments on
                  Sepolia testnet where users never need ETH for gas fees.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-lg mb-4">Please connect your wallet to start</p>
              <div className="text-sm text-base-content/70">You&apos;ll need PYUSD tokens to send payments</div>
            </div>
          )}

          <div className="mt-8 text-center text-sm text-base-content/70">
            <p>Built with EIP-7702 (Pectra) + Pimlico + Scaffold-ETH 2</p>
            <p className="mt-2">
              <a href="/debug" className="link">
                Debug Contracts
              </a>{" "}
              |{" "}
              <a href="/blockexplorer" className="link">
                Block Explorer
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
