import { CONTRACTS, PIMLICO, RPC_ENDPOINTS, TOKENS } from "./constants";
import { Implementation, getDeleGatorEnvironment, toMetaMaskSmartAccount } from "@metamask/delegation-toolkit";
import {
  createPublicClient,
  createWalletClient,
  custom,
  encodeFunctionData,
  formatUnits,
  http,
  zeroAddress,
} from "viem";
import { createBundlerClient } from "viem/account-abstraction";
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
  amount: string;
}

// MetaMask EIP-7702 gasless payment using delegation toolkit
// Note: This requires a private key for the initial EIP-7702 authorization
// due to viem's signAuthorization limitation with JSON-RPC accounts
export async function executeMetaMaskGaslessPayment({ recipientAddress, amount }: GaslessPaymentParams) {
  try {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      throw new Error("MetaMask not found");
    }

    // Check for private key (required for EIP-7702 authorization)
    const privateKey = process.env.NEXT_PUBLIC_DEMO_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("NEXT_PUBLIC_DEMO_PRIVATE_KEY required for MetaMask EIP-7702 authorization");
    }

    console.log("🚀 Starting MetaMask EIP-7702 gasless payment...");

    // Step 1: Set up clients
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(RPC_ENDPOINTS.SEPOLIA),
    });

    // Create local account for authorization signing
    const localAccount = privateKeyToAccount(privateKey as `0x${string}`);
    const authWalletClient = createWalletClient({
      account: localAccount,
      chain: sepolia,
      transport: http(RPC_ENDPOINTS.SEPOLIA),
    });

    // Create MetaMask wallet client for user operations
    const metamaskWalletClient = createWalletClient({
      chain: sepolia,
      transport: custom((window as any).ethereum),
      account: localAccount, // Use local account for consistency
    });

    const [connectedAddress] = await metamaskWalletClient.getAddresses();
    if (!connectedAddress) {
      throw new Error("No connected wallet address found");
    }

    console.log("✅ Connected wallet address:", connectedAddress);
    console.log("✅ Local account for authorization:", localAccount.address);

    // Step 2: Check PYUSD balance
    const amountInWei = BigInt(parseFloat(amount) * 10 ** TOKENS.PYUSD.decimals);
    const pyusdBalance = (await publicClient.readContract({
      address: CONTRACTS.PYUSD,
      abi: PYUSD_ABI,
      functionName: "balanceOf",
      args: [connectedAddress],
    })) as bigint;

    console.log("User PYUSD balance:", formatUnits(pyusdBalance, TOKENS.PYUSD.decimals), "PYUSD");

    if (pyusdBalance < amountInWei) {
      throw new Error(
        `Insufficient PYUSD balance. Required: ${amount} PYUSD, Available: ${formatUnits(pyusdBalance, TOKENS.PYUSD.decimals)} PYUSD`,
      );
    }

    // Step 3: Get MetaMask delegation environment
    const environment = getDeleGatorEnvironment(sepolia.id);
    const contractAddress = environment.implementations.EIP7702StatelessDeleGatorImpl;

    console.log("✅ MetaMask delegation contract:", contractAddress);

    // Step 4: Create authorization for EIP-7702 delegation using local account
    const authorization = await authWalletClient.signAuthorization({
      account: localAccount,
      contractAddress,
      executor: "self",
    });

    console.log("✅ EIP-7702 authorization signed:", authorization);

    // Step 5: Submit the authorization (EIP-7702 transaction)
    const authHash = await authWalletClient.sendTransaction({
      authorizationList: [authorization],
      data: "0x",
      to: zeroAddress,
    });

    console.log("✅ EIP-7702 authorization submitted:", authHash);

    // Step 6: Create MetaMask smart account
    const smartAccount = await toMetaMaskSmartAccount({
      client: publicClient,
      implementation: Implementation.Stateless7702,
      address: localAccount.address, // Use the local account address for the smart account
      signer: { walletClient: metamaskWalletClient },
    });

    console.log("✅ MetaMask smart account created:", smartAccount.address);

    // Step 7: Set up bundler client for user operations
    const pimlicoAPIKey = process.env.NEXT_PUBLIC_PIMLICO_API_KEY;
    if (!pimlicoAPIKey) {
      throw new Error("NEXT_PUBLIC_PIMLICO_API_KEY not found");
    }

    const pimlicoUrl = PIMLICO.SEPOLIA_RPC_URL(pimlicoAPIKey);
    const bundlerClient = createBundlerClient({
      client: publicClient,
      transport: http(pimlicoUrl),
    });

    console.log("✅ Bundler client created");

    // Step 8: Prepare PYUSD transfer call data
    const transferData = encodeFunctionData({
      abi: PYUSD_ABI,
      functionName: "transfer",
      args: [recipientAddress, amountInWei],
    });

    console.log("📝 Transfer data prepared");

    // Step 9: Send user operation (gasless transaction)
    const userOperationHash = await bundlerClient.sendUserOperation({
      account: smartAccount,
      calls: [
        {
          to: CONTRACTS.PYUSD,
          data: transferData,
        },
      ],
      maxFeePerGas: 1n, // Pimlico will handle gas estimation
      maxPriorityFeePerGas: 1n,
    });

    console.log("✅ Gasless user operation submitted!");
    console.log("User operation hash:", userOperationHash);

    return {
      success: true,
      txHash: userOperationHash,
      address: localAccount.address, // Return the smart account address
      authHash, // EIP-7702 authorization transaction
    };
  } catch (error) {
    console.error("❌ MetaMask gasless payment failed:", error);
    throw error;
  }
}
