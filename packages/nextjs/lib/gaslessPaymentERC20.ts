import { createSmartAccountClient } from "permissionless";
import { toSafeSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { createPublicClient, formatUnits, getAddress, http, maxUint256, parseAbi } from "viem";
import { sepolia } from "viem/chains";

// Contract ABIs
const PYUSD_ABI = [
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
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
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// Contract addresses
const PYUSD_ADDRESS = "0xCaC524BcA292aaade2DF8A05cC58F0a65b1b3bB9" as `0x${string}`;

export interface GaslessPaymentParams {
  userAddress: `0x${string}`;
  recipientAddress: `0x${string}`;
  amount: string; // PYUSD amount (6 decimals)
  signMessage: (message: string) => Promise<`0x${string}`>; // Wallet signing function
  signTypedData: (typedData: any) => Promise<`0x${string}`>; // For EIP-7702 authorization
}

export async function executeGaslessPayment({
  userAddress,
  recipientAddress,
  amount,
  signMessage,
  signTypedData,
}: GaslessPaymentParams) {
  try {
    console.log("🚀 Starting REAL gasless payment on Sepolia using ERC-20 Paymaster...");

    // Create public client
    const client = createPublicClient({
      chain: sepolia,
      transport: http("https://sepolia.drpc.org"),
    });

    // Create Pimlico client
    const pimlicoAPIKey = process.env.NEXT_PUBLIC_PIMLICO_API_KEY;
    if (!pimlicoAPIKey) {
      throw new Error("Pimlico API key not found");
    }

    const pimlicoUrl = `https://api.pimlico.io/v2/11155111/rpc?apikey=${pimlicoAPIKey}`;
    const pimlicoClient = createPimlicoClient({
      chain: sepolia,
      transport: http(pimlicoUrl),
    });

    // Create a custom account that uses the user's wallet for signing
    const customAccount = {
      address: userAddress,
      type: "local" as const,
      source: "custom" as const,
      publicKey: "0x" as `0x${string}`,
      signMessage: async ({ message }: { message: any }) => {
        const messageString = typeof message === "string" ? message : message.raw;
        return await signMessage(messageString);
      },
      signTypedData: async (typedData: any) => {
        return await signTypedData(typedData);
      },
      signTransaction: async () => {
        throw new Error("signTransaction not supported");
      },
    };

    // Create Safe Smart Account (ERC-4337 approach from tutorial)
    const account = await toSafeSmartAccount({
      client,
      owners: [customAccount],
      version: "1.4.1",
    });

    console.log("Safe account address:", account.address);

    // Create Smart Account Client
    const smartAccountClient = createSmartAccountClient({
      account,
      chain: sepolia,
      bundlerTransport: http(pimlicoUrl),
      paymaster: pimlicoClient,
      userOperation: {
        estimateFeesPerGas: async () => {
          return (await pimlicoClient.getUserOperationGasPrice()).fast;
        },
      },
    });

    // Check PYUSD balance before proceeding
    const amountInWei = BigInt(parseFloat(amount) * 10 ** 6); // PYUSD uses 6 decimals
    const pyusdBalance = (await client.readContract({
      address: PYUSD_ADDRESS,
      abi: PYUSD_ABI,
      functionName: "balanceOf",
      args: [account.address],
    })) as bigint;

    console.log("Smart account PYUSD balance:", pyusdBalance.toString());
    console.log("Transfer amount:", amountInWei.toString());

    if (pyusdBalance < amountInWei) {
      throw new Error(
        `Insufficient PYUSD balance. Required: ${amount} PYUSD, Available: ${formatUnits(pyusdBalance, 6)} PYUSD`,
      );
    }

    // Get ERC-20 paymaster quotes for PYUSD
    const quotes = await pimlicoClient.getTokenQuotes({
      tokens: [PYUSD_ADDRESS],
    });
    const paymaster = quotes[0].paymaster;

    console.log("Using ERC-20 paymaster:", paymaster);

    // Send transaction using ERC-20 paymaster (paying gas with PYUSD)
    const transactionHash = await smartAccountClient.sendTransaction({
      calls: [
        {
          to: getAddress(PYUSD_ADDRESS),
          abi: parseAbi(["function approve(address,uint)"]),
          functionName: "approve",
          args: [paymaster, maxUint256],
        },
        {
          to: getAddress(PYUSD_ADDRESS),
          abi: parseAbi(["function transfer(address,uint256)"]),
          functionName: "transfer",
          args: [recipientAddress, amountInWei],
        },
      ],
      paymasterContext: {
        token: PYUSD_ADDRESS,
      },
    });

    console.log("✅ REAL gasless transaction submitted!");
    console.log("Transaction hash:", transactionHash);

    return {
      success: true,
      txHash: transactionHash,
    };
  } catch (error) {
    console.error("Gasless payment failed:", error);
    throw error;
  }
}
