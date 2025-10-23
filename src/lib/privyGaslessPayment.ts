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
  }) => Promise<{
    r: `0x${string}`;
    s: `0x${string}`;
    v?: bigint;
    yParity: number;
    address: `0x${string}`;
    chainId: number;
    nonce: number;
  }>;
}) {
  // Step 1: Setup public client
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(RPC_ENDPOINTS.SEPOLIA),
  });

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

  // Step 2.6: Check if transaction should be free (off-chain calculation)

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
    // const transactionsAfterLimit = totalTransactions - freeTierLimit;
    const remainder = (totalTransactions - freeTierLimit) % freeTierRatio;
    isFree = remainder === 0;
  }

  // Debug logging for free tier calculation

  if (totalTransactions < freeTierLimit) {
  } else {
    const transactionsAfterLimit = totalTransactions - freeTierLimit;
  }

  // Step 3: Create wallet client from Privy wallet

  const walletClient = createWalletClient({
    account: privyWallet.address as Hex,
    chain: sepolia,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transport: custom((await privyWallet.getEthereumProvider()) as any),
  });

  // Step 4: Create Pimlico client

  const pimlicoApiKey = process.env.NEXT_PUBLIC_PIMLICO_API_KEY;
  if (!pimlicoApiKey) {
    throw new Error("Missing NEXT_PUBLIC_PIMLICO_API_KEY");
  }

  const pimlicoClient = createPimlicoClient({
    transport: http(
      `https://api.pimlico.io/v2/${sepolia.id}/rpc?apikey=${pimlicoApiKey}`
    ),
  });

  // Step 5: Create simple smart account (following Pimlico repo exactly)

  const simpleSmartAccount = await toSimpleSmartAccount({
    owner: walletClient,
    entryPoint: {
      address: entryPoint08Address,
      version: "0.8",
    },
    client: publicClient,
    address: privyWallet.address,
  });

  // Step 6: Create smart account client

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

  // Step 7: Sign EIP-7702 authorization (following Privy + Pimlico documentation exactly)

  const authorization = await signAuthorization({
    contractAddress: CONTRACTS.SIMPLE_ACCOUNT, // Use working SimpleAccount for EIP-7702 authorization
    chainId: sepolia.id,
    nonce: await publicClient.getTransactionCount({
      address: privyWallet.address,
    }),
  });

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
  } else {
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

  // Debug logging for batch transaction

  // Step 9: Send sponsored transaction

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

  return {
    success: true,
    txHash: hash,
    from: privyWallet.address,
    to: recipientAddress,
    amount: amount,
    token: "PYUSD",
  };
}
