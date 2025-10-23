"use client";

import { usePrivy, useWallets, useCreateWallet } from "@privy-io/react-auth";
import { getAddressLink } from "@/lib/explorer";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { notification } from "@/lib/notifications";

interface AuthenticationSectionProps {
  onWalletCreated?: () => void;
}

export function AuthenticationSection({
  onWalletCreated,
}: AuthenticationSectionProps) {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();

  // Get the embedded wallet or any Privy wallet
  const privyWallet = wallets.find(
    (wallet) =>
      wallet.walletClientType === "privy" ||
      wallet.walletClientType === "metamask"
  );

  const handleCreateEmbeddedWallet = async () => {
    try {
      await createWallet();
      notification.success("Embedded wallet created successfully!");
      onWalletCreated?.();
    } catch (error) {
      console.error("❌ Failed to create embedded wallet:", error);
      notification.error(
        `Failed to create embedded wallet: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  return (
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
  );
}
