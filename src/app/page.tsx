"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import {
  usePrivy,
  useSign7702Authorization,
  useWallets,
} from "@privy-io/react-auth";
import { sepolia } from "viem/chains";
import { createPublicClient, http, formatUnits } from "viem";
import { CONTRACTS, RPC_ENDPOINTS, DEFAULT_TEST_VALUES } from "@/lib/constants";
import { executePrivyGaslessPayment } from "@/lib/privyGaslessPayment";
import {
  testBasicPrivyTransaction,
  testBasicPYUSDTransfer,
} from "@/lib/basicPrivyTest";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TransactionStatus } from "@/components/TransactionStatus";
import { GaslessPaymentForm } from "@/components/GaslessPaymentForm";
import { PaymentLinkGenerator } from "@/components/PaymentLinkGenerator";
import { TestingSection } from "@/components/TestingSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { isAddress } from "viem";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

// Transaction Counter ABI
const TRANSACTION_COUNTER_ABI = [
  {
    name: "getCount",
    type: "function",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "count", type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "getFreeTierConfig",
    type: "function",
    inputs: [],
    outputs: [
      { name: "limit", type: "uint256" },
      { name: "ratio", type: "uint256" },
    ],
    stateMutability: "view",
  },
] as const;

// Component that uses useSearchParams - needs Suspense boundary
function HomeContent() {
  const { ready, authenticated, sendTransaction, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { signAuthorization } = useSign7702Authorization();
  const searchParams = useSearchParams();

  const [recipient, setRecipient] = useState<`0x${string}` | "">(
    DEFAULT_TEST_VALUES.RECIPIENT_ADDRESS
  );
  const [amount, setAmount] = useState<string>(
    DEFAULT_TEST_VALUES.AMOUNT_PYUSD
  );
  const [isFreeTransaction, setIsFreeTransaction] = useState<boolean | null>(
    null
  );
  const [tierStatus, setTierStatus] = useState<{
    freeTransactionsRemaining: number;
    nextFreeTransaction: number;
    isFree: boolean;
  } | null>(null);
  const [contractConfig, setContractConfig] = useState<{
    freeTierLimit: number;
    freeTierRatio: number;
  } | null>(null);
  const [totalTransactions, setTotalTransactions] = useState<number | null>(
    null
  );
  const [transactionCompleted, setTransactionCompleted] = useState<number>(0);
  const lastTierCheckTimeRef = useRef<number>(0);
  const isCheckingTierRef = useRef<boolean>(false);

  // Function to trigger tier status refresh after transaction completion
  const triggerTierStatusRefresh = useCallback(() => {
    setTransactionCompleted((prev) => prev + 1);
  }, []); // Empty dependency array - this function never changes

  // Get any Privy wallet
  const privyWallet = wallets.find(
    (wallet) =>
      wallet.walletClientType === "privy" ||
      wallet.walletClientType === "metamask"
  );

  // Function to check free tier status with rate limiting
  const checkFreeTierStatus = useCallback(
    async (userAddress: `0x${string}`) => {
      const now = Date.now();
      const timeSinceLastCheck = now - lastTierCheckTimeRef.current;

      // Rate limit: only allow one request per 1 second
      if (timeSinceLastCheck < 1000) {
        return;
      }

      // Prevent concurrent checks
      if (isCheckingTierRef.current) {
        return;
      }

      try {
        isCheckingTierRef.current = true;
        lastTierCheckTimeRef.current = now;

        const publicClient = createPublicClient({
          chain: sepolia,
          transport: http(RPC_ENDPOINTS.SEPOLIA),
        });

        const [userCount, tierConfig] = await Promise.all([
          publicClient.readContract({
            address: CONTRACTS.TRANSACTION_COUNTER,
            abi: TRANSACTION_COUNTER_ABI,
            functionName: "getCount",
            args: [userAddress],
          }),
          publicClient.readContract({
            address: CONTRACTS.TRANSACTION_COUNTER,
            abi: TRANSACTION_COUNTER_ABI,
            functionName: "getFreeTierConfig",
            args: [],
          }),
        ]);

        const totalTransactions = Number(userCount);
        const freeTierLimit = Number(tierConfig[0]);
        const freeTierRatio = Number(tierConfig[1]);

        // Update contract config for display
        setContractConfig({
          freeTierLimit,
          freeTierRatio,
        });

        // Calculate detailed tier status
        let isFree = false;
        let freeTransactionsRemaining = 0;
        let nextFreeTransaction = 1;

        if (totalTransactions < freeTierLimit) {
          // Still in the initial free tier
          isFree = true;
          freeTransactionsRemaining = freeTierLimit - totalTransactions;
          nextFreeTransaction = 1;
        } else {
          // Past the initial free tier, now in "1 in X" system
          const transactionsAfterLimit = totalTransactions - freeTierLimit;

          // Check if the NEXT transaction (totalTransactions + 1) would be free
          // In "1 in X" system: next transaction is free when (transactionsAfterLimit + 1) % freeTierRatio === 0
          const nextTransactionAfterLimit = transactionsAfterLimit + 1;
          isFree = nextTransactionAfterLimit % freeTierRatio === 0;
          freeTransactionsRemaining = 0;

          // Calculate next free transaction
          if (isFree) {
            // Next transaction is free, so next free after that is in freeTierRatio transactions
            nextFreeTransaction = freeTierRatio;
          } else {
            // Next transaction is paid, calculate when the next free will be
            const remainderForNext = nextTransactionAfterLimit % freeTierRatio;
            nextFreeTransaction = freeTierRatio - remainderForNext;
          }
        }

        setIsFreeTransaction(isFree);
        setTierStatus({
          freeTransactionsRemaining,
          nextFreeTransaction,
          isFree,
        });
        setTotalTransactions(totalTransactions);
      } catch {
        setIsFreeTransaction(null);
        setTierStatus(null);
      } finally {
        isCheckingTierRef.current = false;
      }
    },
    []
  ); // Empty dependency array - using ref for timing

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

  // Check free tier status when wallet address changes
  useEffect(() => {
    const currentWalletAddress = wallets.length > 0 ? wallets[0].address : null;

    // Check tier status when authenticated and wallet is available
    if (authenticated && currentWalletAddress) {
      checkFreeTierStatus(currentWalletAddress as `0x${string}`);
    } else if (!authenticated || !currentWalletAddress) {
      setIsFreeTransaction(null);
      setTierStatus(null);
      setTotalTransactions(null);
    }
  }, [authenticated, checkFreeTierStatus, wallets, totalTransactions]);

  // Refresh free tier status after transaction completion
  useEffect(() => {
    if (transactionCompleted > 0) {
      const currentWalletAddress =
        wallets.length > 0 ? wallets[0].address : null;

      if (authenticated && currentWalletAddress) {
        checkFreeTierStatus(currentWalletAddress as `0x${string}`);
      }
    }
  }, [transactionCompleted, authenticated, checkFreeTierStatus, wallets]);

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

  // Note: We don't need to set active wallet since we're using Privy's native wallet directly

  // Function to fetch balances (RE-ENABLED)
  const fetchBalances = useCallback(async (address: `0x${string}`) => {
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
    } catch {
      setEthBalance("0");
      setPyusdBalance("0");
    } finally {
      setBalancesLoading(false);
    }
  }, []); // Empty dependency array - function doesn't depend on any props/state

  // Fetch balances when wallet address changes
  useEffect(() => {
    if (privyWallet?.address) {
      fetchBalances(privyWallet.address as `0x${string}`);
    }
  }, [privyWallet?.address, fetchBalances]);

  // Use Privy wallet address if available
  // const walletAddress = privyWallet?.address;

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

    // Validate recipient address
    if (!recipient || !isAddress(recipient)) {
      setTransactionStatus({
        isProcessing: false,
        type: "",
        message: "",
        error: "Please enter a valid recipient address",
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
        privySendTransaction: async (tx: {
          to: `0x${string}`;
          value?: bigint;
          data?: `0x${string}`;
          chainId: number;
        }) => {
          const result = await sendTransaction(tx);
          return result.hash;
        },
        walletAddress: privyWallet.address as `0x${string}`,
        recipientAddress: recipient as `0x${string}`,
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
        // Refresh balances after successful transaction
        if (privyWallet?.address) {
          fetchBalances(privyWallet.address as `0x${string}`);
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setTransactionStatus({
        isProcessing: false,
        type: "Basic ETH Transfer",
        message: "",
        error: `Transfer failed: ${errorMessage}`,
      });
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

    // Validate recipient address
    if (!recipient || !isAddress(recipient)) {
      setTransactionStatus({
        isProcessing: false,
        type: "",
        message: "",
        error: "Please enter a valid recipient address",
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
        privySendTransaction: async (tx: {
          to: `0x${string}`;
          value?: bigint;
          data?: `0x${string}`;
          chainId: number;
        }) => {
          const result = await sendTransaction(tx);
          return result.hash;
        },
        walletAddress: privyWallet.address as `0x${string}`,
        recipientAddress: recipient as `0x${string}`,
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
        // Refresh balances after successful transaction
        if (privyWallet?.address) {
          fetchBalances(privyWallet.address as `0x${string}`);
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setTransactionStatus({
        isProcessing: false,
        type: "Basic PYUSD Transfer",
        message: "",
        error: `Transfer failed: ${errorMessage}`,
      });
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
        recipientAddress: recipient as `0x${string}`,
        amount: amount,
        privyWallet: privyWallet as {
          address: `0x${string}`;
          getEthereumProvider: () => Promise<unknown>;
        },
        signAuthorization: async (auth) => {
          return await signAuthorization({
            contractAddress: auth.contractAddress as `0x${string}`,
            chainId: auth.chainId,
            nonce: auth.nonce,
          });
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

        // Refresh balances after successful payment
        if (privyWallet?.address) {
          fetchBalances(privyWallet.address as `0x${string}`);
        }
        // Trigger tier status refresh
        triggerTierStatusRefresh();
      } else {
        setTransactionStatus({
          isProcessing: false,
          type: "Gasless PYUSD Payment",
          message: "",
          error: "Payment failed",
        });
      }
    } catch (error) {
      setTransactionStatus({
        isProcessing: false,
        type: "Gasless PYUSD Payment",
        message: "",
        error: error instanceof Error ? error.message : "Payment failed",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] py-6">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-6">
          <div className="flex justify-between items-start mb-4">
            <div className="w-16"></div>
            <div className="flex-1 text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Image
                  src="/pyusd.png"
                  alt="PYUSD Logo"
                  width={40}
                  height={40}
                  className="rounded-lg"
                />
                <h1 className="text-3xl font-bold text-[var(--foreground)]">
                  Gasless PYUSD Payments
                </h1>
              </div>
              <p className="text-[var(--text-secondary)] mt-1">
                Send PYUSD on Sepolia without paying gas fees!
              </p>
            </div>
            <div className="w-16 flex justify-end">
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Authentication & Balances - Side by Side Layout */}
        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          {/* Left Side - Authentication Section */}
          <div className="flex-1 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4">
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
              <span className="text-xl">🔐</span>
              Authentication
            </h3>

            {/* Authentication Status */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-muted)]">
                  Status:
                </span>
                <span
                  className={`text-sm font-medium ${
                    authenticated
                      ? "text-[var(--success)]"
                      : "text-[var(--error)]"
                  }`}
                >
                  {authenticated ? "✅ Connected" : "❌ Not Connected"}
                </span>
              </div>

              {authenticated && privyWallet && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-muted)]">
                      Address:
                    </span>
                    <a
                      href={`https://sepolia.etherscan.io/address/${privyWallet.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-mono text-sm underline transition-colors"
                    >
                      {privyWallet.address.slice(0, 6)}...
                      {privyWallet.address.slice(-4)}
                    </a>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-muted)]">
                      Network:
                    </span>
                    <span className="text-sm text-[var(--foreground)]">
                      Sepolia Testnet
                    </span>
                  </div>
                  {totalTransactions !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-muted)]">
                        Total Transactions:
                      </span>
                      <span className="text-sm font-bold text-[var(--accent)]">
                        {totalTransactions}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Authentication Buttons */}
            <div className="pt-3 border-t border-[var(--card-border)]">
              {!authenticated ? (
                <button
                  onClick={login}
                  className="w-full bg-[var(--accent)] text-white px-4 py-2 rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
                >
                  Connect Wallet
                </button>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={logout}
                    className="w-full bg-[var(--text-secondary)] text-white px-4 py-2 rounded-lg hover:bg-[var(--text-muted)] transition-colors"
                  >
                    Disconnect Wallet
                  </button>
                  {!privyWallet && (
                    <button
                      onClick={async () => {
                        try {
                          await createWallet();
                          if (privyWallet?.address) {
                            fetchBalances(privyWallet.address as `0x${string}`);
                          }
                        } catch (error) {
                          console.error(
                            "Failed to create embedded wallet:",
                            error
                          );
                        }
                      }}
                      className="w-full bg-[var(--accent)] text-white px-4 py-2 rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
                    >
                      Create Embedded Wallet
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Balances (Only show when authenticated) */}
          {authenticated && privyWallet && (
            <div className="flex-1 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-[var(--foreground)] flex items-center gap-2">
                  <span className="text-xl">💰</span>
                  Balances
                </h3>
                <button
                  onClick={() =>
                    fetchBalances(privyWallet.address as `0x${string}`)
                  }
                  disabled={balancesLoading}
                  className="text-[var(--accent)] hover:text-[var(--accent-hover)] text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {balancesLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>
              <div className="flex gap-3">
                {/* ETH Balance */}
                <div className="flex-1 bg-[var(--background)] border border-[var(--card-border)] p-3 rounded">
                  <div className="text-xs text-[var(--text-muted)] mb-1">
                    ETH
                  </div>
                  {balancesLoading ? (
                    <div className="animate-pulse">
                      <div className="h-4 bg-[var(--card-border)] rounded w-16"></div>
                    </div>
                  ) : (
                    <div className="text-lg font-bold text-[var(--foreground)]">
                      {parseFloat(ethBalance).toFixed(4)}
                    </div>
                  )}
                </div>

                {/* PYUSD Balance */}
                <div className="flex-1 bg-[var(--background)] border border-[var(--card-border)] p-3 rounded">
                  <div className="flex items-center gap-2 mb-1">
                    <Image
                      src="/pyusd.png"
                      alt="PYUSD"
                      width={16}
                      height={16}
                      className="rounded"
                    />
                    <div className="text-xs text-[var(--text-muted)]">
                      PYUSD
                    </div>
                  </div>
                  {balancesLoading ? (
                    <div className="animate-pulse">
                      <div className="h-4 bg-[var(--card-border)] rounded w-16"></div>
                    </div>
                  ) : (
                    <div className="text-lg font-bold text-[var(--foreground)]">
                      {parseFloat(pyusdBalance).toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Transaction Status */}
        <TransactionStatus
          transactionStatus={transactionStatus}
          lastTransaction={lastTransaction}
        />

        {/* Gasless Payment Form */}
        <GaslessPaymentForm
          recipient={recipient}
          setRecipient={setRecipient}
          amount={amount}
          setAmount={setAmount}
          isLoading={isLoading}
          authenticated={authenticated}
          onGaslessPayment={handleGaslessPayment}
          isFreeTransaction={isFreeTransaction}
          tierStatus={tierStatus}
          contractConfig={contractConfig}
          onTransactionComplete={triggerTierStatusRefresh}
          onTierStatusRefresh={() => {
            lastTierCheckTimeRef.current = 0; // Reset rate limit
            triggerTierStatusRefresh();
          }}
          lastTierCheckTime={lastTierCheckTimeRef.current}
          userAddress={
            (privyWallet?.address as `0x${string}`) || ("" as `0x${string}`)
          }
          totalTransactions={totalTransactions}
        />

        {/* Payment Link Generator */}
        <PaymentLinkGenerator />

        {/* How It Works Section */}
        <HowItWorksSection />

        {/* Testing Section */}
        <TestingSection
          isLoading={isLoading}
          privyWallet={privyWallet}
          onTestBasicETHTransfer={handleTestBasicETHTransfer}
          onTestBasicPYUSDTransfer={handleTestBasicPYUSDTransfer}
          ready={ready}
          authenticated={authenticated}
          signAuthorization={
            signAuthorization as (input: unknown) => Promise<unknown>
          }
          wallets={wallets}
        />
      </div>
    </div>
  );
}

// Main component with Suspense boundary for useSearchParams
export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--background)] py-6">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)] mx-auto"></div>
              <p className="mt-4 text-[var(--text-secondary)]">Loading...</p>
            </div>
          </div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
