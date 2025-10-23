"use client";

import { useState, useEffect } from "react";
import {
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

interface TierStatusProps {
  userAddress: `0x${string}`;
  tierStatus: {
    freeTransactionsRemaining: number;
    nextFreeTransaction: number;
    isFree: boolean;
  } | null;
  loading: boolean;
  error: string | null;
  onTransactionComplete?: () => void;
  // Add contract config for display
  contractConfig?: {
    freeTierLimit: number;
    freeTierRatio: number;
  } | null;
  // Add total transactions count
  totalTransactions?: number | null;
}

export function TierStatusComponent({
  tierStatus,
  loading,
  error,
  onTransactionComplete,
  contractConfig,
  totalTransactions,
}: TierStatusProps) {
  const [isServiceConfigExpanded, setIsServiceConfigExpanded] = useState(false);

  // Listen for transaction completion and refresh tier status
  useEffect(() => {
    if (onTransactionComplete) {
      // Add a small delay to ensure the transaction is confirmed on-chain
      const timeoutId = setTimeout(() => {
        onTransactionComplete();
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [onTransactionComplete]);

  if (loading) {
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
        <div className="flex items-center justify-center">
          <ArrowPathIcon className="h-5 w-5 animate-spin text-[var(--text-secondary)]" />
          <span className="ml-2 text-[var(--text-secondary)]">
            Loading tier status...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
        <div className="text-red-500 text-sm">
          Error loading tier status: {error}
        </div>
      </div>
    );
  }

  if (!tierStatus || totalTransactions === null) {
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
        <div className="text-[var(--text-secondary)] text-sm">
          {totalTransactions === null
            ? "Loading tier status..."
            : "No tier status available"}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div
            className={`w-3 h-3 rounded-full ${
              tierStatus.isFree ? "bg-green-500" : "bg-yellow-500"
            }`}
          />
          <div>
            <h3
              className={`font-semibold ${
                tierStatus.isFree
                  ? "text-gray-900 dark:text-green-400"
                  : "text-yellow-900 dark:text-yellow-400"
              }`}
            >
              {tierStatus.isFree
                ? "🆓 Free Transaction"
                : "💰 Paid Transaction"}
            </h3>
            <p
              className={`text-sm ${
                tierStatus.isFree
                  ? "text-gray-800 dark:text-green-400"
                  : "text-yellow-900 dark:text-yellow-400"
              }`}
            >
              {tierStatus.isFree
                ? tierStatus.freeTransactionsRemaining > 0
                  ? `${tierStatus.freeTransactionsRemaining} free transactions remaining`
                  : "This transaction is on us! 🎉"
                : `Next free transaction in ${tierStatus.nextFreeTransaction} transactions`}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsServiceConfigExpanded(!isServiceConfigExpanded)}
          className="text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
        >
          {isServiceConfigExpanded ? (
            <ChevronDownIcon className="h-5 w-5" />
          ) : (
            <ChevronRightIcon className="h-5 w-5" />
          )}
        </button>
      </div>

      {isServiceConfigExpanded && (
        <div className="mt-4 pt-4 border-t border-[var(--border)]">
          <div className="space-y-2 text-sm text-[var(--text-secondary)]">
            <div className="flex justify-between">
              <span>Total Transactions:</span>
              <span className="font-semibold text-[var(--foreground)]">
                {totalTransactions !== null && totalTransactions !== undefined
                  ? totalTransactions
                  : "Loading..."}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Free Tier Limit:</span>
              <span>
                {contractConfig?.freeTierLimit || "Loading..."} transactions
              </span>
            </div>
            <div className="flex justify-between">
              <span>Free Tier Ratio:</span>
              <span>
                1 in {contractConfig?.freeTierRatio || "Loading..."}{" "}
                transactions
              </span>
            </div>
            <div className="flex justify-between">
              <span>Current Status:</span>
              <span
                className={
                  tierStatus.isFree ? "text-green-500" : "text-yellow-500"
                }
              >
                {tierStatus.isFree ? "Free" : "Paid"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
