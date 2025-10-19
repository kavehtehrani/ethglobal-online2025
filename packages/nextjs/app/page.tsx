"use client";

import { useEffect, useState } from "react";
import { useCreateWallet, usePrivy, useSign7702Authorization, useWallets } from "@privy-io/react-auth";
import { useSetActiveWallet } from "@privy-io/wagmi";
import { NextPage } from "next";
import { sepolia } from "viem/chains";
import { useAccount, useWalletClient } from "wagmi";
import { useReadContract } from "wagmi";
import { Address, AddressInput, EtherInput } from "~~/components/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { testBasicPYUSDTransfer, testBasicPrivyTransaction } from "~~/lib/basicPrivyTest";
import { CONTRACTS, DEFAULT_TEST_VALUES } from "~~/lib/constants";
import { executeGaslessPayment } from "~~/lib/gaslessPayment";
import { executeMetaMaskGaslessPayment } from "~~/lib/metamaskGaslessPayment";
import { executePrivyGaslessPayment } from "~~/lib/privyGaslessPayment";
import { notification } from "~~/utils/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { signAuthorization } = useSign7702Authorization();
  const { createWallet } = useCreateWallet();
  const { setActiveWallet } = useSetActiveWallet();

  const [recipient, setRecipient] = useState(DEFAULT_TEST_VALUES.RECIPIENT_ADDRESS);
  const [amount, setAmount] = useState<string>(DEFAULT_TEST_VALUES.AMOUNT_PYUSD);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"privateKey" | "metamask" | "privy">("privy");
  const { targetNetwork } = useTargetNetwork();

  // Get the embedded wallet or any Privy wallet
  const embeddedWallet = wallets.find(wallet => wallet.walletClientType === "privy");
  const privyWallet = wallets.find(
    wallet => wallet.walletClientType === "privy" || wallet.walletClientType === "metamask",
  );

  // Set the embedded wallet as active (following Privy tutorial exactly)
  useEffect(() => {
    if (embeddedWallet) {
      setActiveWallet(embeddedWallet);
    }
  }, [embeddedWallet, setActiveWallet]);

  // Debug logging
  console.log("🔍 Privy Debug:", {
    ready,
    authenticated,
    walletsCount: wallets.length,
    wallets: wallets.map(w => ({ type: w.walletClientType, address: w.address })),
    embeddedWallet: embeddedWallet?.address,
    privyWallet: privyWallet?.address,
    signAuthorizationAvailable: !!signAuthorization,
    connectedAddress,
    walletClientAddress: walletClient?.account?.address,
    addressesMatch: privyWallet?.address === walletClient?.account?.address,
  });

  // Use Privy wallet address if available, otherwise use connected address
  const walletAddress = privyWallet?.address || connectedAddress;

  // Read PYUSD balance on Sepolia
  const {
    data: pyusdBalance,
    error: balanceError,
    isLoading: balanceLoading,
  } = useReadContract({
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
    args: walletAddress ? [walletAddress] : ["0x0000000000000000000000000000000000000000"],
    chainId: sepolia.id,
  });

  // Debug logging
  console.log("Balance Debug:", {
    connectedAddress,
    pyusdBalance,
    balanceError,
    balanceLoading,
    contractAddress: CONTRACTS.PYUSD,
  });

  const handleCreateEmbeddedWallet = async () => {
    try {
      console.log("🔧 Creating embedded wallet...");
      await createWallet();
      console.log("✅ Embedded wallet created!");
      notification.success("Embedded wallet created successfully!");
    } catch (error) {
      console.error("❌ Failed to create embedded wallet:", error);
      notification.error(
        `Failed to create embedded wallet: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const handleTestBasicETHTransfer = async () => {
    if (!privyWallet) {
      notification.error("Privy wallet not available");
      return;
    }

    setIsLoading(true);
    try {
      const result = await testBasicPrivyTransaction({
        privyWallet,
        recipientAddress: recipient as `0x${string}`,
        amount: "0.001", // Small test amount
      });

      if (result.success) {
        notification.success(`Basic ETH transfer successful! TX: ${result.txHash}`);
      }
    } catch (error) {
      console.error("Basic ETH transfer error:", error);
      notification.error(`Basic ETH transfer failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestBasicPYUSDTransfer = async () => {
    if (!privyWallet) {
      notification.error("Privy wallet not available");
      return;
    }

    setIsLoading(true);
    try {
      const result = await testBasicPYUSDTransfer({
        privyWallet,
        recipientAddress: recipient as `0x${string}`,
        amount: "1", // 1 PYUSD test
      });

      if (result.success) {
        notification.success(`Basic PYUSD transfer successful! TX: ${result.txHash}`);
      }
    } catch (error) {
      console.error("Basic PYUSD transfer error:", error);
      notification.error(`Basic PYUSD transfer failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGaslessPayment = async () => {
    if (!recipient || !amount) {
      notification.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);

    try {
      let result;

      if (paymentMode === "privateKey") {
        result = await executeGaslessPayment({
          recipientAddress: recipient as `0x${string}`,
          amount,
        });
      } else if (paymentMode === "metamask") {
        result = await executeMetaMaskGaslessPayment({
          recipientAddress: recipient as `0x${string}`,
          amount,
        });
      } else {
        // Privy mode - use any Privy wallet (embedded or connected)
        console.log("Privy payment attempt:", {
          privyWallet: privyWallet?.address,
          walletType: privyWallet?.walletClientType,
          signAuthorizationAvailable: !!signAuthorization,
          allWallets: wallets.map(w => ({ type: w.walletClientType, address: w.address })),
        });

        if (!privyWallet) {
          throw new Error(
            `No Privy wallet found. Available wallets: ${wallets.map(w => w.walletClientType).join(", ")}`,
          );
        }

        if (!signAuthorization) {
          throw new Error(
            "EIP-7702 signing not available. This might be because you're using an external wallet instead of an embedded wallet.",
          );
        }

        result = await executePrivyGaslessPayment({
          recipientAddress: recipient as `0x${string}`,
          amount,
          embeddedWallet: privyWallet, // Use any Privy wallet
          signAuthorization,
          walletClient,
        });
      }

      if (result.success) {
        notification.success(`Gasless payment successful! TX: ${result.txHash}`);
      } else {
        notification.error(`Payment failed`);
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

      {/* Privy Authentication */}
      <div className="w-full max-w-md mx-auto mt-8">
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Authentication</h2>
            {!ready ? (
              <div className="flex justify-center">
                <div className="loading loading-spinner loading-md"></div>
              </div>
            ) : !authenticated ? (
              <div>
                <p className="mb-4 text-sm">
                  Login with Privy to use the embedded wallet for secure EIP-7702 transactions:
                </p>
                <button className="btn btn-primary w-full" onClick={login}>
                  Login with Privy
                </button>
              </div>
            ) : (
              <div>
                <p className="mb-2 text-sm">✅ Authenticated with Privy</p>
                <div className="text-xs text-gray-600 mb-2">
                  <p>Wallets: {wallets.length}</p>
                  {wallets.map((wallet, index) => (
                    <p key={index}>
                      {wallet.walletClientType}: <Address address={wallet.address} />
                    </p>
                  ))}
                </div>
                {wallets.length === 0 && (
                  <div className="mb-2">
                    <p className="text-xs text-orange-600 mb-2">No embedded wallet found. Create one:</p>
                    <button className="btn btn-sm btn-secondary" onClick={handleCreateEmbeddedWallet}>
                      Create Embedded Wallet
                    </button>
                  </div>
                )}
                <button className="btn btn-outline btn-sm" onClick={logout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Basic Transaction Tests */}
      <div className="w-full max-w-4xl mx-auto mt-8">
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">🧪 Basic Transaction Tests</h2>
            <p className="text-sm text-gray-600 mb-4">
              Test if Privy can send basic transactions before trying gasless payments
            </p>
            <div className="flex gap-4 flex-wrap">
              <button
                className="btn btn-secondary"
                onClick={handleTestBasicETHTransfer}
                disabled={isLoading || !privyWallet}
              >
                {isLoading ? "Testing..." : "Test ETH Transfer (0.001 ETH)"}
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleTestBasicPYUSDTransfer}
                disabled={isLoading || !privyWallet}
              >
                {isLoading ? "Testing..." : "Test PYUSD Transfer (1 PYUSD)"}
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              <p>✅ These tests use regular transactions (you pay gas fees)</p>
              <p>✅ If these work, Privy wallet is functioning correctly</p>
              <p>✅ If these fail, there&apos;s a basic Privy setup issue</p>
            </div>

            {/* Debug Information */}
            <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
              <h4 className="font-bold mb-2">🔍 Debug Information:</h4>
              <div className="space-y-1">
                <p>
                  <strong>Privy Ready:</strong> {ready ? "✅ Yes" : "❌ No"}
                </p>
                <p>
                  <strong>Authenticated:</strong> {authenticated ? "✅ Yes" : "❌ No"}
                </p>
                <p>
                  <strong>Wallets Count:</strong> {wallets.length}
                </p>
                <p>
                  <strong>Wallet Client Available:</strong> {walletClient ? "✅ Yes" : "❌ No"}
                </p>
                <p>
                  <strong>Connected Address:</strong> {connectedAddress || "None"}
                </p>
                <p>
                  <strong>Privy Wallet Address:</strong> {privyWallet?.address || "None"}
                </p>
                <p>
                  <strong>Sign Authorization Available:</strong> {!!signAuthorization ? "✅ Yes" : "❌ No"}
                </p>
                <p>
                  <strong>Target Network:</strong> {targetNetwork.name} (ID: {targetNetwork.id})
                </p>
                <p>
                  <strong>Wallet Client Address:</strong> {walletClient?.account?.address || "None"}
                </p>
                <p>
                  <strong>Addresses Match:</strong>{" "}
                  {privyWallet?.address === walletClient?.account?.address ? "✅ Yes" : "❌ No"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-grow bg-base-300 w-full mt-16 px-8 py-12">
        <div className="flex justify-center items-center gap-12 flex-col sm:flex-row">
          <div className="flex flex-col bg-base-100 px-10 py-10 rounded-3xl shadow-xl">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Your PYUSD Balance</h2>
              {walletAddress ? (
                <div className="text-lg">
                  <Address address={walletAddress} />
                  <div className="mt-2">
                    <strong>{pyusdBalance ? (Number(pyusdBalance) / 1e6).toFixed(2) : "0.00"} PYUSD</strong>
                    <div className="text-xs text-gray-500 mt-1">Raw: {pyusdBalance?.toString() || "null"}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Loading: {balanceLoading ? "Yes" : "No"} | Error: {balanceError ? "Yes" : "No"}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Network: {targetNetwork.name} (ID: {targetNetwork.id})
                    </div>
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
                <AddressInput
                  value={recipient}
                  onChange={(val: string) => setRecipient(val as `0x${string}`)}
                  placeholder="Enter recipient address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Amount (PYUSD)</label>
                <EtherInput value={amount} onChange={(val: string) => setAmount(val)} placeholder="Enter amount" />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Payment Method</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={paymentMode}
                  onChange={e => setPaymentMode(e.target.value as "privateKey" | "metamask" | "privy")}
                >
                  <option value="privy">Privy Embedded Wallet (Production Ready)</option>
                  <option value="metamask">MetaMask + Private Key (Hybrid)</option>
                  <option value="privateKey">Private Key Only (Demo)</option>
                </select>
                <div className="label">
                  <span className="label-text-alt">
                    {paymentMode === "privy" && "✅ Secure embedded wallet with EIP-7702 support"}
                    {paymentMode === "metamask" && "⚠️ Uses private key for EIP-7702 authorization"}
                    {paymentMode === "privateKey" && "⚠️ Demo mode - private key required"}
                  </span>
                </div>
              </div>
              <button
                className="btn btn-primary w-full"
                onClick={handleGaslessPayment}
                disabled={isLoading || (paymentMode === "privy" && !authenticated)}
              >
                {isLoading
                  ? "Processing..."
                  : paymentMode === "privy" && !authenticated
                    ? "Login with Privy First"
                    : "Send PYUSD (Gasless)"}
              </button>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p>✅ Uses EIP-7702 to make your EOA act as a smart account</p>
              <p>
                ✅ {paymentMode === "privy" ? "Privy" : paymentMode === "metamask" ? "MetaMask Delegation" : "Pimlico"}{" "}
                sponsors the gas fees
              </p>
              <p>✅ Real PYUSD transactions on Sepolia</p>
              {paymentMode === "privy" && <p>🔧 Secure embedded wallet with native EIP-7702 support</p>}
              {paymentMode === "metamask" && (
                <p>🔧 Uses MetaMask delegation toolkit with private key for EIP-7702 auth</p>
              )}
              {paymentMode === "privateKey" && <p>🔧 Demo mode using private key directly</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
