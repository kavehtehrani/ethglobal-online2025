import { CONTRACTS, PIMLICO, RPC_ENDPOINTS, TOKENS } from "./constants";
import { createSmartAccountClient } from "permissionless";
import { to7702SimpleSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { type Hex, createPublicClient, encodeFunctionData, formatUnits, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

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
] as const;

export interface GaslessPaymentParams {
  recipientAddress: `0x${string}`;
  amount: string; // PYUSD amount (6 decimals)
}

export async function executeGaslessPayment({ recipientAddress, amount }: GaslessPaymentParams) {
  try {
    console.log("🚀 Starting EIP-7702 gasless payment following Pimlico's exact pattern...");

    // Step 1: Get private key from environment
    const privateKey = process.env.NEXT_PUBLIC_DEMO_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("NEXT_PUBLIC_DEMO_PRIVATE_KEY not found in environment variables");
    }

    // Step 2: Create EOA account using viem (has native signAuthorization)
    const eoa7702 = privateKeyToAccount(privateKey as `0x${string}`);
    console.log("✅ EOA address:", eoa7702.address);

    // Step 3: Create public client
    const client = createPublicClient({
      chain: sepolia,
      transport: http(RPC_ENDPOINTS.SEPOLIA),
    });

    // Step 4: Check PYUSD balance
    const amountInWei = BigInt(parseFloat(amount) * 10 ** TOKENS.PYUSD.decimals);
    const pyusdBalance = (await client.readContract({
      address: CONTRACTS.PYUSD,
      abi: PYUSD_ABI,
      functionName: "balanceOf",
      args: [eoa7702.address],
    })) as bigint;

    console.log("User PYUSD balance:", formatUnits(pyusdBalance, TOKENS.PYUSD.decimals), "PYUSD");
    console.log("Transfer amount:", amount, "PYUSD");

    if (pyusdBalance < amountInWei) {
      throw new Error(
        `Insufficient PYUSD balance. Required: ${amount} PYUSD, Available: ${formatUnits(pyusdBalance, TOKENS.PYUSD.decimals)} PYUSD`,
      );
    }

    // Step 5: Create 7702 Simple Smart Account (following Pimlico docs exactly)
    const simple7702Account = await to7702SimpleSmartAccount({
      client,
      owner: eoa7702, // ✅ viem account with native signAuthorization
    });

    console.log("✅ Smart account created:", simple7702Account.address);
    console.log("   Matches EOA:", simple7702Account.address.toLowerCase() === eoa7702.address.toLowerCase());

    // Step 6: Setup Pimlico client for paymaster
    const pimlicoAPIKey = process.env.NEXT_PUBLIC_PIMLICO_API_KEY;
    if (!pimlicoAPIKey) {
      throw new Error("NEXT_PUBLIC_PIMLICO_API_KEY not found");
    }

    const pimlicoUrl = PIMLICO.SEPOLIA_RPC_URL(pimlicoAPIKey);
    const pimlicoClient = createPimlicoClient({
      chain: sepolia,
      transport: http(pimlicoUrl),
    });

    console.log("✅ Pimlico client created");

    // Step 7: Create Smart Account Client
    const smartAccountClient = createSmartAccountClient({
      client,
      chain: sepolia,
      account: simple7702Account,
      paymaster: pimlicoClient,
      bundlerTransport: http(pimlicoUrl),
    });

    console.log("✅ Smart account client created");

    // Step 8: Check if authorization is needed
    const isSmartAccountDeployed = await smartAccountClient.account.isDeployed();
    console.log("Authorization already set:", isSmartAccountDeployed);

    // Step 9: Build PYUSD transfer call data
    const transferData = encodeFunctionData({
      abi: PYUSD_ABI,
      functionName: "transfer",
      args: [recipientAddress, amountInWei],
    });

    console.log("📝 Transfer data built");

    // Step 10: Send transaction (following Pimlico's exact pattern)
    let transactionHash: Hex;

    if (!isSmartAccountDeployed) {
      // First transaction: include EIP-7702 authorization
      console.log("🔐 First transaction - signing EIP-7702 authorization...");

      const authorization = await eoa7702.signAuthorization({
        contractAddress: CONTRACTS.SIMPLE_ACCOUNT_IMPLEMENTATION,
        chainId: sepolia.id,
        nonce: await client.getTransactionCount({ address: eoa7702.address }),
      });

      console.log("✅ Authorization signed");

      transactionHash = await smartAccountClient.sendTransaction({
        to: CONTRACTS.PYUSD,
        value: 0n,
        data: transferData,
        authorization: authorization as any,
      });
    } else {
      // Subsequent transactions: authorization already set
      console.log("✅ Using existing authorization");

      transactionHash = await smartAccountClient.sendTransaction({
        to: CONTRACTS.PYUSD,
        value: 0n,
        data: transferData,
      });
    }

    console.log("✅ Gasless transaction submitted!");
    console.log("Transaction hash:", transactionHash);

    return {
      success: true,
      txHash: transactionHash,
      address: eoa7702.address,
    };
  } catch (error) {
    console.error("❌ Gasless payment failed:", error);
    throw error;
  }
}
