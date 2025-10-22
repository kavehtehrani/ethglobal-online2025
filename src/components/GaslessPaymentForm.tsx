"use client";

import { useState } from "react";
import { isAddress } from "viem";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { TierStatusComponent } from "./TierStatus";

interface GaslessPaymentFormProps {
  recipient: `0x${string}` | "";
  setRecipient: (recipient: `0x${string}` | "") => void;
  amount: string;
  setAmount: (amount: string) => void;
  isLoading: boolean;
  authenticated: boolean;
  onGaslessPayment: () => void;
  isFreeTransaction: boolean | null;
  tierStatus: {
    freeTransactionsRemaining: number;
    nextFreeTransaction: number;
    isFree: boolean;
  } | null;
  contractConfig: {
    freeTierLimit: number;
    freeTierRatio: number;
  } | null;
  onTransactionComplete: () => void;
  onTierStatusRefresh: () => void;
  lastTierCheckTime: number;
  userAddress: `0x${string}`;
  totalTransactions: number | null;
}

export function GaslessPaymentForm({
  recipient,
  setRecipient,
  amount,
  setAmount,
  isLoading,
  authenticated,
  onGaslessPayment,
  isFreeTransaction,
  tierStatus,
  contractConfig,
  onTransactionComplete,
  onTierStatusRefresh,
  lastTierCheckTime,
  userAddress,
  totalTransactions,
}: GaslessPaymentFormProps) {
  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg mb-6">
      <div className="bg-[var(--accent)]/10 p-4 rounded-t-lg">
        <h2 className="text-xl font-bold text-[var(--foreground)]">
          Send PYUSD (Gasless)
        </h2>
      </div>

      <div className="p-4">
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
              onClick={onGaslessPayment}
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
                onClick={onGaslessPayment}
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

        {/* Transaction Breakdown */}
        {amount && recipient && isAddress(recipient) && (
          <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
            <h3 className="text-sm font-medium text-[var(--foreground)] mb-3">
              📊 Transaction Breakdown
            </h3>
            <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--text-secondary)]">
                  Transfer to recipient:
                </span>
                <span className="text-sm font-mono text-[var(--foreground)]">
                  {amount} PYUSD
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--text-secondary)]">
                  Service fee (0.5%):
                </span>
                <div className="flex items-center gap-2">
                  {isFreeTransaction === true ? (
                    <>
                      <span className="text-sm font-mono text-[var(--text-secondary)] line-through">
                        {amount
                          ? (parseFloat(amount) * 0.005).toFixed(6)
                          : "0.000000"}{" "}
                        PYUSD
                      </span>
                      <span className="text-sm font-mono font-bold text-green-600 dark:text-green-400">
                        FREE
                      </span>
                    </>
                  ) : (
                    <span className="text-sm font-mono text-[var(--foreground)]">
                      {amount
                        ? (parseFloat(amount) * 0.005).toFixed(6)
                        : "0.000000"}{" "}
                      PYUSD
                    </span>
                  )}
                </div>
              </div>
              <div className="border-t border-[var(--card-border)] pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    Total amount needed:
                  </span>
                  <span className="text-sm font-mono font-medium text-[var(--accent)]">
                    {isFreeTransaction === true
                      ? `${amount} PYUSD`
                      : amount
                      ? (parseFloat(amount) * 1.005).toFixed(6)
                      : "0.000000"}{" "}
                    PYUSD
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tier Status - At bottom of Send PYUSD section */}
      {authenticated && (
        <div className="p-4 border-t border-[var(--card-border)]">
          <div className="space-y-3">
            <TierStatusComponent
              userAddress={userAddress}
              tierStatus={tierStatus}
              loading={false}
              error={null}
              onTransactionComplete={onTransactionComplete}
              contractConfig={contractConfig}
              totalTransactions={totalTransactions}
            />

            {/* Manual refresh button for debugging */}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--card-border)]">
              <div className="text-xs text-[var(--text-muted)]">
                Last checked:{" "}
                {lastTierCheckTime
                  ? new Date(lastTierCheckTime).toLocaleTimeString()
                  : "Never"}
              </div>
              <button
                onClick={() => {
                  console.log("🔄 Manual tier status refresh requested");
                  onTierStatusRefresh();
                }}
                className="bg-[var(--accent)] text-white px-3 py-1 rounded text-xs hover:bg-[var(--accent-hover)] transition-colors"
              >
                🔄 Force Refresh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
