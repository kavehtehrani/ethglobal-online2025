"use client";

import { getTransactionLink, getAddressLink } from "@/lib/explorer";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";

interface TransactionStatusProps {
  transactionStatus: {
    isProcessing: boolean;
    type: string;
    message: string;
    error: string | null;
  };
  lastTransaction: {
    hash: string;
    type: string;
    amount: string;
    token: string;
    to: string;
  } | null;
}

export function TransactionStatus({
  transactionStatus,
  lastTransaction,
}: TransactionStatusProps) {
  // Don't render if no transaction status or history
  if (
    !transactionStatus.isProcessing &&
    !transactionStatus.error &&
    !transactionStatus.message &&
    !lastTransaction
  ) {
    return null;
  }

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg mb-6">
      <div className="bg-[var(--accent)]/10 p-4 rounded-t-lg">
        <h2 className="text-xl font-bold text-[var(--foreground)]">
          📊 Transaction Status
        </h2>
      </div>
      <div className="p-4">
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
                <p className="text-[var(--error)]">{transactionStatus.error}</p>
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
                  className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-mono text-sm underline transition-colors inline-flex items-center gap-1 max-w-[60%] sm:max-w-none"
                >
                  <span className="truncate">
                    {lastTransaction.to.slice(0, 6)}...
                    {lastTransaction.to.slice(-4)}
                  </span>
                  <ArrowTopRightOnSquareIcon className="h-3 w-3 flex-shrink-0" />
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
                  className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-mono text-sm underline inline-flex items-center gap-1 max-w-[60%] sm:max-w-none"
                >
                  <span className="truncate">
                    {lastTransaction.hash.slice(0, 10)}...
                    {lastTransaction.hash.slice(-8)}
                  </span>
                  <ArrowTopRightOnSquareIcon className="h-3 w-3 flex-shrink-0" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
