"use client";

import { sepolia } from "viem/chains";
import { CONTRACTS } from "@/lib/constants";
import { CollapsibleSection } from "./CollapsibleSection";

interface TestingSectionProps {
  isLoading: boolean;
  privyWallet:
    | {
        address: string;
      }
    | null
    | undefined;
  onTestBasicETHTransfer: () => void;
  onTestBasicPYUSDTransfer: () => void;
  ready: boolean;
  authenticated: boolean;
  signAuthorization: ((input: unknown) => Promise<unknown>) | null;
  wallets: Array<{
    address: string;
    walletClientType: string;
  }>;
}

export function TestingSection({
  isLoading,
  privyWallet,
  onTestBasicETHTransfer,
  onTestBasicPYUSDTransfer,
  ready,
  authenticated,
  signAuthorization,
  wallets,
}: TestingSectionProps) {
  return (
    <CollapsibleSection
      title="Testing & Diagnostics"
      icon="🧪"
      defaultOpen={false}
    >
      <div className="space-y-4 mt-2">
        {/* Basic Transaction Tests */}
        <div>
          <p className="text-[var(--text-muted)] mt-3 mb-3">
            Test different transaction types to verify Privy wallet
            functionality
          </p>
          <div className="flex gap-3 flex-wrap mb-3">
            <button
              className="bg-[var(--text-secondary)] text-white px-4 py-2 rounded hover:bg-[var(--text-muted)] disabled:opacity-50 transition-colors"
              onClick={onTestBasicETHTransfer}
              disabled={isLoading || !privyWallet}
            >
              {isLoading
                ? "Testing..."
                : "Test ETH Transfer (0.001 ETH) - With Gas"}
            </button>
            <button
              className="bg-[var(--text-secondary)] text-white px-4 py-2 rounded hover:bg-[var(--text-muted)] disabled:opacity-50 transition-colors"
              onClick={onTestBasicPYUSDTransfer}
              disabled={isLoading || !privyWallet}
            >
              {isLoading
                ? "Testing..."
                : "Test PYUSD Transfer (1 PYUSD) - With Gas"}
            </button>
          </div>
          <div className="text-sm text-[var(--text-secondary)]">
            <p>
              🔵 <strong>With Gas:</strong> Regular transactions where you pay
              gas fees
            </p>
            <p>✅ Test with gas first to verify basic Privy functionality</p>
            <p>💡 Use the main form above for gasless transactions</p>
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
                <span className="text-[var(--accent)]">{wallets.length}</span>
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
                  {!!signAuthorization ? "✅ Available" : "❌ Not Available"}
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
  );
}
