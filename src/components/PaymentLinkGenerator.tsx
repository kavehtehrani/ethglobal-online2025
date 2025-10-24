"use client";

import { useState } from "react";
import { isAddress } from "viem";
import {
  CheckCircleIcon,
  XCircleIcon,
  ShareIcon,
} from "@heroicons/react/24/outline";
import { CollapsibleSection } from "./CollapsibleSection";
import { ShareModal } from "./ShareModal";

export function PaymentLinkGenerator() {
  const [paymentLinkRecipient, setPaymentLinkRecipient] = useState<string>("");
  const [paymentLinkAmount, setPaymentLinkAmount] = useState<string>("");
  const [showShareModal, setShowShareModal] = useState(false);

  // Open share modal
  const openShareModal = () => {
    if (
      paymentLinkRecipient &&
      paymentLinkAmount &&
      isAddress(paymentLinkRecipient)
    ) {
      setShowShareModal(true);
    }
  };

  return (
    <CollapsibleSection title="Request Payment Link" icon="🔗">
      <div className="space-y-3">
        <p className="text-sm mt-2 text-[var(--text-secondary)]">
          Generate a payment link that pre-fills the recipient and amount for
          easy sharing.
        </p>

        {/* Desktop: Single row layout */}
        <div className="hidden lg:flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
              Recipient Address
            </label>
            <div className="relative">
              <input
                type="text"
                value={paymentLinkRecipient}
                onChange={(e) => setPaymentLinkRecipient(e.target.value)}
                placeholder="Enter recipient address"
                className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] placeholder-[var(--text-secondary)] ${
                  paymentLinkRecipient && isAddress(paymentLinkRecipient)
                    ? "border-[var(--success)] bg-[var(--card-bg)] text-[var(--foreground)]"
                    : paymentLinkRecipient && !isAddress(paymentLinkRecipient)
                    ? "border-[var(--error)] bg-[var(--card-bg)] text-[var(--foreground)]"
                    : "border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--foreground)]"
                }`}
              />
              {paymentLinkRecipient && isAddress(paymentLinkRecipient) && (
                <CheckCircleIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--success)]" />
              )}
              {paymentLinkRecipient && !isAddress(paymentLinkRecipient) && (
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
              value={paymentLinkAmount}
              onChange={(e) => setPaymentLinkAmount(e.target.value)}
              placeholder="Enter amount (PYUSD)"
              className="w-full px-3 py-2 border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--foreground)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] placeholder-[var(--text-secondary)]"
            />
          </div>
          <button
            onClick={openShareModal}
            disabled={
              !paymentLinkRecipient ||
              !paymentLinkAmount ||
              !isAddress(paymentLinkRecipient)
            }
            className="bg-[var(--accent)] text-white px-6 py-2 rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors whitespace-nowrap flex items-center gap-2"
          >
            <ShareIcon className="h-4 w-4" />
            Share Payment
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
                value={paymentLinkRecipient}
                onChange={(e) => setPaymentLinkRecipient(e.target.value)}
                placeholder="Enter recipient address"
                className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] placeholder-[var(--text-secondary)] ${
                  paymentLinkRecipient && isAddress(paymentLinkRecipient)
                    ? "border-[var(--success)] bg-[var(--card-bg)] text-[var(--foreground)]"
                    : paymentLinkRecipient && !isAddress(paymentLinkRecipient)
                    ? "border-[var(--error)] bg-[var(--card-bg)] text-[var(--foreground)]"
                    : "border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--foreground)]"
                }`}
              />
              {paymentLinkRecipient && isAddress(paymentLinkRecipient) && (
                <CheckCircleIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--success)]" />
              )}
              {paymentLinkRecipient && !isAddress(paymentLinkRecipient) && (
                <XCircleIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--error)]" />
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                Amount (PYUSD)
              </label>
              <input
                type="text"
                value={paymentLinkAmount}
                onChange={(e) => setPaymentLinkAmount(e.target.value)}
                placeholder="Enter amount (PYUSD)"
                className="w-full px-3 py-2 border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--foreground)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] placeholder-[var(--text-secondary)]"
              />
            </div>
            <button
              onClick={openShareModal}
              disabled={
                !paymentLinkRecipient ||
                !paymentLinkAmount ||
                !isAddress(paymentLinkRecipient)
              }
              className="bg-[var(--accent)] text-white px-6 py-2 rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors whitespace-nowrap self-end flex items-center gap-2"
            >
              <ShareIcon className="h-4 w-4" />
              Share Payment
            </button>
          </div>
        </div>

        {/* Share Modal */}
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          recipient={paymentLinkRecipient}
          amount={paymentLinkAmount}
        />
      </div>
    </CollapsibleSection>
  );
}
