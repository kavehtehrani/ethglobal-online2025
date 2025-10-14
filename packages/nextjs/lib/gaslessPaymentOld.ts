import { createSmartAccountClient } from "permissionless";
import { to7702SimpleSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { createPublicClient, encodeFunctionData, formatUnits, http, zeroAddress } from "viem";
import { sepolia } from "viem/chains";
import { 
  CONTRACTS, 
  PIMLICO, 
  RPC_ENDPOINTS, 
  TOKENS, 
  EIP7702 
} from "./constants";

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

// Contract addresses
const SIMPLE_ACCOUNT_ADDRESS = "0x57192C5A0F4c44Aeb0208569345A7939a8c65578" as `0x${string}`;
const PYUSD_ADDRESS = "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9" as `0x${string}`;

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
            name: "EIP-7702",
            version: "1",
            chainId: sepolia.id,
          },
          types: {
            Authorization: [
              { name: "address", type: "address" },
              { name: "chainId", type: "uint256" },
              { name: "nonce", type: "uint256" },
            ],
          },
          primaryType: "Authorization",
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
    const amountInWei = BigInt(parseFloat(amount) * 10 ** 6); // PYUSD uses 6 decimals
    const transferData = encodeFunctionData({
      abi: PYUSD_ABI,
      functionName: "transfer",
      args: [recipientAddress, amountInWei],
    });

    console.log("Transfer data built:", transferData);

    // Check PYUSD balance before proceeding
    const pyusdBalance = (await client.readContract({
      address: PYUSD_ADDRESS,
      abi: PYUSD_ABI,
      functionName: "balanceOf",
      args: [userAddress],
    })) as bigint;

    console.log("User PYUSD balance:", pyusdBalance.toString());
    console.log("Transfer amount:", amountInWei.toString());

    if (pyusdBalance < amountInWei) {
      throw new Error(
        `Insufficient PYUSD balance. Required: ${amount} PYUSD, Available: ${formatUnits(pyusdBalance, 6)} PYUSD`,
      );
    }

    // Send transaction following the exact demo pattern
    console.log("Sending transaction with EIP-7702 authorization...");

    let transactionHash: `0x${string}`;

    // We only have to add the authorization field if the EOA does not have the authorization code set
    if (!isSmartAccountDeployed) {
      console.log("Smart account not deployed, adding authorization...");

      transactionHash = await smartAccountClient.sendTransaction({
        to: PYUSD_ADDRESS,
        value: 0n,
        data: transferData,
        authorization: await eoa7702.signAuthorization({
          address: "0xe6Cae83BdE06E4c305530e199D7217f42808555B", // SimpleAccount implementation from demo
          chainId: sepolia.id,
          nonce: await client.getTransactionCount({
            address: userAddress,
          }),
        }),
      });
    } else {
      console.log("Smart account already deployed, sending without authorization...");

      transactionHash = await smartAccountClient.sendTransaction({
        to: PYUSD_ADDRESS,
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
