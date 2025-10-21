import {
  createPublicClient,
  http,
  encodeFunctionData,
  formatUnits,
  parseUnits,
  createWalletClient,
  custom,
  Hex,
} from "viem";
import { sepolia } from "viem/chains";
import { CONTRACTS, RPC_ENDPOINTS, FEE_RECEIVER_ADDRESS } from "./constants";
import { createSmartAccountClient } from "permissionless";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { entryPoint08Address } from "viem/account-abstraction";

const PYUSD_ABI = [
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// Transaction Counter ABI
const TRANSACTION_COUNTER_ABI = [
  {
    name: "getCount",
    type: "function",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "count", type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "getFreeTierConfig",
    type: "function",
    inputs: [],
    outputs: [
      { name: "limit", type: "uint256" },
      { name: "ratio", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    name: "incrementCount",
    type: "function",
    inputs: [{ name: "user", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export interface GaslessPaymentParams {
  recipientAddress: `0x${string}`;
  amount: string;
}

export async function executePrivyGaslessPayment({
  recipientAddress,
  amount,
  privyWallet,
  signAuthorization,
}: GaslessPaymentParams & {
  privyWallet: {
    address: `0x${string}`;
    getEthereumProvider: () => Promise<unknown>;
  };
  signAuthorization: (auth: {
    contractAddress: string;
    chainId: number;
    nonce: number;
  }) => Promise<`0x${string}`>;
}) {
  console.log("🚀 Starting Privy gasless payment...");
  console.log("📊 Payment details:", {
    recipient: recipientAddress,
    amount,
    token: "PYUSD",
  });

  // Step 1: Setup public client
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(RPC_ENDPOINTS.SEPOLIA),
  });

  console.log("✅ Public client created");

  // Step 2: Check PYUSD balance
  const balance = await publicClient.readContract({
    address: CONTRACTS.PYUSD,
    abi: PYUSD_ABI,
    functionName: "balanceOf",
    args: [privyWallet.address],
  });

  const amountInWei = BigInt(parseFloat(amount) * 10 ** 6); // PYUSD has 6 decimals

  if (balance < amountInWei) {
    throw new Error(
      `Insufficient PYUSD balance. Required: ${amount} PYUSD, Available: ${formatUnits(
        balance,
        6
      )} PYUSD`
    );
  }

  console.log("✅ PYUSD balance check passed");

  // Step 2.5: Calculate fee (0.5% with min/max limits)
  const feeBasisPoints = 50; // 0.5%
  const minFee = parseUnits("0.01", 6); // 0.01 PYUSD minimum
  const maxFee = parseUnits("10", 6); // 10 PYUSD maximum

  const calculatedFee = (amountInWei * BigInt(feeBasisPoints)) / BigInt(10000);
  const feeAmount =
    calculatedFee < minFee
      ? minFee
      : calculatedFee > maxFee
      ? maxFee
      : calculatedFee;

  console.log("💰 Fee calculated:", formatUnits(feeAmount, 6), "PYUSD");

  // Step 2.6: Check if transaction should be free (off-chain calculation)
  console.log("🔍 Checking transaction tier status...");

  const [userCount, tierConfig] = await Promise.all([
    publicClient.readContract({
      address: CONTRACTS.TRANSACTION_COUNTER,
      abi: TRANSACTION_COUNTER_ABI,
      functionName: "getCount",
      args: [privyWallet.address],
    }),
    publicClient.readContract({
      address: CONTRACTS.TRANSACTION_COUNTER,
      abi: TRANSACTION_COUNTER_ABI,
      functionName: "getFreeTierConfig",
      args: [],
    }),
  ]);

  const totalTransactions = Number(userCount);
  const freeTierLimit = Number(tierConfig[0]);
  const freeTierRatio = Number(tierConfig[1]);

  // Calculate if transaction is free (off-chain logic)
  let isFree = false;
  if (totalTransactions < freeTierLimit) {
    isFree = true;
  } else {
    const transactionsAfterLimit = totalTransactions - freeTierLimit;
    const remainder = transactionsAfterLimit % freeTierRatio;
    isFree = remainder === 0;
  }

  console.log("🎯 Transaction is free:", isFree);
  console.log("📊 User stats:", {
    totalTransactions,
    freeTierLimit,
    freeTierRatio,
  });

  // Debug logging for free tier calculation
  console.log("🔍 DEBUG - Free tier calculation:");
  console.log("  - totalTransactions:", totalTransactions);
  console.log("  - freeTierLimit:", freeTierLimit);
  console.log("  - freeTierRatio:", freeTierRatio);

  if (totalTransactions < freeTierLimit) {
    console.log("  - Status: Within free tier limit");
    console.log("  - isFree: true");
  } else {
    const transactionsAfterLimit = totalTransactions - freeTierLimit;
    const remainder = transactionsAfterLimit % freeTierRatio;
    console.log("  - transactionsAfterLimit:", transactionsAfterLimit);
    console.log("  - remainder:", remainder);
    console.log("  - isFree:", remainder === 0);
    console.log("  - Status:", remainder === 0 ? "Free (1 in N)" : "Paid");
  }

  // Step 3: Create wallet client from Privy wallet
  console.log("🔧 Creating wallet client from Privy wallet...");

  const walletClient = createWalletClient({
    account: privyWallet.address as Hex,
    chain: sepolia,
    transport: custom((await privyWallet.getEthereumProvider()) as unknown),
  });

  console.log("✅ Wallet client created");

  // Step 4: Create Pimlico client
  console.log("🏗️ Creating Pimlico client...");

  const pimlicoApiKey = process.env.NEXT_PUBLIC_PIMLICO_API_KEY;
  if (!pimlicoApiKey) {
    throw new Error("Missing NEXT_PUBLIC_PIMLICO_API_KEY");
  }

  const pimlicoClient = createPimlicoClient({
    transport: http(
      `https://api.pimlico.io/v2/${sepolia.id}/rpc?apikey=${pimlicoApiKey}`
    ),
  });

  console.log("✅ Pimlico client created");

  // Step 5: Create simple smart account (following Pimlico repo exactly)
  console.log("🏗️ Creating simple smart account...");

  const simpleSmartAccount = await toSimpleSmartAccount({
    owner: walletClient,
    entryPoint: {
      address: entryPoint08Address,
      version: "0.8",
    },
    client: publicClient,
    address: privyWallet.address,
  });

  console.log("✅ Simple smart account created");

  // Step 6: Create smart account client
  console.log("🏗️ Creating smart account client...");

  const smartAccountClient = createSmartAccountClient({
    account: simpleSmartAccount,
    chain: sepolia,
    bundlerTransport: http(
      `https://api.pimlico.io/v2/${sepolia.id}/rpc?apikey=${pimlicoApiKey}`
    ),
    paymaster: pimlicoClient,
    userOperation: {
      estimateFeesPerGas: async () => {
        return (await pimlicoClient.getUserOperationGasPrice()).fast;
      },
    },
  });

  console.log("✅ Smart account client created");

  // Step 7: Sign EIP-7702 authorization (following Privy + Pimlico documentation exactly)
  console.log("🔐 Signing EIP-7702 authorization...");

  const authorization = await signAuthorization({
    contractAddress: CONTRACTS.SIMPLE_ACCOUNT, // Use working SimpleAccount for EIP-7702 authorization
    chainId: sepolia.id,
    nonce: await publicClient.getTransactionCount({
      address: privyWallet.address,
    }),
  });

  console.log("✅ EIP-7702 authorization signed");

  // Step 8: Build transfer calls based on free tier status
  const recipientTransferData = encodeFunctionData({
    abi: [
      {
        inputs: [
          { internalType: "address", name: "to", type: "address" },
          { internalType: "uint256", name: "amount", type: "uint256" },
        ],
        name: "transfer",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
      },
    ],
    functionName: "transfer",
    args: [recipientAddress, amountInWei],
  });

  // Prepare calls array
  const calls = [
    {
      to: CONTRACTS.PYUSD,
      data: recipientTransferData,
      value: BigInt(0),
    },
  ];

  // Add fee transfer only if not free
  if (!isFree) {
    const feeTransferData = encodeFunctionData({
      abi: [
        {
          inputs: [
            { internalType: "address", name: "to", type: "address" },
            { internalType: "uint256", name: "amount", type: "uint256" },
          ],
          name: "transfer",
          outputs: [{ internalType: "bool", name: "", type: "bool" }],
          stateMutability: "nonpayable",
          type: "function",
        },
      ],
      functionName: "transfer",
      args: [FEE_RECEIVER_ADDRESS, feeAmount],
    });

    calls.unshift({
      to: CONTRACTS.PYUSD,
      data: feeTransferData,
      value: BigInt(0),
    });

    console.log("📝 Batch transfer data encoded (with fee)");
  } else {
    console.log("📝 Transfer data encoded (free transaction)");
  }

  // Always add incrementCount call to the batch
  const incrementCountData = encodeFunctionData({
    abi: TRANSACTION_COUNTER_ABI,
    functionName: "incrementCount",
    args: [privyWallet.address],
  });

  calls.push({
    to: CONTRACTS.TRANSACTION_COUNTER,
    data: incrementCountData,
    value: BigInt(0),
  });

  console.log("📊 Added incrementCount to batch transaction");

  // Debug logging for batch transaction
  console.log("🔍 DEBUG - Batch transaction calls:");
  console.log("  - Total calls:", calls.length);
  console.log("  - isFree:", isFree);
  calls.forEach((call, index) => {
    console.log(`  - Call ${index + 1}:`, {
      to: call.to,
      data: call.data.slice(0, 10) + "...",
      value: call.value.toString(),
    });
  });

  // Step 9: Send sponsored transaction
  console.log("🚀 Sending sponsored transaction...");

  const sponsorshipPolicyId = process.env.NEXT_PUBLIC_SPONSORSHIP_POLICY_ID;
  if (!sponsorshipPolicyId) {
    throw new Error("Missing NEXT_PUBLIC_SPONSORSHIP_POLICY_ID");
  }

  const hash = await smartAccountClient.sendTransaction({
    calls,
    factory: "0x7702",
    factoryData: "0x",
    paymasterContext: {
      sponsorshipPolicyId,
    },
    authorization,
  });

  console.log("✅ Gasless transaction submitted!");
  console.log("Transaction hash:", hash);
  console.log(
    "📊 Transaction counter incremented as part of batch transaction"
  );

  return {
    success: true,
    txHash: hash,
    from: privyWallet.address,
    to: recipientAddress,
    amount: amount,
    token: "PYUSD",
  };
}
