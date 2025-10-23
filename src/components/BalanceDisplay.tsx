"use client";

import Image from "next/image";

interface BalanceDisplayProps {
  ethBalance: string;
  pyusdBalance: string;
  balancesLoading: boolean;
  onRefresh: () => void;
}

export function BalanceDisplay({
  ethBalance,
  pyusdBalance,
  balancesLoading,
  onRefresh,
}: BalanceDisplayProps) {
  return (
    <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[var(--foreground)]">
          Balances
        </h3>
        <button
          onClick={onRefresh}
          disabled={balancesLoading}
          className="bg-[var(--accent)] text-white px-3 py-1 rounded text-xs hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {balancesLoading ? "Refreshing..." : "🔄 Refresh"}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {/* ETH Balance */}
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] p-2 rounded">
          <div className="text-xs text-[var(--text-muted)] mb-1">ETH</div>
          {balancesLoading ? (
            <div className="animate-pulse">
              <div className="h-4 bg-[var(--card-border)] rounded w-16"></div>
            </div>
          ) : (
            <div className="text-sm font-semibold text-[var(--foreground)]">
              {parseFloat(ethBalance).toFixed(4)}
            </div>
          )}
        </div>

        {/* PYUSD Balance */}
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] p-2 rounded">
          <div className="flex items-center gap-2 mb-1">
            <Image
              src="/pyusd.png"
              alt="PYUSD"
              width={16}
              height={16}
              className="rounded"
            />
            <div className="text-xs text-[var(--text-muted)]">PYUSD</div>
          </div>
          {balancesLoading ? (
            <div className="animate-pulse">
              <div className="h-4 bg-[var(--card-border)] rounded w-16"></div>
            </div>
          ) : (
            <div className="text-sm font-semibold text-[var(--foreground)]">
              {parseFloat(pyusdBalance).toFixed(2)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
