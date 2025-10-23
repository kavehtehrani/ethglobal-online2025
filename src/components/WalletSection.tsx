"use client";

import { usePrivy, useWallets, useCreateWallet } from "@privy-io/react-auth";
import { getAddressLink } from "@/lib/explorer";
import Image from "next/image";

interface WalletSectionProps {
  onWalletCreated?: () => void;
  authenticated: boolean;
  privyWallet: any;
  ethBalance: string;
  pyusdBalance: string;
  balancesLoading: boolean;
  totalTransactions: number | null;
  tierStatus: any;
  fetchBalances: (address: `0x${string}`) => void;
}

export function WalletSection({
  onWalletCreated,
  authenticated,
  privyWallet,
  ethBalance,
  pyusdBalance,
  balancesLoading,
  totalTransactions,
  tierStatus,
  fetchBalances,
}: WalletSectionProps) {
  const { login, logout } = usePrivy();
  const { createWallet } = useCreateWallet();

  return (
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
            <span className="text-sm text-[var(--text-muted)]">Status:</span>
            <span
              className={`text-sm font-medium ${
                authenticated ? "text-[var(--success)]" : "text-[var(--error)]"
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
                      onWalletCreated?.();
                    } catch (error) {
                      console.error("Failed to create embedded wallet:", error);
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
              <div className="text-xs text-[var(--text-muted)] mb-1">ETH</div>
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
                <div className="text-xs text-[var(--text-muted)]">PYUSD</div>
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
  );
}
