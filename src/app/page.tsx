"use client";

import { useState, useEffect } from "react";
import {
  useCreateWallet,
  usePrivy,
  useSign7702Authorization,
  useWallets,
} from "@privy-io/react-auth";
import { sepolia } from "viem/chains";
import { createPublicClient, http, formatUnits } from "viem";
import { CONTRACTS, DEFAULT_TEST_VALUES, RPC_ENDPOINTS } from "@/lib/constants";
import { executePrivyGaslessPayment } from "@/lib/privyGaslessPayment";
import {
  testBasicPrivyTransaction,
  testBasicPYUSDTransfer,
} from "@/lib/basicPrivyTest";
import { notification } from "@/lib/notifications";

export default function Home() {
  const { ready, authenticated, login, logout, sendTransaction } = usePrivy();
  const { wallets } = useWallets();
  const { signAuthorization } = useSign7702Authorization();
  const { createWallet } = useCreateWallet();

  const [recipient, setRecipient] = useState(
    DEFAULT_TEST_VALUES.RECIPIENT_ADDRESS
  );
  const [amount, setAmount] = useState<string>(
    DEFAULT_TEST_VALUES.AMOUNT_PYUSD
  );
  const [isLoading, setIsLoading] = useState(false);
  const [ethBalance, setEthBalance] = useState<string>("0");
  const [pyusdBalance, setPyusdBalance] = useState<string>("0");
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<{
    hash: string;
    type: string;
    amount: string;
    token: string;
    to: string;
  } | null>(null);

  // Get the embedded wallet or any Privy wallet
  const embeddedWallet = wallets.find(
    (wallet) => wallet.walletClientType === "privy"
  );
  const privyWallet = wallets.find(
    (wallet) =>
      wallet.walletClientType === "privy" ||
      wallet.walletClientType === "metamask"
  );

  // Note: We don't need to set active wallet since we're using Privy's native wallet directly

  // Function to fetch balances
  const fetchBalances = async (address: `0x${string}`) => {
    if (!address) return;

    setBalancesLoading(true);
    try {
      const publicClient = createPublicClient({
        chain: sepolia,
        transport: http(RPC_ENDPOINTS.SEPOLIA),
      });

      // Fetch ETH balance
      const ethBalanceWei = await publicClient.getBalance({ address });
      const ethBalanceFormatted = formatUnits(ethBalanceWei, 18);
      setEthBalance(ethBalanceFormatted);

      // Fetch PYUSD balance
      const pyusdBalanceWei = (await publicClient.readContract({
        address: CONTRACTS.PYUSD,
        abi: [
          {
            inputs: [
              { internalType: "address", name: "account", type: "address" },
            ],
            name: "balanceOf",
            outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
            stateMutability: "view",
            type: "function",
          },
        ],
        functionName: "balanceOf",
        args: [address],
      })) as bigint;

      const pyusdBalanceFormatted = formatUnits(pyusdBalanceWei, 6); // PYUSD has 6 decimals
      setPyusdBalance(pyusdBalanceFormatted);
    } catch (error) {
      console.error("Error fetching balances:", error);
      setEthBalance("0");
      setPyusdBalance("0");
    } finally {
      setBalancesLoading(false);
    }
  };

  // Fetch balances when wallet address changes
  useEffect(() => {
    if (privyWallet?.address) {
      fetchBalances(privyWallet.address as `0x${string}`);
    }
  }, [privyWallet?.address]);

  // Debug logging
  console.log("🔍 Privy Debug:", {
    ready,
    authenticated,
    walletsCount: wallets.length,
    wallets: wallets.map((w) => ({
      type: w.walletClientType,
      address: w.address,
    })),
    embeddedWallet: embeddedWallet?.address,
    privyWallet: privyWallet?.address,
    signAuthorizationAvailable: !!signAuthorization,
  });

  // Use Privy wallet address if available
  const walletAddress = privyWallet?.address;

  const handleCreateEmbeddedWallet = async () => {
    try {
      console.log("🔧 Creating embedded wallet...");
      await createWallet();
      console.log("✅ Embedded wallet created!");
      notification.success("Embedded wallet created successfully!");
    } catch (error) {
      console.error("❌ Failed to create embedded wallet:", error);
      notification.error(
        `Failed to create embedded wallet: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleTestBasicETHTransfer = async () => {
    if (!privyWallet || !sendTransaction) {
      notification.error("Privy wallet or sendTransaction not available");
      return;
    }

    setIsLoading(true);
    try {
      const result = await testBasicPrivyTransaction({
        privySendTransaction: sendTransaction,
        walletAddress: privyWallet.address as `0x${string}`,
        recipientAddress: recipient,
        amount: "0.001", // Small test amount
      });

      if (result.success) {
        setLastTransaction({
          hash: result.txHash,
          type: "Basic ETH Transfer",
          amount: result.amount,
          token: "ETH",
          to: result.to,
        });
        notification.success(
          `Basic ETH transfer successful! Sent ${result.amount} ETH to ${result.to}`,
          result.txHash
        );
        // Refresh balances after successful transaction
        if (privyWallet?.address) {
          fetchBalances(privyWallet.address as `0x${string}`);
        }
      }
    } catch (error) {
      console.error("Basic ETH transfer error:", error);
      notification.error(
        `Basic ETH transfer failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestBasicPYUSDTransfer = async () => {
    if (!privyWallet || !sendTransaction) {
      notification.error("Privy wallet or sendTransaction not available");
      return;
    }

    setIsLoading(true);
    try {
      const result = await testBasicPYUSDTransfer({
        privySendTransaction: sendTransaction,
        walletAddress: privyWallet.address as `0x${string}`,
        recipientAddress: recipient,
        amount: "1", // 1 PYUSD test
      });

      if (result.success) {
        setLastTransaction({
          hash: result.txHash,
          type: "Basic PYUSD Transfer",
          amount: result.amount,
          token: "PYUSD",
          to: result.to,
        });
        notification.success(
          `Basic PYUSD transfer successful! Sent ${result.amount} PYUSD to ${result.to}`,
          result.txHash
        );
        // Refresh balances after successful transaction
        if (privyWallet?.address) {
          fetchBalances(privyWallet.address as `0x${string}`);
        }
      }
    } catch (error) {
      console.error("Basic PYUSD transfer error:", error);
      notification.error(
        `Basic PYUSD transfer failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGaslessPayment = async () => {
    if (!recipient || !amount) {
      notification.error("Please fill in all fields");
      return;
    }

    if (!privyWallet) {
      notification.error("Privy wallet not available");
      return;
    }

    if (!signAuthorization) {
      notification.error("EIP-7702 signing not available");
      return;
    }

    setIsLoading(true);
    try {
      const result = await executePrivyGaslessPayment({
        recipientAddress: recipient,
        amount,
        privyWallet,
        signAuthorization,
      });

      if (result.success) {
        setLastTransaction({
          hash: result.txHash,
          type: "Gasless PYUSD Payment",
          amount: result.amount,
          token: result.token,
          to: result.to,
        });
        notification.success(
          `Gasless payment successful! Sent ${result.amount} ${result.token} to ${result.to}`,
          result.txHash
        );
        // Refresh balances after successful payment
        if (privyWallet?.address) {
          fetchBalances(privyWallet.address as `0x${string}`);
        }
      }
    } catch (error) {
      console.error("Gasless payment error:", error);
      notification.error(
        `Gasless payment failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🚀 Gasless PYUSD Payments
          </h1>
          <p className="text-xl text-gray-700 font-medium">
            EIP-7702 + Pimlico + Privy
          </p>
          <p className="text-gray-600 mt-2">
            Send PYUSD on Sepolia without paying gas fees!
          </p>
        </div>

        {/* Privy Authentication */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">
            Authentication
          </h2>
          {!ready ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : !authenticated ? (
            <div>
              <p className="mb-4 text-gray-600">
                Login with Privy to use the embedded wallet for secure EIP-7702
                transactions:
              </p>
              <button
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                onClick={login}
              >
                Login with Privy
              </button>
            </div>
          ) : (
            <div>
              <p className="mb-2 text-green-600">✅ Authenticated with Privy</p>
              <div className="text-sm text-gray-600 mb-2">
                <p>Wallets: {wallets.length}</p>
                {wallets.map((wallet, index) => (
                  <p key={index}>
                    {wallet.walletClientType}: {wallet.address}
                  </p>
                ))}
              </div>
              {wallets.length === 0 && (
                <div className="mb-2">
                  <p className="text-sm text-orange-600 mb-2">
                    No embedded wallet found. Create one:
                  </p>
                  <button
                    className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700"
                    onClick={handleCreateEmbeddedWallet}
                  >
                    Create Embedded Wallet
                  </button>
                </div>
              )}
              <button
                className="bg-gray-500 text-white px-4 py-2 rounded text-sm hover:bg-gray-600"
                onClick={logout}
              >
                Logout
              </button>
            </div>
          )}
        </div>

        {/* Balance Display */}
        {authenticated && privyWallet && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                💰 Your Balances
              </h2>
              <button
                onClick={() =>
                  fetchBalances(privyWallet.address as `0x${string}`)
                }
                disabled={balancesLoading}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {balancesLoading ? "Refreshing..." : "🔄 Refresh"}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ETH Balance */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900">
                      ETH Balance
                    </h3>
                    <p className="text-sm text-blue-700">Sepolia Testnet</p>
                  </div>
                  <div className="text-right">
                    {balancesLoading ? (
                      <div className="animate-pulse">
                        <div className="h-6 bg-blue-300 rounded w-20 mb-1"></div>
                        <div className="h-4 bg-blue-200 rounded w-16"></div>
                      </div>
                    ) : (
                      <>
                        <p className="text-2xl font-bold text-blue-900">
                          {parseFloat(ethBalance).toFixed(4)} ETH
                        </p>
                        <p className="text-sm text-blue-600">
                          {parseFloat(ethBalance).toFixed(6)} ETH
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* PYUSD Balance */}
              <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-green-900">
                      PYUSD Balance
                    </h3>
                    <p className="text-sm text-green-700">PayPal USD</p>
                  </div>
                  <div className="text-right">
                    {balancesLoading ? (
                      <div className="animate-pulse">
                        <div className="h-6 bg-green-300 rounded w-20 mb-1"></div>
                        <div className="h-4 bg-green-200 rounded w-16"></div>
                      </div>
                    ) : (
                      <>
                        <p className="text-2xl font-bold text-green-900">
                          {parseFloat(pyusdBalance).toFixed(2)} PYUSD
                        </p>
                        <p className="text-sm text-green-600">
                          {parseFloat(pyusdBalance).toFixed(6)} PYUSD
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Wallet Address */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Wallet Address:</p>
              <p className="font-mono text-sm text-gray-800 break-all">
                {privyWallet.address}
              </p>
            </div>
          </div>
        )}

        {/* Last Transaction Display */}
        {lastTransaction && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              🎉 Last Transaction
            </h2>
            <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-green-900">Type:</span>
                  <span className="text-green-800">{lastTransaction.type}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-green-900">Amount:</span>
                  <span className="text-green-800">
                    {lastTransaction.amount} {lastTransaction.token}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-green-900">To:</span>
                  <span className="text-green-800 font-mono text-sm">
                    {lastTransaction.to}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-green-900">
                    Transaction Hash:
                  </span>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${lastTransaction.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 font-mono text-sm underline"
                  >
                    {lastTransaction.hash.slice(0, 10)}...
                    {lastTransaction.hash.slice(-8)}
                  </a>
                </div>
                <div className="pt-2">
                  <a
                    href={`https://sepolia.etherscan.io/tx/${lastTransaction.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    🔗 View on Etherscan
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Basic Transaction Tests */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">
            🧪 Basic Transaction Tests
          </h2>
          <p className="text-gray-600 mb-4">
            Test if Privy can send basic transactions before trying gasless
            payments
          </p>
          <div className="flex gap-4 flex-wrap mb-4">
            <button
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
              onClick={handleTestBasicETHTransfer}
              disabled={isLoading || !privyWallet}
            >
              {isLoading ? "Testing..." : "Test ETH Transfer (0.001 ETH)"}
            </button>
            <button
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
              onClick={handleTestBasicPYUSDTransfer}
              disabled={isLoading || !privyWallet}
            >
              {isLoading ? "Testing..." : "Test PYUSD Transfer (1 PYUSD)"}
            </button>
          </div>
          <div className="text-sm text-gray-500">
            <p>✅ These tests use regular transactions (you pay gas fees)</p>
            <p>✅ If these work, Privy wallet is functioning correctly</p>
            <p>✅ If these fail, there's a basic Privy setup issue</p>
          </div>

          {/* Debug Information */}
          <div className="mt-4 p-4 bg-gray-800 text-white rounded-lg border border-gray-600">
            <h4 className="font-bold mb-3 text-lg">🔍 Debug Information</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">Privy Ready:</span>
                <span className={ready ? "text-green-400" : "text-red-400"}>
                  {ready ? "✅ Yes" : "❌ No"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Authenticated:</span>
                <span
                  className={authenticated ? "text-green-400" : "text-red-400"}
                >
                  {authenticated ? "✅ Yes" : "❌ No"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Wallets Count:</span>
                <span className="text-blue-400">{wallets.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Privy Wallet Address:</span>
                <span className="text-yellow-400 font-mono text-xs">
                  {privyWallet?.address || "None"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">
                  Sign Authorization Available:
                </span>
                <span
                  className={
                    !!signAuthorization ? "text-green-400" : "text-red-400"
                  }
                >
                  {!!signAuthorization ? "✅ Yes" : "❌ No"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Network:</span>
                <span className="text-blue-400">
                  {sepolia.name} (ID: {sepolia.id})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Gasless Payment */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">
            Send PYUSD (Gasless)
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Address
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value as `0x${string}`)}
                placeholder="Enter recipient address"
                className="w-full px-3 py-2 border-2 border-gray-400 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (PYUSD)
              </label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full px-3 py-2 border-2 border-gray-400 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
              />
            </div>
            <button
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              onClick={handleGaslessPayment}
              disabled={isLoading || !authenticated}
            >
              {isLoading
                ? "Processing..."
                : !authenticated
                ? "Login with Privy First"
                : "Send PYUSD (Gasless)"}
            </button>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p>✅ Uses EIP-7702 to make your EOA act as a smart account</p>
            <p>✅ Pimlico sponsors the gas fees</p>
            <p>✅ Real PYUSD transactions on Sepolia</p>
            <p>🔧 Secure embedded wallet with native EIP-7702 support</p>
          </div>

          {/* Gasless Payment Status */}
          <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-600">
            <h4 className="font-bold mb-3 text-white text-lg">
              🚀 Gasless Payment Status
            </h4>
            <div className="text-sm space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-300">
                  EIP-7702 Support:
                </span>
                <span
                  className={
                    !!signAuthorization ? "text-green-400" : "text-red-400"
                  }
                >
                  {!!signAuthorization ? "✅ Available" : "❌ Not Available"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-300">
                  Pimlico API Key:
                </span>
                <span
                  className={
                    process.env.NEXT_PUBLIC_PIMLICO_API_KEY
                      ? "text-green-400"
                      : "text-red-400"
                  }
                >
                  {process.env.NEXT_PUBLIC_PIMLICO_API_KEY
                    ? "✅ Configured"
                    : "❌ Missing"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-300">
                  Sponsorship Policy:
                </span>
                <span
                  className={
                    process.env.NEXT_PUBLIC_SPONSORSHIP_POLICY_ID
                      ? "text-green-400"
                      : "text-red-400"
                  }
                >
                  {process.env.NEXT_PUBLIC_SPONSORSHIP_POLICY_ID
                    ? "✅ Configured"
                    : "❌ Missing"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-300">
                  Implementation Address:
                </span>
                <span className="text-blue-400 font-mono text-xs">
                  0xe6Cae83BdE06E4c305530e199D7217f42808555B
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
