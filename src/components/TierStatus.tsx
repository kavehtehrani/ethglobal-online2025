"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getUserTierStatus,
  getContractConfig,
  formatTierStatus,
  TierStatus,
  ContractConfig,
} from "@/lib/gaslessPaymentContract";
import { RefreshIcon } from "@heroicons/react/24/outline";

interface TierStatusProps {
  userAddress: `0x${string}`;
}

export function TierStatusComponent({ userAddress }: TierStatusProps) {
  const [tierStatus, setTierStatus] = useState<TierStatus | null>(null);
  const [contractConfig, setContractConfig] = useState<ContractConfig | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTierData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [tierData, configData] = await Promise.all([
        getUserTierStatus(userAddress),
        getContractConfig(),
      ]);

      setTierStatus(tierData);
      setContractConfig(configData);
    } catch (err) {
      console.error("Error fetching tier data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch tier data"
      );
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  useEffect(() => {
    if (userAddress) {
      fetchTierData();
    }
  }, [userAddress, fetchTierData]);

  if (loading) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-[var(--foreground)]">
            🎯 Your Tier Status
          </h2>
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--accent)]"></div>
        </div>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-[var(--card-border)] rounded w-3/4"></div>
          <div className="h-4 bg-[var(--card-border)] rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-[var(--foreground)]">
            🎯 Your Tier Status
          </h2>
          <button
            onClick={fetchTierData}
            className="bg-[var(--accent)] text-white px-3 py-1 rounded text-sm hover:bg-[var(--accent-hover)] transition-colors"
          >
            <RefreshIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="text-[var(--error)] text-sm">Error: {error}</div>
      </div>
    );
  }

  if (!tierStatus || !contractConfig) {
    return null;
  }

  const formattedStatus = formatTierStatus(tierStatus, contractConfig);

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold text-[var(--foreground)]">
          🎯 Your Tier Status
        </h2>
        <button
          onClick={fetchTierData}
          className="bg-[var(--accent)] text-white px-3 py-1 rounded text-sm hover:bg-[var(--accent-hover)] transition-colors"
        >
          <RefreshIcon className="h-4 w-4" />
        </button>
      </div>

      <div
        className={`p-3 rounded-lg border ${formattedStatus.bgColor} ${formattedStatus.borderColor}`}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className={`font-semibold ${formattedStatus.color}`}>
            {formattedStatus.tier}
          </h3>
          <span className="text-sm text-[var(--text-muted)]">
            Transaction #{Number(tierStatus.transactionCount) + 1}
          </span>
        </div>
        <p className={`text-sm ${formattedStatus.color}`}>
          {formattedStatus.description}
        </p>
      </div>

      {/* Contract Configuration Display */}
      <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
        <h4 className="text-sm font-medium text-[var(--foreground)] mb-2">
          Contract Configuration
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
          <div className="flex justify-between">
            <span>Free Tier Limit:</span>
            <span className="font-mono">
              {Number(contractConfig.freeTierLimit)} transactions
            </span>
          </div>
          <div className="flex justify-between">
            <span>Free Tier Ratio:</span>
            <span className="font-mono">
              1 in {Number(contractConfig.freeTierRatio)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Service Fee:</span>
            <span className="font-mono">
              {Number(contractConfig.serviceFeeBasisPoints) / 100}%
            </span>
          </div>
          <div className="flex justify-between">
            <span>Min/Max Fee:</span>
            <span className="font-mono">
              ${Number(contractConfig.minServiceFee) / 1e6} - $
              {Number(contractConfig.maxServiceFee) / 1e6}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
