"use client";

import { CollapsibleSection } from "./CollapsibleSection";

export function HowItWorksSection() {
  return (
    <CollapsibleSection title="How does this work?" icon="❓">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold mb-3 text-[var(--foreground)]">
            Gasless PYUSD Payments Explained: Smart Contract + EIP-7702 +
            Pimlico + Privy
          </h3>
          <div className="space-y-3 text-sm text-[var(--text-muted)]">
            <div className="flex items-start gap-2">
              <span className="text-[var(--accent)]">✅</span>
              <div>
                <strong className="text-[var(--foreground)]">
                  Smart Contract Fee System:
                </strong>{" "}
                Our deployed contract handles tiered fees automatically - 5 free
                transactions, then 1 in 5 free, with service fees for paid
                transactions.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[var(--accent)]">✅</span>
              <div>
                <strong className="text-[var(--foreground)]">
                  EIP-7702 Smart Account:
                </strong>{" "}
                Your regular wallet (EOA) temporarily acts as a smart account,
                enabling advanced features without changing your wallet address.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[var(--accent)]">✅</span>
              <div>
                <strong className="text-[var(--foreground)]">
                  Pimlico Gas Sponsorship:
                </strong>{" "}
                Pimlico pays all gas fees for your transactions, so you
                don&apos;t need any ETH for gas.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[var(--accent)]">✅</span>
              <div>
                <strong className="text-[var(--foreground)]">
                  Real PYUSD on Sepolia:
                </strong>{" "}
                These are actual PYUSD token transfers on the Sepolia testnet,
                not simulations.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[var(--accent)]">🔧</span>
              <div>
                <strong className="text-[var(--foreground)]">
                  Secure Embedded Wallet:
                </strong>{" "}
                Privy&apos;s embedded wallet provides native EIP-7702 support
                with enterprise-grade security.
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg">
          <h4 className="font-bold mb-2 text-[var(--foreground)]">
            🚀 Technical Details
          </h4>
          <div className="text-sm text-[var(--text-muted)] space-y-2">
            <p>
              <strong>GaslessPaymentAccount:</strong> Our deployed smart
              contract that handles tiered fee logic, transaction tracking, and
              automatic fee collection
            </p>
            <p>
              <strong>EIP-7702:</strong> Ethereum Improvement Proposal that
              allows EOAs to delegate execution to smart contracts
            </p>
            <p>
              <strong>Pimlico:</strong> Account abstraction infrastructure
              provider that sponsors gas fees
            </p>
            <p>
              <strong>Privy:</strong> Web3 authentication and wallet
              infrastructure with embedded wallet support
            </p>
            <p>
              <strong>PYUSD:</strong> PayPal&apos;s USD-pegged stablecoin on
              Ethereum
            </p>
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
}
