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
import { CONTRACTS, RPC_ENDPOINTS } from "@/lib/constants";
import { executePrivyGaslessPayment } from "@/lib/privyGaslessPayment";
import {
  testBasicPrivyTransaction,
  testBasicPYUSDTransfer,
} from "@/lib/basicPrivyTest";
import { notification } from "@/lib/notifications";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { TierStatusComponent } from "@/components/TierStatus";
import { getTransactionLink, getAddressLink } from "@/lib/explorer";
import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  XCircleIcon,
  ShareIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";
import { isAddress } from "viem";
import { useSearchParams } from "next/navigation";

export default function Home() {
  const { ready, authenticated, login, logout, sendTransaction } = usePrivy();
  const { wallets } = useWallets();
  const { signAuthorization } = useSign7702Authorization();
  const { createWallet } = useCreateWallet();
  const searchParams = useSearchParams();

  const [recipient, setRecipient] = useState<`0x${string}`>(
    "" as `0x${string}`
  );
  const [amount, setAmount] = useState<string>("");

  // Parse URL parameters for payment links
  useEffect(() => {
    const urlRecipient = searchParams.get("to");
    const urlAmount = searchParams.get("amount");

    if (urlRecipient && isAddress(urlRecipient)) {
      setRecipient(urlRecipient as `0x${string}`);
    }

    if (urlAmount && !isNaN(parseFloat(urlAmount))) {
      setAmount(urlAmount);
    }
  }, [searchParams]);
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
  const [transactionStatus, setTransactionStatus] = useState<{
    isProcessing: boolean;
    type: string;
    message: string;
    error: string | null;
  }>({
    isProcessing: false,
    type: "",
    message: "",
    error: null,
  });
  const [showPaymentLink, setShowPaymentLink] = useState(false);
  const [paymentLinkCopied, setPaymentLinkCopied] = useState(false);

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
  // const walletAddress = privyWallet?.address;

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
      setTransactionStatus({
        isProcessing: false,
        type: "",
        message: "",
        error: "Privy wallet or sendTransaction not available",
      });
      return;
    }

    setTransactionStatus({
      isProcessing: true,
      type: "Basic ETH Transfer",
      message: "Sending 0.001 ETH...",
      error: null,
    });
    setIsLoading(true);

    try {
      const result = await testBasicPrivyTransaction({
        privySendTransaction: async (tx: unknown) => {
          const result = await sendTransaction(tx);
          return result.hash;
        },
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
        setTransactionStatus({
          isProcessing: false,
          type: "Basic ETH Transfer",
          message: "Transaction Successful",
          error: null,
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
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setTransactionStatus({
        isProcessing: false,
        type: "Basic ETH Transfer",
        message: "",
        error: `Transfer failed: ${errorMessage}`,
      });
      notification.error(`Basic ETH transfer failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestBasicPYUSDTransfer = async () => {
    if (!privyWallet || !sendTransaction) {
      setTransactionStatus({
        isProcessing: false,
        type: "",
        message: "",
        error: "Privy wallet or sendTransaction not available",
      });
      return;
    }

    setTransactionStatus({
      isProcessing: true,
      type: "Basic PYUSD Transfer",
      message: "Sending 1 PYUSD...",
      error: null,
    });
    setIsLoading(true);

    try {
      const result = await testBasicPYUSDTransfer({
        privySendTransaction: async (tx: unknown) => {
          const result = await sendTransaction(tx);
          return result.hash;
        },
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
        setTransactionStatus({
          isProcessing: false,
          type: "Basic PYUSD Transfer",
          message: "Transaction Successful",
          error: null,
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
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setTransactionStatus({
        isProcessing: false,
        type: "Basic PYUSD Transfer",
        message: "",
        error: `Transfer failed: ${errorMessage}`,
      });
      notification.error(`Basic PYUSD transfer failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestGaslessPYUSDTransfer = async () => {
    if (!privyWallet || !signAuthorization) {
      setTransactionStatus({
        isProcessing: false,
        type: "",
        message: "",
        error: "Privy wallet or EIP-7702 signing not available",
      });
      return;
    }

    setTransactionStatus({
      isProcessing: true,
      type: "Test Gasless PYUSD Transfer",
      message: `Sending 1 PYUSD (gasless test) to ${recipient}...`,
      error: null,
    });
    setIsLoading(true);

    try {
      const result = await executePrivyGaslessPayment({
        recipientAddress: recipient, // Use the same recipient as the main form
        amount: "1", // 1 PYUSD test
        privyWallet: {
          address: privyWallet.address as `0x${string}`,
          getEthereumProvider: privyWallet.getEthereumProvider,
        },
        signAuthorization: async (auth: {
          contractAddress: string;
          chainId: number;
          nonce: number;
        }) => {
          const result = await signAuthorization({
            contractAddress: auth.contractAddress as `0x${string}`,
            chainId: auth.chainId,
            nonce: auth.nonce,
          });
          // Convert the signature result to a string if needed
          return typeof result === "string" ? result : JSON.stringify(result);
        },
      });

      if (result.success) {
        setLastTransaction({
          hash: result.txHash,
          type: "Test Gasless PYUSD Transfer",
          amount: result.amount,
          token: result.token,
          to: result.to,
        });
        setTransactionStatus({
          isProcessing: false,
          type: "Test Gasless PYUSD Transfer",
          message: "Transaction Successful",
          error: null,
        });
        notification.success(
          `Test gasless PYUSD transfer successful! Sent ${result.amount} ${result.token} to ${result.to}`,
          result.txHash
        );
        // Refresh balances after successful transaction
        if (privyWallet?.address) {
          fetchBalances(privyWallet.address as `0x${string}`);
        }
      }
    } catch (error) {
      console.error("Test gasless PYUSD transfer error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setTransactionStatus({
        isProcessing: false,
        type: "Test Gasless PYUSD Transfer",
        message: "",
        error: `Transfer failed: ${errorMessage}`,
      });
      notification.error(`Test gasless PYUSD transfer failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGaslessPayment = async () => {
    if (!recipient || !amount) {
      setTransactionStatus({
        isProcessing: false,
        type: "",
        message: "",
        error: "Please fill in all fields",
      });
      return;
    }

    if (!privyWallet) {
      setTransactionStatus({
        isProcessing: false,
        type: "",
        message: "",
        error: "Privy wallet not available",
      });
      return;
    }

    if (!signAuthorization) {
      setTransactionStatus({
        isProcessing: false,
        type: "",
        message: "",
        error: "EIP-7702 signing not available",
      });
      return;
    }

    setTransactionStatus({
      isProcessing: true,
      type: "Gasless PYUSD Payment",
      message: `Sending ${amount} PYUSD (gasless) to ${recipient}...`,
      error: null,
    });
    setIsLoading(true);

    try {
      const result = await executePrivyGaslessPayment({
        recipientAddress: recipient,
        amount: amount,
        privyWallet: privyWallet as {
          address: `0x${string}`;
          getEthereumProvider: () => Promise<unknown>;
        },
        signAuthorization: async (auth) => {
          const result = await signAuthorization({
            contractAddress: auth.contractAddress as `0x${string}`,
            chainId: auth.chainId,
            nonce: auth.nonce,
          });
          // Convert the signature result to a string if needed
          return typeof result === "string" ? result : JSON.stringify(result);
        },
      });

      if (result.success) {
        setLastTransaction({
          hash: result.txHash,
          type: "Gasless PYUSD Payment",
          amount: result.amount,
          token: "PYUSD",
          to: recipient,
        });
        setTransactionStatus({
          isProcessing: false,
          type: "Gasless PYUSD Payment",
          message: "Transaction Successful",
          error: null,
        });

        notification.success(
          `Payment successful! Sent ${amount} PYUSD to ${recipient}`,
          result.txHash
        );

        // Refresh balances after successful payment
        if (privyWallet?.address) {
          fetchBalances(privyWallet.address as `0x${string}`);
        }
      } else {
        setTransactionStatus({
          isProcessing: false,
          type: "Gasless PYUSD Payment",
          message: "",
          error: "Payment failed",
        });
        notification.error("Payment failed");
      }
    } catch (error) {
      console.error("Gasless payment error:", error);
      setTransactionStatus({
        isProcessing: false,
        type: "Gasless PYUSD Payment",
        message: "",
        error: error instanceof Error ? error.message : "Payment failed",
      });
      notification.error(
        error instanceof Error ? error.message : "Payment failed"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Generate payment link
  const generatePaymentLink = () => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams();

    if (recipient && isAddress(recipient)) {
      params.set("to", recipient);
    }

    if (amount && !isNaN(parseFloat(amount))) {
      params.set("amount", amount);
    }

    return `${baseUrl}?${params.toString()}`;
  };

  // Copy payment link to clipboard
  const copyPaymentLink = async () => {
    try {
      const link = generatePaymentLink();
      await navigator.clipboard.writeText(link);
      setPaymentLinkCopied(true);
      notification.success("Payment link copied to clipboard!");

      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setPaymentLinkCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy payment link:", error);
      notification.error("Failed to copy payment link");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] py-6">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-6">
          <div className="flex justify-between items-start mb-4">
            <div className="w-16"></div>
            <div className="flex-1 text-center">
              <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
                🚀 Gasless PYUSD Payments
              </h1>
              <p className="text-[var(--text-secondary)] mt-1">
                Send PYUSD on Sepolia without paying gas fees!
              </p>
            </div>
            <div className="w-16 flex justify-end">
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Privy Authentication */}
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-3 mb-4">
          {/* Desktop: Single row layout */}
          <div className="hidden lg:block">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-bold text-[var(--foreground)]">
                  Authentication
                </h2>
                {authenticated && privyWallet && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[var(--text-muted)]">
                      Wallet:
                    </span>
                    <a
                      href={getAddressLink(privyWallet.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-mono text-sm underline transition-colors inline-flex items-center gap-1"
                    >
                      {privyWallet.address.slice(0, 6)}...
                      {privyWallet.address.slice(-4)}
                      <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
              {!ready ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--accent)]"></div>
              ) : !authenticated ? (
                <button
                  className="bg-[var(--accent)] text-white px-4 py-1.5 rounded text-sm hover:bg-[var(--accent-hover)] transition-colors"
                  onClick={login}
                >
                  Login with Privy
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[var(--success)] text-sm">
                    ✅ Authenticated
                  </span>
                  <button
                    className="bg-[var(--text-secondary)] text-white px-3 py-1 rounded text-xs hover:bg-[var(--text-muted)] transition-colors"
                    onClick={logout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile/Tablet: Two row layout */}
          <div className="lg:hidden">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-[var(--foreground)]">
                Authentication
              </h2>
              {!ready ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--accent)]"></div>
              ) : !authenticated ? (
                <button
                  className="bg-[var(--accent)] text-white px-4 py-1.5 rounded text-sm hover:bg-[var(--accent-hover)] transition-colors"
                  onClick={login}
                >
                  Login with Privy
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[var(--success)] text-sm">
                    ✅ Authenticated
                  </span>
                  <button
                    className="bg-[var(--text-secondary)] text-white px-3 py-1 rounded text-xs hover:bg-[var(--text-muted)] transition-colors"
                    onClick={logout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
            {authenticated && privyWallet && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-muted)]">
                  Wallet Address:
                </span>
                <a
                  href={getAddressLink(privyWallet.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-mono text-sm underline transition-colors inline-flex items-center gap-1"
                >
                  {privyWallet.address.slice(0, 6)}...
                  {privyWallet.address.slice(-4)}
                  <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>

          {authenticated && wallets.length === 0 && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-[var(--warning)]">
                No embedded wallet found
              </span>
              <button
                className="bg-[var(--text-secondary)] text-white px-3 py-1 rounded text-xs hover:bg-[var(--text-muted)] transition-colors"
                onClick={handleCreateEmbeddedWallet}
              >
                Create Wallet
              </button>
            </div>
          )}
        </div>

        {/* Balance Display */}
        {authenticated && privyWallet && (
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xl font-bold text-[var(--foreground)]">
                💰 Your Balances
              </h2>
              <button
                onClick={() =>
                  fetchBalances(privyWallet.address as `0x${string}`)
                }
                disabled={balancesLoading}
                className="bg-[var(--accent)] text-white px-3 py-1 rounded text-sm hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {balancesLoading ? "Refreshing..." : "🔄 Refresh"}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ETH Balance */}
              <div className="bg-[var(--card-bg)] border border-[var(--card-border)] p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">
                      ETH Balance
                    </h3>
                    <p className="text-sm text-[var(--text-muted)]">
                      Sepolia Testnet
                    </p>
                  </div>
                  <div className="text-right">
                    {balancesLoading ? (
                      <div className="animate-pulse">
                        <div className="h-6 bg-[var(--card-border)] rounded w-20 mb-1"></div>
                        <div className="h-4 bg-[var(--card-border)] rounded w-16"></div>
                      </div>
                    ) : (
                      <>
                        <p className="text-2xl font-bold text-[var(--foreground)]">
                          {parseFloat(ethBalance).toFixed(4)} ETH
                        </p>
                        <p className="text-sm text-[var(--text-muted)]">
                          {parseFloat(ethBalance).toFixed(6)} ETH
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* PYUSD Balance */}
              <div className="bg-[var(--card-bg)] border border-[var(--card-border)] p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">
                      PYUSD Balance
                    </h3>
                    <p className="text-sm text-[var(--text-muted)]">
                      PayPal USD
                    </p>
                  </div>
                  <div className="text-right">
                    {balancesLoading ? (
                      <div className="animate-pulse">
                        <div className="h-6 bg-[var(--card-border)] rounded w-20 mb-1"></div>
                        <div className="h-4 bg-[var(--card-border)] rounded w-16"></div>
                      </div>
                    ) : (
                      <>
                        <p className="text-2xl font-bold text-[var(--foreground)]">
                          {parseFloat(pyusdBalance).toFixed(2)} PYUSD
                        </p>
                        <p className="text-sm text-[var(--text-muted)]">
                          {parseFloat(pyusdBalance).toFixed(6)} PYUSD
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Status & History */}
        {(transactionStatus.isProcessing ||
          transactionStatus.error ||
          transactionStatus.message ||
          lastTransaction) && (
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4 mb-6">
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-3">
              📊 Transaction Status
            </h2>

            {/* Current Transaction Status */}
            {transactionStatus.isProcessing && (
              <div className="bg-[var(--card-bg)] border border-[var(--accent)] p-3 rounded-lg mb-4">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--accent)]"></div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)]">
                      {transactionStatus.type}
                    </h3>
                    <p className="text-[var(--text-muted)]">
                      {transactionStatus.message}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {transactionStatus.error && (
              <div className="bg-[var(--card-bg)] border border-[var(--error)] p-3 rounded-lg mb-4">
                <div className="flex items-center space-x-3">
                  <div className="text-[var(--error)] text-xl">❌</div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)]">
                      Transaction Failed
                    </h3>
                    <p className="text-[var(--error)]">
                      {transactionStatus.error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Last Transaction Details */}
            {lastTransaction && (
              <div className="bg-[var(--card-bg)] border border-[var(--success)] p-3 rounded-lg">
                <h3 className="font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
                  ✅ Transaction Successful
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-[var(--foreground)]">
                      Type:
                    </span>
                    <span className="text-[var(--text-muted)]">
                      {lastTransaction.type}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-[var(--foreground)]">
                      Amount:
                    </span>
                    <span className="text-[var(--text-muted)]">
                      {lastTransaction.amount} {lastTransaction.token}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-[var(--foreground)]">
                      To:
                    </span>
                    <a
                      href={getAddressLink(lastTransaction.to)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-mono text-sm underline transition-colors inline-flex items-center gap-1"
                    >
                      {lastTransaction.to.slice(0, 6)}...
                      {lastTransaction.to.slice(-4)}
                      <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-[var(--foreground)]">
                      Transaction Hash:
                    </span>
                    <a
                      href={getTransactionLink(lastTransaction.hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-mono text-sm underline inline-flex items-center gap-1"
                    >
                      {lastTransaction.hash.slice(0, 10)}...
                      {lastTransaction.hash.slice(-8)}
                      <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tier Status */}
        {authenticated && privyWallet && (
          <div className="mb-6">
            <TierStatusComponent
              userAddress={privyWallet.address as `0x${string}`}
            />
          </div>
        )}

        {/* Gasless Payment - Main Feature */}
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4 mb-6">
          <h2 className="text-xl font-bold mb-3 text-[var(--foreground)]">
            Send PYUSD (Gasless)
          </h2>
          <div className="space-y-3">
            {/* Desktop: Single row layout */}
            <div className="hidden lg:flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Recipient Address
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) =>
                      setRecipient(e.target.value as `0x${string}`)
                    }
                    placeholder="Enter recipient address"
                    className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] placeholder-[var(--text-secondary)] ${
                      recipient && isAddress(recipient)
                        ? "border-[var(--success)] bg-[var(--card-bg)] text-[var(--foreground)]"
                        : recipient && !isAddress(recipient)
                        ? "border-[var(--error)] bg-[var(--card-bg)] text-[var(--foreground)]"
                        : "border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--foreground)]"
                    }`}
                  />
                  {recipient && isAddress(recipient) && (
                    <CheckCircleIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--success)]" />
                  )}
                  {recipient && !isAddress(recipient) && (
                    <XCircleIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--error)]" />
                  )}
                </div>
              </div>
              <div className="w-48">
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Amount (PYUSD)
                </label>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount (PYUSD)"
                  className="w-full px-3 py-2 border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--foreground)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] placeholder-[var(--text-secondary)]"
                />
              </div>
              <button
                className="bg-[var(--accent)] text-white px-6 py-2 rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors whitespace-nowrap"
                onClick={handleGaslessPayment}
                disabled={isLoading || !authenticated}
              >
                {isLoading
                  ? "Processing..."
                  : !authenticated
                  ? "Login First"
                  : "Send PYUSD"}
              </button>
            </div>

            {/* Mobile/Tablet: Two row layout */}
            <div className="lg:hidden space-y-3">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Recipient Address
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) =>
                      setRecipient(e.target.value as `0x${string}`)
                    }
                    placeholder="Enter recipient address"
                    className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] placeholder-[var(--text-secondary)] ${
                      recipient && isAddress(recipient)
                        ? "border-[var(--success)] bg-[var(--card-bg)] text-[var(--foreground)]"
                        : recipient && !isAddress(recipient)
                        ? "border-[var(--error)] bg-[var(--card-bg)] text-[var(--foreground)]"
                        : "border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--foreground)]"
                    }`}
                  />
                  {recipient && isAddress(recipient) && (
                    <CheckCircleIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--success)]" />
                  )}
                  {recipient && !isAddress(recipient) && (
                    <XCircleIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--error)]" />
                  )}
                </div>
              </div>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                    Amount (PYUSD)
                  </label>
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount (PYUSD)"
                    className="w-full px-3 py-2 border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--foreground)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] placeholder-[var(--text-secondary)]"
                  />
                </div>
                <button
                  className="bg-[var(--accent)] text-white px-6 py-2 rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors whitespace-nowrap"
                  onClick={handleGaslessPayment}
                  disabled={isLoading || !authenticated}
                >
                  {isLoading
                    ? "Processing..."
                    : !authenticated
                    ? "Login First"
                    : "Send PYUSD"}
                </button>
              </div>
            </div>
          </div>

          {/* Payment Link Section */}
          {(recipient || amount) && (
            <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShareIcon className="h-5 w-5 text-[var(--accent)]" />
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    Share Payment Link
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPaymentLink(!showPaymentLink)}
                    className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                  >
                    {showPaymentLink ? "Hide" : "Show"} Link
                  </button>
                  <button
                    onClick={copyPaymentLink}
                    disabled={paymentLinkCopied}
                    className={`flex items-center gap-1 px-3 py-1 rounded text-sm transition-colors ${
                      paymentLinkCopied
                        ? "bg-[var(--success)] text-white"
                        : "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                    }`}
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                    {paymentLinkCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              {showPaymentLink && (
                <div className="mt-3 p-3 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg">
                  <p className="text-xs text-[var(--text-muted)] mb-2">
                    Share this link to pre-fill the payment form:
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={generatePaymentLink()}
                      readOnly
                      className="flex-1 px-2 py-1 text-xs bg-[var(--background)] border border-[var(--card-border)] rounded text-[var(--foreground)] font-mono"
                    />
                    <button
                      onClick={copyPaymentLink}
                      className="p-1 text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                    >
                      <ClipboardDocumentIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* How does this work? */}
        <CollapsibleSection title="How does this work?" icon="❓">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold mb-3 text-[var(--foreground)]">
                Gasless PYUSD Payments Explained: Smart Contract + EIP-7702 +
                Pimlico + Privy
              </h3>
              <div className="space-y-3 text-sm text-[var(--text-muted)]">
                <div className="flex items-start gap-2">
                  <span className="text-[var(--accent)]">✅</span>
                  <div>
                    <strong className="text-[var(--foreground)]">
                      Smart Contract Fee System:
                    </strong>{" "}
                    Our deployed contract handles tiered fees automatically - 5
                    free transactions, then 1 in 5 free, with service fees for
                    paid transactions.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[var(--accent)]">✅</span>
                  <div>
                    <strong className="text-[var(--foreground)]">
                      EIP-7702 Smart Account:
                    </strong>{" "}
                    Your regular wallet (EOA) temporarily acts as a smart
                    account, enabling advanced features without changing your
                    wallet address.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[var(--accent)]">✅</span>
                  <div>
                    <strong className="text-[var(--foreground)]">
                      Pimlico Gas Sponsorship:
                    </strong>{" "}
                    Pimlico pays all gas fees for your transactions, so you
                    don&apos;t need any ETH for gas.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[var(--accent)]">✅</span>
                  <div>
                    <strong className="text-[var(--foreground)]">
                      Real PYUSD on Sepolia:
                    </strong>{" "}
                    These are actual PYUSD token transfers on the Sepolia
                    testnet, not simulations.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[var(--accent)]">🔧</span>
                  <div>
                    <strong className="text-[var(--foreground)]">
                      Secure Embedded Wallet:
                    </strong>{" "}
                    Privy&apos;s embedded wallet provides native EIP-7702
                    support with enterprise-grade security.
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg">
              <h4 className="font-bold mb-2 text-[var(--foreground)]">
                🚀 Technical Details
              </h4>
              <div className="text-sm text-[var(--text-muted)] space-y-2">
                <p>
                  <strong>GaslessPaymentAccount:</strong> Our deployed smart
                  contract that handles tiered fee logic, transaction tracking,
                  and automatic fee collection
                </p>
                <p>
                  <strong>EIP-7702:</strong> Ethereum Improvement Proposal that
                  allows EOAs to delegate execution to smart contracts
                </p>
                <p>
                  <strong>Pimlico:</strong> Account abstraction infrastructure
                  provider that sponsors gas fees
                </p>
                <p>
                  <strong>Privy:</strong> Web3 authentication and wallet
                  infrastructure with embedded wallet support
                </p>
                <p>
                  <strong>PYUSD:</strong> PayPal&apos;s USD-pegged stablecoin on
                  Ethereum
                </p>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Testing & Diagnostics Section */}
        <CollapsibleSection title="Testing & Diagnostics" icon="🧪">
          <div className="space-y-4">
            {/* Basic Transaction Tests */}
            <div>
              <h3 className="text-lg font-bold mb-3 text-[var(--foreground)]">
                Transaction Tests
              </h3>
              <p className="text-[var(--text-muted)] mb-3">
                Test different transaction types to verify Privy wallet
                functionality
              </p>
              <div className="flex gap-3 flex-wrap mb-3">
                <button
                  className="bg-[var(--text-secondary)] text-white px-4 py-2 rounded hover:bg-[var(--text-muted)] disabled:opacity-50 transition-colors"
                  onClick={handleTestBasicETHTransfer}
                  disabled={isLoading || !privyWallet}
                >
                  {isLoading
                    ? "Testing..."
                    : "Test ETH Transfer (0.001 ETH) - With Gas"}
                </button>
                <button
                  className="bg-[var(--text-secondary)] text-white px-4 py-2 rounded hover:bg-[var(--text-muted)] disabled:opacity-50 transition-colors"
                  onClick={handleTestBasicPYUSDTransfer}
                  disabled={isLoading || !privyWallet}
                >
                  {isLoading
                    ? "Testing..."
                    : "Test PYUSD Transfer (1 PYUSD) - With Gas"}
                </button>
                <button
                  className="bg-[var(--accent)] text-white px-4 py-2 rounded hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
                  onClick={handleTestGaslessPYUSDTransfer}
                  disabled={isLoading || !privyWallet || !signAuthorization}
                >
                  {isLoading
                    ? "Testing..."
                    : "Test PYUSD Transfer (1 PYUSD) - Gasless"}
                </button>
              </div>
              <div className="text-sm text-[var(--text-secondary)]">
                <p>
                  🔵 <strong>With Gas:</strong> Regular transactions where you
                  pay gas fees
                </p>
                <p>
                  🟢 <strong>Gasless:</strong> Uses EIP-7702 + Pimlico
                  sponsorship (no gas fees)
                </p>
                <p>
                  ✅ Test with gas first to verify basic Privy functionality
                </p>
                <p>
                  ✅ Test gasless to verify EIP-7702 and Pimlico integration
                </p>
              </div>
            </div>

            {/* Debug Information */}
            <div className="p-3 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg">
              <h4 className="font-bold mb-2 text-[var(--foreground)]">
                🔍 Debug Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="font-medium">Privy Ready:</span>
                    <span
                      className={
                        ready ? "text-[var(--success)]" : "text-[var(--error)]"
                      }
                    >
                      {ready ? "✅ Yes" : "❌ No"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Authenticated:</span>
                    <span
                      className={
                        authenticated
                          ? "text-[var(--success)]"
                          : "text-[var(--error)]"
                      }
                    >
                      {authenticated ? "✅ Yes" : "❌ No"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">EIP-7702 Support:</span>
                    <span
                      className={
                        !!signAuthorization
                          ? "text-[var(--success)]"
                          : "text-[var(--error)]"
                      }
                    >
                      {!!signAuthorization ? "✅ Yes" : "❌ No"}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="font-medium">Wallets Count:</span>
                    <span className="text-[var(--accent)]">
                      {wallets.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Network:</span>
                    <span className="text-[var(--accent)]">
                      {sepolia.name} (ID: {sepolia.id})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Wallet Address:</span>
                    <span className="text-[var(--warning)] font-mono text-xs">
                      {privyWallet?.address || "None"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Gasless Payment Status */}
            <div className="p-3 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg">
              <h4 className="font-bold mb-2 text-[var(--foreground)]">
                🚀 Gasless Payment Status
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-[var(--text-muted)]">
                      EIP-7702 Support:
                    </span>
                    <span
                      className={
                        !!signAuthorization
                          ? "text-[var(--success)]"
                          : "text-[var(--error)]"
                      }
                    >
                      {!!signAuthorization
                        ? "✅ Available"
                        : "❌ Not Available"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-[var(--text-muted)]">
                      Pimlico API Key:
                    </span>
                    <span
                      className={
                        process.env.NEXT_PUBLIC_PIMLICO_API_KEY
                          ? "text-[var(--success)]"
                          : "text-[var(--error)]"
                      }
                    >
                      {process.env.NEXT_PUBLIC_PIMLICO_API_KEY
                        ? "✅ Configured"
                        : "❌ Missing"}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-[var(--text-muted)]">
                      Sponsorship Policy:
                    </span>
                    <span
                      className={
                        process.env.NEXT_PUBLIC_SPONSORSHIP_POLICY_ID
                          ? "text-[var(--success)]"
                          : "text-[var(--error)]"
                      }
                    >
                      {process.env.NEXT_PUBLIC_SPONSORSHIP_POLICY_ID
                        ? "✅ Configured"
                        : "❌ Missing"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-[var(--text-muted)]">
                      Implementation:
                    </span>
                    <span className="text-[var(--accent)] font-mono text-xs">
                      {CONTRACTS.GASLESS_PAYMENT_ACCOUNT}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}
