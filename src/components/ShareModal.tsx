"use client";

import { useState, useEffect } from "react";
import { isAddress } from "viem";
import {
  XMarkIcon,
  ClipboardDocumentIcon,
  QrCodeIcon,
  ShareIcon,
} from "@heroicons/react/24/outline";
import QRCode from "qrcode";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipient: string;
  amount: string;
}

export function ShareModal({
  isOpen,
  onClose,
  recipient,
  amount,
}: ShareModalProps) {
  const [linkCopied, setLinkCopied] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);

  // Generate payment link
  const generatePaymentLink = () => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams();

    if (recipient && isAddress(recipient)) {
      params.set("to", recipient);
    }

    if (amount && !isNaN(parseFloat(amount))) {
      params.set("amount", amount);
    }

    return `${baseUrl}?${params.toString()}`;
  };

  // Generate QR code
  const generateQRCode = async () => {
    if (qrCodeDataUrl) return; // Already generated

    setIsGeneratingQR(true);
    try {
      const link = generatePaymentLink();
      const qrCodeDataUrl = await QRCode.toDataURL(link, {
        width: 256,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      setQrCodeDataUrl(qrCodeDataUrl);
    } catch (error) {
      console.error("Failed to generate QR code:", error);
    } finally {
      setIsGeneratingQR(false);
    }
  };

  // Copy payment link to clipboard
  const copyPaymentLink = async () => {
    try {
      const link = generatePaymentLink();
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);

      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setLinkCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy payment link:", error);
    }
  };

  // Share via Web Share API (if available)
  const shareViaWebAPI = async () => {
    try {
      const link = generatePaymentLink();
      if (navigator.share) {
        await navigator.share({
          title: "Payment Request",
          text: `Please send ${amount} PYUSD to ${recipient}`,
          url: link,
        });
      } else {
        // Fallback to clipboard
        await copyPaymentLink();
      }
    } catch (error) {
      console.error("Failed to share:", error);
    }
  };

  // Generate QR code when modal opens
  useEffect(() => {
    if (isOpen && !qrCodeDataUrl) {
      generateQRCode();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--background)] rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--card-border)]">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Share Payment Request
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--card-bg)] rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Payment Details */}
          <div className="bg-[var(--card-bg)] rounded-lg p-4 border border-[var(--card-border)]">
            <div className="text-sm text-[var(--text-secondary)] mb-2">
              Payment Request
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm text-[var(--text-secondary)]">
                  Amount:
                </span>
                <span className="font-medium text-[var(--foreground)]">
                  {amount} PYUSD
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[var(--text-secondary)]">
                  To:
                </span>
                <span className="font-mono text-sm text-[var(--foreground)]">
                  {recipient.slice(0, 6)}...{recipient.slice(-4)}
                </span>
              </div>
            </div>
          </div>

          {/* Share Options */}
          <div className="space-y-4">
            {/* Link Sharing */}
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Payment Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={generatePaymentLink()}
                  readOnly
                  className="flex-1 px-3 py-2 text-sm bg-[var(--card-bg)] border border-[var(--card-border)] rounded text-[var(--foreground)] font-mono"
                />
                <button
                  onClick={copyPaymentLink}
                  disabled={linkCopied}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    linkCopied
                      ? "bg-[var(--success)] text-white"
                      : "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                  }`}
                >
                  <ClipboardDocumentIcon className="h-4 w-4" />
                  {linkCopied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            {/* QR Code */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-[var(--foreground)]">
                  QR Code
                </label>
                <button
                  onClick={generateQRCode}
                  disabled={isGeneratingQR}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
                >
                  <QrCodeIcon className="h-4 w-4" />
                  {isGeneratingQR ? "Generating..." : "Regenerate"}
                </button>
              </div>

              {qrCodeDataUrl && (
                <div className="flex justify-center">
                  <div className="p-4 bg-white rounded-lg border border-[var(--card-border)]">
                    <img
                      src={qrCodeDataUrl}
                      alt="Payment QR Code"
                      className="w-48 h-48"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Native Share Button */}
            {navigator.share && (
              <button
                onClick={shareViaWebAPI}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--accent)] text-white rounded-lg font-medium hover:bg-[var(--accent-hover)] transition-colors"
              >
                <ShareIcon className="h-5 w-5" />
                Share via Device
              </button>
            )}
          </div>

          {/* Instructions */}
          <div className="text-xs text-[var(--text-secondary)] bg-[var(--card-bg)] p-3 rounded-lg border border-[var(--card-border)]">
            <p className="font-medium mb-1">💡 How to use:</p>
            <ul className="space-y-1">
              <li>• Copy the link and send it via message/email</li>
              <li>• Show the QR code for others to scan with their phone</li>
              <li>• Recipients will be taken to a pre-filled payment form</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
