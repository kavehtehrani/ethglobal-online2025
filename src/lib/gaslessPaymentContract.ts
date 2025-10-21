import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { CONTRACTS, RPC_ENDPOINTS } from "./constants";

// ABI for our GaslessPaymentAccount contract
const GASLESS_PAYMENT_ACCOUNT_ABI = [
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getUserTierStatus",
    outputs: [
      {
        components: [
          { internalType: "bool", name: "isFreeTier", type: "bool" },
          { internalType: "uint256", name: "transactionCount", type: "uint256" },
          { internalType: "uint256", name: "freeTransactionsRemaining", type: "uint256" },
          { internalType: "bool", name: "isNextTransactionFree", type: "bool" },
        ],
        internalType: "struct GaslessPaymentAccount.TierStatus",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "freeTierLimit",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "freeTierRatio",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "serviceFeeBasisPoints",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "minServiceFee",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "maxServiceFee",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "feeReceiver",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export interface TierStatus {
  isFreeTier: boolean;
  transactionCount: bigint;
  freeTransactionsRemaining: bigint;
  isNextTransactionFree: boolean;
}

export interface ContractConfig {
  freeTierLimit: bigint;
  freeTierRatio: bigint;
  serviceFeeBasisPoints: bigint;
  minServiceFee: bigint;
  maxServiceFee: bigint;
  feeReceiver: `0x${string}`;
}

// Create public client
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_ENDPOINTS.SEPOLIA),
});

/**
 * Get the tier status for a user
 */
export async function getUserTierStatus(userAddress: `0x${string}`): Promise<TierStatus> {
  try {
    const result = await publicClient.readContract({
      address: CONTRACTS.GASLESS_PAYMENT_ACCOUNT,
      abi: GASLESS_PAYMENT_ACCOUNT_ABI,
      functionName: "getUserTierStatus",
      args: [userAddress],
    });

    return {
      isFreeTier: result[0],
      transactionCount: result[1],
      freeTransactionsRemaining: result[2],
      isNextTransactionFree: result[3],
    };
  } catch (error) {
    console.error("Error fetching user tier status:", error);
    throw new Error("Failed to fetch tier status");
  }
}

/**
 * Get the contract configuration
 */
export async function getContractConfig(): Promise<ContractConfig> {
  try {
    const [
      freeTierLimit,
      freeTierRatio,
      serviceFeeBasisPoints,
      minServiceFee,
      maxServiceFee,
      feeReceiver,
    ] = await Promise.all([
      publicClient.readContract({
        address: CONTRACTS.GASLESS_PAYMENT_ACCOUNT,
        abi: GASLESS_PAYMENT_ACCOUNT_ABI,
        functionName: "freeTierLimit",
      }),
      publicClient.readContract({
        address: CONTRACTS.GASLESS_PAYMENT_ACCOUNT,
        abi: GASLESS_PAYMENT_ACCOUNT_ABI,
        functionName: "freeTierRatio",
      }),
      publicClient.readContract({
        address: CONTRACTS.GASLESS_PAYMENT_ACCOUNT,
        abi: GASLESS_PAYMENT_ACCOUNT_ABI,
        functionName: "serviceFeeBasisPoints",
      }),
      publicClient.readContract({
        address: CONTRACTS.GASLESS_PAYMENT_ACCOUNT,
        abi: GASLESS_PAYMENT_ACCOUNT_ABI,
        functionName: "minServiceFee",
      }),
      publicClient.readContract({
        address: CONTRACTS.GASLESS_PAYMENT_ACCOUNT,
        abi: GASLESS_PAYMENT_ACCOUNT_ABI,
        functionName: "maxServiceFee",
      }),
      publicClient.readContract({
        address: CONTRACTS.GASLESS_PAYMENT_ACCOUNT,
        abi: GASLESS_PAYMENT_ACCOUNT_ABI,
        functionName: "feeReceiver",
      }),
    ]);

    return {
      freeTierLimit,
      freeTierRatio,
      serviceFeeBasisPoints,
      minServiceFee,
      maxServiceFee,
      feeReceiver: feeReceiver as `0x${string}`,
    };
  } catch (error) {
    console.error("Error fetching contract config:", error);
    throw new Error("Failed to fetch contract configuration");
  }
}

/**
 * Calculate the service fee for a given amount
 */
export function calculateServiceFee(amount: bigint, config: ContractConfig): bigint {
  // Calculate fee: amount * basisPoints / 10000
  const fee = (amount * config.serviceFeeBasisPoints) / BigInt(10000);
  
  // Apply min/max bounds
  if (fee < config.minServiceFee) {
    return config.minServiceFee;
  }
  if (fee > config.maxServiceFee) {
    return config.maxServiceFee;
  }
  
  return fee;
}

/**
 * Format tier status for display
 */
export function formatTierStatus(tierStatus: TierStatus, config: ContractConfig) {
  const freeTransactionsRemaining = Number(tierStatus.freeTransactionsRemaining);
  
  if (tierStatus.isFreeTier) {
    return {
      tier: "Free Tier",
      description: `${freeTransactionsRemaining} free transactions remaining`,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    };
  } else {
    const isNextFree = tierStatus.isNextTransactionFree;
    return {
      tier: "Paid Tier",
      description: isNextFree 
        ? "Next transaction is free!" 
        : `Service fee applies (${Number(config.serviceFeeBasisPoints) / 100}%)`,
      color: isNextFree ? "text-blue-600" : "text-orange-600",
      bgColor: isNextFree ? "bg-blue-50" : "bg-orange-50",
      borderColor: isNextFree ? "border-blue-200" : "border-orange-200",
    };
  }
}
