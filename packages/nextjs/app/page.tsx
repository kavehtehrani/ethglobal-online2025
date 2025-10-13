"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { formatUnits, parseUnits } from "viem";
import { useAccount } from "wagmi";
import { Address, AddressInput, EtherInput } from "~~/components/scaffold-eth";
import { PYUSDFaucet } from "~~/components/scaffold-eth/PYUSDFaucet";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Read PYUSD balance
  const { data: pyusdBalance } = useScaffoldReadContract({
    contractName: "MockPYUSD",
    functionName: "balanceOf",
    args: connectedAddress ? [connectedAddress] : ["0x0000000000000000000000000000000000000000"],
  });

  // Get deployed contract info
  const { data: simpleAccountInfo } = useDeployedContractInfo("SimpleAccount");
  const { data: mockPYUSDInfo } = useDeployedContractInfo("MockPYUSD");

  const { writeContractAsync: writeMockPYUSDAsync } = useScaffoldWriteContract({
    contractName: "MockPYUSD",
  });

  const handleGaslessPayment = async () => {
    if (!connectedAddress || !recipient || !amount) {
      notification.error("Please fill in all fields");
      return;
    }

    if (!simpleAccountInfo || !mockPYUSDInfo) {
      notification.error("Contracts not deployed yet");
      return;
    }

    setIsLoading(true);

    try {
      // Convert amount to proper units (6 decimals for PYUSD)
      const amountInWei = parseUnits(amount, 6);

      // For local testing, we can do a simple transfer without EIP-7702
      // This simulates the gasless experience since gas is free on local network
      console.log("🚀 Sending PYUSD transfer (local network - gas is free!)");
      console.log("Amount:", amountInWei.toString(), "PYUSD to:", recipient);

      await writeMockPYUSDAsync({
        functionName: "transfer",
        args: [recipient, amountInWei],
      });

      notification.success(`✅ Sent ${amount} PYUSD to ${recipient}! (Local network - no gas fees)`);

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
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">PYUSD Balance:</p>
                  <PYUSDFaucet />
                </div>
                <div className="text-2xl font-bold">{pyusdBalance ? formatUnits(pyusdBalance, 6) : "0"} PYUSD</div>
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
                  {isLoading ? "Processing..." : "Send PYUSD (Local - No Gas Fees)"}
                </button>
              </div>

              <div className="mt-6 p-4 bg-info/10 rounded-lg">
                <p className="text-sm">
                  <strong>Local Testing:</strong> On local network, gas is free so we can test PYUSD transfers directly.
                  For mainnet, this would use EIP-7702 + Pimlico for true gasless payments.
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
