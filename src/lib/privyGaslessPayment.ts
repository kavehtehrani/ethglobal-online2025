import {
  createPublicClient,
  http,
  encodeFunctionData,
  formatUnits,
  createWalletClient,
  custom,
  Hex,
} from "viem";
import { sepolia } from "viem/chains";
import { CONTRACTS, RPC_ENDPOINTS } from "./constants";
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
  }) => Promise<any>;
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

  // Step 3: Create wallet client from Privy wallet
  console.log("🔧 Creating wallet client from Privy wallet...");

  const walletClient = createWalletClient({
    account: privyWallet.address as Hex,
    chain: sepolia,
    transport: custom((await privyWallet.getEthereumProvider()) as any),
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
    contractAddress: "0xe6Cae83BdE06E4c305530e199D7217f42808555B", // SimpleAccount implementation (from docs)
    chainId: sepolia.id,
    nonce: await publicClient.getTransactionCount({
      address: privyWallet.address,
    }),
  });

  console.log("✅ EIP-7702 authorization signed");

  // Step 8: Build execute call data for our smart contract
  // First, encode the PYUSD transfer call data
  const pyusdTransferData = encodeFunctionData({
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

  // Then encode the SimpleAccount execute call
  const executeData = encodeFunctionData({
    abi: [
      {
        inputs: [
          { internalType: "address", name: "target", type: "address" },
          { internalType: "uint256", name: "value", type: "uint256" },
          { internalType: "bytes", name: "data", type: "bytes" },
        ],
        name: "execute",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
    ],
    functionName: "execute",
    args: [CONTRACTS.PYUSD, BigInt(0), pyusdTransferData],
  });

  console.log("📝 Execute data built");

  // Step 9: Send sponsored transaction (following Pimlico repo exactly)
  console.log("🚀 Sending sponsored transaction...");

  const sponsorshipPolicyId = process.env.NEXT_PUBLIC_SPONSORSHIP_POLICY_ID;
  if (!sponsorshipPolicyId) {
    throw new Error("Missing NEXT_PUBLIC_SPONSORSHIP_POLICY_ID");
  }

  const hash = await smartAccountClient.sendTransaction({
    calls: [
      {
        to: privyWallet.address, // The EOA that will act as smart account
        data: executeData,
        value: BigInt(0),
      },
    ],
    factory: "0x7702",
    factoryData: "0x",
    paymasterContext: {
      sponsorshipPolicyId,
    },
    authorization,
  });

  console.log("✅ Gasless transaction submitted!");
  console.log("Transaction hash:", hash);

  return {
    success: true,
    txHash: hash,
    from: privyWallet.address,
    to: recipientAddress,
    amount: amount,
    token: "PYUSD",
  };
}
