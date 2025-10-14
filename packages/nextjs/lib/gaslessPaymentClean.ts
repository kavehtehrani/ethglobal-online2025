import { CONTRACTS, EIP7702, PIMLICO, RPC_ENDPOINTS, TOKENS } from "./constants";
import { createSmartAccountClient } from "permissionless";
import { to7702SimpleSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { createPublicClient, encodeFunctionData, formatUnits, http, zeroAddress } from "viem";
import { sepolia } from "viem/chains";

// Contract ABIs
const SIMPLE_ACCOUNT_ABI = [
  {
    inputs: [
      { name: "target", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
    name: "execute",
    outputs: [{ name: "result", type: "bytes" }],
    stateMutability: "payable",
    type: "function",
  },
] as const;

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
    console.log("🚀 Starting REAL gasless payment on Sepolia using EIP-7702...");

    // Create public client
    const client = createPublicClient({
      chain: sepolia,
      transport: http(RPC_ENDPOINTS.SEPOLIA),
    });

    // Create Pimlico client
    const pimlicoAPIKey = process.env.NEXT_PUBLIC_PIMLICO_API_KEY;
    if (!pimlicoAPIKey) {
      throw new Error("Pimlico API key not found");
    }

    const pimlicoUrl = PIMLICO.SEPOLIA_RPC_URL(pimlicoAPIKey);
    const pimlicoClient = createPimlicoClient({
      chain: sepolia,
      transport: http(pimlicoUrl),
    });

    // Create a wallet-compatible EOA account following the demo pattern
    const eoa7702 = {
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
      signAuthorization: async (authorization: any) => {
        console.log("Signing EIP-7702 authorization:", authorization);

        // Sign the EIP-7702 authorization using the user's wallet
        const signature = await signTypedData({
          domain: {
            ...EIP7702.DOMAIN,
            chainId: sepolia.id,
          },
          types: EIP7702.TYPES,
          primaryType: EIP7702.PRIMARY_TYPE,
          message: authorization,
        });

        console.log("EIP-7702 Authorization signature:", signature);
        return signature;
      },
    };

    // Create 7702 Simple Smart Account following the demo
    const simple7702Account = await to7702SimpleSmartAccount({
      client,
      owner: eoa7702,
    });

    console.log("EIP-7702 Smart account address:", simple7702Account.address);
    console.log("User EOA address:", userAddress);
    console.log("Addresses match:", simple7702Account.address.toLowerCase() === userAddress.toLowerCase());

    // Create Smart Account Client following the demo
    const smartAccountClient = createSmartAccountClient({
      client,
      chain: sepolia,
      account: simple7702Account,
      paymaster: pimlicoClient,
      bundlerTransport: http(pimlicoUrl),
    });

    // Check if smart account is deployed (should be false for EIP-7702)
    const isSmartAccountDeployed = await smartAccountClient.account.isDeployed();
    console.log("Smart account deployed:", isSmartAccountDeployed);

    // Build PYUSD transfer call
    const amountInWei = BigInt(parseFloat(amount) * 10 ** TOKENS.PYUSD.decimals);
    const transferData = encodeFunctionData({
      abi: PYUSD_ABI,
      functionName: "transfer",
      args: [recipientAddress, amountInWei],
    });

    console.log("Transfer data built:", transferData);

    // Check PYUSD balance before proceeding
    const pyusdBalance = (await client.readContract({
      address: CONTRACTS.PYUSD,
      abi: PYUSD_ABI,
      functionName: "balanceOf",
      args: [userAddress],
    })) as bigint;

    console.log("User PYUSD balance:", pyusdBalance.toString());
    console.log("Transfer amount:", amountInWei.toString());

    if (pyusdBalance < amountInWei) {
      throw new Error(
        `Insufficient PYUSD balance. Required: ${amount} PYUSD, Available: ${formatUnits(pyusdBalance, TOKENS.PYUSD.decimals)} PYUSD`,
      );
    }

    // Send transaction following the exact demo pattern
    console.log("Sending transaction with EIP-7702 authorization...");

    let transactionHash: `0x${string}`;

    // We only have to add the authorization field if the EOA does not have the authorization code set
    if (!isSmartAccountDeployed) {
      console.log("Smart account not deployed, adding authorization...");

      transactionHash = await smartAccountClient.sendTransaction({
        to: CONTRACTS.PYUSD,
        value: 0n,
        data: transferData,
        authorization: await eoa7702.signAuthorization({
          address: CONTRACTS.SIMPLE_ACCOUNT_IMPLEMENTATION,
          chainId: sepolia.id,
          nonce: await client.getTransactionCount({
            address: userAddress,
          }),
        }),
      });
    } else {
      console.log("Smart account already deployed, sending without authorization...");

      transactionHash = await smartAccountClient.sendTransaction({
        to: CONTRACTS.PYUSD,
        value: 0n,
        data: transferData,
      });
    }

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
