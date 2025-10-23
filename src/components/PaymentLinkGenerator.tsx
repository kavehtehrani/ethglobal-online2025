"use client";

import { useState } from "react";
import { isAddress } from "viem";
import {
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";
import { CollapsibleSection } from "./CollapsibleSection";

export function PaymentLinkGenerator() {
  const [showPaymentLink, setShowPaymentLink] = useState(false);
  const [paymentLinkCopied, setPaymentLinkCopied] = useState(false);
  const [paymentLinkRecipient, setPaymentLinkRecipient] = useState<string>("");
  const [paymentLinkAmount, setPaymentLinkAmount] = useState<string>("");

  // Generate payment link
  const generatePaymentLink = () => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams();

    if (paymentLinkRecipient && isAddress(paymentLinkRecipient)) {
      params.set("to", paymentLinkRecipient);
    }

    if (paymentLinkAmount && !isNaN(parseFloat(paymentLinkAmount))) {
      params.set("amount", paymentLinkAmount);
    }

    return `${baseUrl}?${params.toString()}`;
  };

  // Copy payment link to clipboard
  const copyPaymentLink = async () => {
    try {
      const link = generatePaymentLink();
      await navigator.clipboard.writeText(link);
      setPaymentLinkCopied(true);

      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setPaymentLinkCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy payment link:", error);
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
            onClick={() => setShowPaymentLink(!showPaymentLink)}
            disabled={
              !paymentLinkRecipient ||
              !paymentLinkAmount ||
              !isAddress(paymentLinkRecipient)
            }
            className="bg-[var(--accent)] text-white px-6 py-2 rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            Generate Link
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
              onClick={() => setShowPaymentLink(!showPaymentLink)}
              disabled={
                !paymentLinkRecipient ||
                !paymentLinkAmount ||
                !isAddress(paymentLinkRecipient)
              }
              className="bg-[var(--accent)] text-white px-6 py-2 rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors whitespace-nowrap self-end"
            >
              Generate Link
            </button>
          </div>
        </div>

        {showPaymentLink && (
          <div className="p-4 bg-[var(--background)] border border-[var(--card-border)] rounded-lg">
            <p className="text-xs text-[var(--text-secondary)] mb-3">
              Share this link to pre-fill the payment form:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={generatePaymentLink()}
                readOnly
                className="flex-1 px-3 py-2 text-sm bg-[var(--card-bg)] border border-[var(--card-border)] rounded text-[var(--foreground)] font-mono"
              />
              <button
                onClick={copyPaymentLink}
                disabled={paymentLinkCopied}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  paymentLinkCopied
                    ? "bg-[var(--success)] text-white"
                    : "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                }`}
              >
                <ClipboardDocumentIcon className="h-4 w-4" />
                {paymentLinkCopied ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="mt-2 text-xs text-[var(--text-secondary)]">
              💡 Recipients can click this link to automatically fill in the
              payment details
            </div>
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}
