"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { CONTRACTS, RPC_ENDPOINTS } from "@/lib/constants";

interface TierStatusProps {
  userAddress: `0x${string}`;
}

interface TierStatus {
  freeTransactionsRemaining: number;
  nextFreeTransaction: number;
  isFree: boolean;
}

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

export function TierStatusComponent({ userAddress }: TierStatusProps) {
  const [tierStatus, setTierStatus] = useState<TierStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isServiceConfigExpanded, setIsServiceConfigExpanded] = useState(false);

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(RPC_ENDPOINTS.SEPOLIA),
  });

  const fetchTierStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

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

      // Debug logging for tier status calculation
      console.log("🔍 DEBUG - TierStatus calculation:");
      console.log("  - totalTransactions:", totalTransactions);
      console.log("  - freeTierLimit:", freeTierLimit);
      console.log("  - freeTierRatio:", freeTierRatio);

      // Calculate tier status off-chain
      let isFree = false;
      let freeTransactionsRemaining = 0;
      let nextFreeTransaction = 1;

      if (totalTransactions < freeTierLimit) {
        isFree = true;
        freeTransactionsRemaining = freeTierLimit - totalTransactions;
        nextFreeTransaction = 1;
        console.log("  - Status: Within free tier limit");
        console.log("  - isFree: true");
        console.log(
          "  - freeTransactionsRemaining:",
          freeTransactionsRemaining
        );
      } else {
        const transactionsAfterLimit = totalTransactions - freeTierLimit;
        const remainder = transactionsAfterLimit % freeTierRatio;
        isFree = remainder === 0;
        freeTransactionsRemaining = 0;
        nextFreeTransaction = remainder === 0 ? 1 : freeTierRatio - remainder;
        console.log("  - transactionsAfterLimit:", transactionsAfterLimit);
        console.log("  - remainder:", remainder);
        console.log("  - isFree:", isFree);
        console.log("  - nextFreeTransaction:", nextFreeTransaction);
        console.log("  - Status:", isFree ? "Free (1 in N)" : "Paid");
      }

      setTierStatus({
        freeTransactionsRemaining,
        nextFreeTransaction,
        isFree,
      });
    } catch (err) {
      console.error("Error fetching tier status:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch tier status"
      );
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  useEffect(() => {
    if (userAddress) {
      fetchTierStatus();
    }
  }, [userAddress, fetchTierStatus]);

  if (loading) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-[var(--foreground)]">
            🎯 Your Tier Status
          </h2>
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--accent)]"></div>
        </div>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-[var(--card-border)] rounded w-3/4"></div>
          <div className="h-4 bg-[var(--card-border)] rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-[var(--foreground)]">
            🎯 Your Tier Status
          </h2>
          <button
            onClick={fetchTierStatus}
            className="bg-[var(--accent)] text-white px-3 py-1 rounded text-sm hover:bg-[var(--accent-hover)] transition-colors"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="text-[var(--error)] text-sm">Error: {error}</div>
      </div>
    );
  }

  if (!tierStatus) {
    return null;
  }

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold text-[var(--foreground)]">
          🎯 Your Tier Status
        </h2>
        <button
          onClick={fetchTierStatus}
          className="bg-[var(--accent)] text-white px-3 py-1 rounded text-sm hover:bg-[var(--accent-hover)] transition-colors"
        >
          <ArrowPathIcon className="h-4 w-4" />
        </button>
      </div>

      <div
        className={`p-3 rounded-lg border ${
          tierStatus.isFree
            ? "border-[var(--success)] bg-green-50 dark:bg-green-900/20"
            : "border-[var(--warning)] bg-yellow-50 dark:bg-yellow-900/20"
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <h3
            className={`font-semibold ${
              tierStatus.isFree
                ? "text-green-700 dark:text-green-400"
                : "text-yellow-700 dark:text-yellow-400"
            }`}
          >
            {tierStatus.isFree ? "🆓 Free Transaction" : "💰 Paid Transaction"}
          </h3>
        </div>
        <p
          className={`text-sm ${
            tierStatus.isFree
              ? "text-green-700 dark:text-green-400"
              : "text-yellow-700 dark:text-yellow-400"
          }`}
        >
          {tierStatus.freeTransactionsRemaining > 0
            ? `${tierStatus.freeTransactionsRemaining} free transactions remaining`
            : `Next free transaction in ${tierStatus.nextFreeTransaction} transactions`}
        </p>
      </div>

      {/* Service Configuration Display */}
      <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
        <button
          onClick={() => setIsServiceConfigExpanded(!isServiceConfigExpanded)}
          className="flex items-center justify-between w-full text-left hover:bg-[var(--card-bg)] rounded p-1 -m-1 transition-colors"
        >
          <h4 className="text-sm font-medium text-[var(--foreground)]">
            Service Configuration
          </h4>
          {isServiceConfigExpanded ? (
            <ChevronDownIcon className="h-4 w-4 text-[var(--text-secondary)]" />
          ) : (
            <ChevronRightIcon className="h-4 w-4 text-[var(--text-secondary)]" />
          )}
        </button>

        {isServiceConfigExpanded && (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-xs text-[var(--text-secondary)]">
              <div className="flex justify-between">
                <span>Service Fee:</span>
                <span className="font-mono">0.5%</span>
              </div>
              <div className="flex justify-between">
                <span>Min Fee:</span>
                <span className="font-mono">0.01 PYUSD</span>
              </div>
              <div className="flex justify-between">
                <span>Max Fee:</span>
                <span className="font-mono">10 PYUSD</span>
              </div>
              <div className="flex justify-between">
                <span>Transaction Type:</span>
                <span className="font-mono">
                  {tierStatus.isFree ? "Single Transfer" : "Batch Transfer"}
                </span>
              </div>
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              💡{" "}
              {tierStatus.isFree
                ? "Free transactions send only the amount to recipient"
                : "Paid transactions send amount to recipient + fee to service"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
