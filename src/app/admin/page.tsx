"use client";

import { useState, useEffect, useCallback } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { sepolia } from "viem/chains";
import { createPublicClient, createWalletClient, http, custom } from "viem";
import { CONTRACTS, RPC_ENDPOINTS } from "@/lib/constants";
import { getAddressLink } from "@/lib/explorer";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  ArrowTopRightOnSquareIcon,
  XCircleIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";

// Transaction Counter ABI for admin functions
const TRANSACTION_COUNTER_ADMIN_ABI = [
  {
    name: "owner",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
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
  {
    name: "updateFreeTierConfig",
    type: "function",
    inputs: [
      { name: "_freeTierLimit", type: "uint256" },
      { name: "_freeTierRatio", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export default function AdminPage() {
  const { authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();

  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [isCheckingOwner, setIsCheckingOwner] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<{
    limit: number;
    ratio: number;
  } | null>(null);
  const [newLimit, setNewLimit] = useState<string>("");
  const [newRatio, setNewRatio] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [lastTransactionHash, setLastTransactionHash] = useState<string | null>(
    null
  );

  const privyWallet = wallets.find(
    (wallet) =>
      wallet.walletClientType === "privy" ||
      wallet.walletClientType === "metamask"
  );

  // Check if current user is the contract owner
  const checkOwnerStatus = useCallback(async () => {
    if (!authenticated || !privyWallet?.address) {
      setIsOwner(false);
      return;
    }

    setIsCheckingOwner(true);
    try {
      const publicClient = createPublicClient({
        chain: sepolia,
        transport: http(RPC_ENDPOINTS.SEPOLIA),
      });

      const contractOwner = await publicClient.readContract({
        address: CONTRACTS.TRANSACTION_COUNTER,
        abi: TRANSACTION_COUNTER_ADMIN_ABI,
        functionName: "owner",
        args: [],
      });

      const isCurrentUserOwner =
        contractOwner.toLowerCase() === privyWallet.address.toLowerCase();

      setIsOwner(isCurrentUserOwner);
    } catch (error) {
      console.error("Error checking owner status:", error);
      setIsOwner(false);
    } finally {
      setIsCheckingOwner(false);
    }
  }, [authenticated, privyWallet?.address]);

  // Load current configuration
  const loadCurrentConfig = useCallback(async () => {
    if (!isOwner) return;

    setIsLoadingConfig(true);
    try {
      const publicClient = createPublicClient({
        chain: sepolia,
        transport: http(RPC_ENDPOINTS.SEPOLIA),
      });

      const config = await publicClient.readContract({
        address: CONTRACTS.TRANSACTION_COUNTER,
        abi: TRANSACTION_COUNTER_ADMIN_ABI,
        functionName: "getFreeTierConfig",
        args: [],
      });

      const limit = Number(config[0]);
      const ratio = Number(config[1]);

      setCurrentConfig({ limit, ratio });
      setNewLimit(limit.toString());
      setNewRatio(ratio.toString());

      setLastRefreshTime(new Date());
    } catch (error) {
      console.error("❌ Error loading current config:", error);
    } finally {
      setIsLoadingConfig(false);
    }
  }, [isOwner]);

  // Update configuration
  const updateConfig = async () => {
    if (!privyWallet || !isOwner) {
      return;
    }

    const limit = parseInt(newLimit);
    const ratio = parseInt(newRatio);

    if (isNaN(limit) || isNaN(ratio) || limit < 0 || ratio <= 0) {
      return;
    }

    setIsUpdating(true);
    try {
      const publicClient = createPublicClient({
        chain: sepolia,
        transport: http(RPC_ENDPOINTS.SEPOLIA),
      });

      // Create wallet client for signing using Privy wallet
      const walletClient = createWalletClient({
        account: privyWallet.address as `0x${string}`,
        chain: sepolia,
        transport: custom(await privyWallet.getEthereumProvider()),
      });

      // Prepare the transaction
      const { request } = await publicClient.simulateContract({
        address: CONTRACTS.TRANSACTION_COUNTER,
        abi: TRANSACTION_COUNTER_ADMIN_ABI,
        functionName: "updateFreeTierConfig",
        args: [BigInt(limit), BigInt(ratio)],
        account: privyWallet.address as `0x${string}`,
      });

      // Send the transaction
      const hash = await walletClient.writeContract(request);

      setLastTransactionHash(hash);

      // Wait for transaction to be mined
      await publicClient.waitForTransactionReceipt({ hash });

      // Reload the configuration
      await loadCurrentConfig();
    } catch (error) {
      console.error("❌ Error updating configuration:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Check owner status when component mounts or wallet changes
  useEffect(() => {
    if (authenticated && privyWallet?.address) {
      checkOwnerStatus();
    }
  }, [authenticated, privyWallet?.address, checkOwnerStatus]);

  // Load config when owner status is confirmed
  useEffect(() => {
    if (isOwner) {
      loadCurrentConfig();
    }
  }, [isOwner, loadCurrentConfig]);

  return (
    <div className="min-h-screen bg-[var(--background)] py-6">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex justify-between items-start mb-4">
            <div className="w-16 flex justify-start">
              <Link
                href="/"
                className="bg-[var(--text-secondary)] text-white px-3 py-1.5 rounded text-sm hover:bg-[var(--text-muted)] transition-colors flex items-center gap-1"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </Link>
            </div>
            <div className="flex-1 text-center">
              <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
                🛡️ Admin Dashboard
              </h1>
              <p className="text-[var(--text-secondary)] mt-1">
                Manage TransactionCounter contract parameters
              </p>
            </div>
            <div className="w-16 flex justify-end">
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Authentication Status */}
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
            <ShieldCheckIcon className="h-6 w-6 text-[var(--accent)]" />
            Authentication Status
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--foreground)]">
                Wallet Connected:
              </span>
              <span
                className={
                  authenticated && privyWallet
                    ? "text-[var(--success)]"
                    : "text-[var(--error)]"
                }
              >
                {authenticated && privyWallet ? "✅ Yes" : "❌ No"}
              </span>
            </div>

            {privyWallet && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--foreground)]">
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

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--foreground)]">
                Contract Owner:
              </span>
              {isCheckingOwner ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--accent)]"></div>
              ) : (
                <span
                  className={
                    isOwner === true
                      ? "text-[var(--success)]"
                      : isOwner === false
                      ? "text-[var(--error)]"
                      : "text-[var(--text-muted)]"
                  }
                >
                  {isOwner === true
                    ? "✅ You are the owner"
                    : isOwner === false
                    ? "❌ Not the owner"
                    : "Checking..."}
                </span>
              )}
            </div>
          </div>

          {!authenticated && (
            <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
              <button
                onClick={login}
                className="bg-[var(--accent)] text-white px-4 py-2 rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
              >
                Connect Wallet
              </button>
            </div>
          )}

          {authenticated && (
            <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
              <button
                onClick={logout}
                className="bg-[var(--text-secondary)] text-white px-4 py-2 rounded-lg hover:bg-[var(--text-muted)] transition-colors"
              >
                Disconnect Wallet
              </button>
            </div>
          )}
        </div>

        {/* Current Configuration */}
        {isOwner && (
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[var(--foreground)]">
                Current Configuration
              </h2>
              <div className="flex items-center gap-4">
                {lastRefreshTime && (
                  <div className="text-sm text-[var(--text-muted)]">
                    Last updated: {lastRefreshTime.toLocaleTimeString()}
                  </div>
                )}
                {lastTransactionHash && (
                  <div className="text-sm">
                    <a
                      href={`https://sepolia.etherscan.io/tx/${lastTransactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--accent)] hover:text-[var(--accent-hover)] underline inline-flex items-center gap-1"
                    >
                      Last TX: {lastTransactionHash.slice(0, 10)}...
                      <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
            {isLoadingConfig ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-[var(--card-border)] rounded w-3/4"></div>
                <div className="h-4 bg-[var(--card-border)] rounded w-1/2"></div>
              </div>
            ) : currentConfig ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[var(--background)] border border-[var(--card-border)] rounded-lg p-4">
                  <div className="text-sm font-medium text-[var(--foreground)] mb-2">
                    Free Tier Limit
                  </div>
                  <div className="text-2xl font-bold text-[var(--accent)]">
                    {currentConfig.limit} transactions
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1">
                    Number of free transactions users get
                  </div>
                </div>
                <div className="bg-[var(--background)] border border-[var(--card-border)] rounded-lg p-4">
                  <div className="text-sm font-medium text-[var(--foreground)] mb-2">
                    Free Tier Ratio
                  </div>
                  <div className="text-2xl font-bold text-[var(--accent)]">
                    1 in {currentConfig.ratio} transactions
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1">
                    After limit: 1 in every N transactions is free
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-[var(--error)] text-sm">
                Failed to load current configuration
              </div>
            )}

            {/* Debug Information */}
            <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
              <h3 className="text-sm font-medium text-[var(--foreground)] mb-2">
                🔍 Debug Information
              </h3>
              <div className="text-xs text-[var(--text-muted)] space-y-1">
                <div>Contract Address: {CONTRACTS.TRANSACTION_COUNTER}</div>
                <div>RPC Endpoint: {RPC_ENDPOINTS.SEPOLIA}</div>
                <div>
                  Chain: {sepolia.name} (ID: {sepolia.id})
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Update Configuration */}
        {isOwner && (
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
              <Cog6ToothIcon className="h-6 w-6 text-[var(--accent)]" />
              Update Configuration
            </h2>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Free Tier Limit
                  </label>
                  <input
                    type="number"
                    value={newLimit}
                    onChange={(e) => setNewLimit(e.target.value)}
                    placeholder="Enter limit (e.g., 5)"
                    min="0"
                    className="w-full px-3 py-2 border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--foreground)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
                  />
                  <div className="text-xs text-[var(--text-secondary)] mt-1">
                    Number of free transactions users get
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Free Tier Ratio
                  </label>
                  <input
                    type="number"
                    value={newRatio}
                    onChange={(e) => setNewRatio(e.target.value)}
                    placeholder="Enter ratio (e.g., 5)"
                    min="1"
                    className="w-full px-3 py-2 border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--foreground)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]"
                  />
                  <div className="text-xs text-[var(--text-secondary)] mt-1">
                    After limit: 1 in every N transactions is free
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={updateConfig}
                  disabled={isUpdating || !newLimit || !newRatio}
                  className="bg-[var(--accent)] text-white px-6 py-3 rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <Cog6ToothIcon className="h-4 w-4" />
                  {isUpdating ? "Updating..." : "Update Configuration"}
                </button>

                <button
                  onClick={() => {
                    loadCurrentConfig();
                  }}
                  disabled={isLoadingConfig}
                  className="bg-[var(--text-secondary)] text-white px-4 py-3 rounded-lg hover:bg-[var(--text-muted)] disabled:opacity-50 transition-colors"
                >
                  {isLoadingConfig ? "Loading..." : "🔄 Force Refresh"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Access Denied */}
        {isOwner === false && (
          <div className="bg-[var(--card-bg)] border border-[var(--error)] rounded-lg p-6">
            <div className="flex items-center gap-3">
              <XCircleIcon className="h-8 w-8 text-[var(--error)]" />
              <div>
                <h3 className="text-lg font-semibold text-[var(--error)]">
                  Access Denied
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Only the contract owner can access this admin dashboard.
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  If you believe this is an error, please check that you are
                  connected with the correct wallet.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Not Authenticated */}
        {!authenticated && (
          <div className="bg-[var(--card-bg)] border border-[var(--warning)] rounded-lg p-6">
            <div className="flex items-center gap-3">
              <ShieldCheckIcon className="h-8 w-8 text-[var(--warning)]" />
              <div>
                <h3 className="text-lg font-semibold text-[var(--warning)]">
                  Authentication Required
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Please connect your wallet to access the admin dashboard.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
