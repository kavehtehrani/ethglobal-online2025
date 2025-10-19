import { CONTRACTS, PIMLICO, RPC_ENDPOINTS, TOKENS } from "./constants";
import { createSmartAccountClient } from "permissionless";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import {
  Hex,
  createPublicClient,
  createWalletClient,
  custom,
  encodeFunctionData,
  formatUnits,
  http,
  zeroAddress,
} from "viem";
import { entryPoint08Address } from "viem/account-abstraction";
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

// Privy EIP-7702 gasless payment using embedded wallet
export async function executePrivyGaslessPayment({
  recipientAddress,
  amount,
  embeddedWallet,
  signAuthorization,
  walletClient,
}: GaslessPaymentParams & {
  embeddedWallet: any;
  signAuthorization: (auth: any) => Promise<any>;
  walletClient: any;
}) {
  try {
    console.log("🚀 Starting Privy EIP-7702 gasless payment...");

    // Step 1: Set up clients
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(RPC_ENDPOINTS.SEPOLIA),
    });

    console.log("✅ Public client created");

    // Step 2: Check PYUSD balance
    const amountInWei = BigInt(parseFloat(amount) * 10 ** TOKENS.PYUSD.decimals);
    const pyusdBalance = (await publicClient.readContract({
      address: CONTRACTS.PYUSD,
      abi: PYUSD_ABI,
      functionName: "balanceOf",
      args: [embeddedWallet.address],
    })) as bigint;

    console.log("User PYUSD balance:", formatUnits(pyusdBalance, TOKENS.PYUSD.decimals), "PYUSD");

    if (pyusdBalance < amountInWei) {
      throw new Error(
        `Insufficient PYUSD balance. Required: ${amount} PYUSD, Available: ${formatUnits(pyusdBalance, TOKENS.PYUSD.decimals)} PYUSD`,
      );
    }

    // Step 2.5: Verify SimpleAccount implementation has code on-chain
    const implementationAddress = "0xe6Cae83BdE06E4c305530e199D7217f42808555B"; // From tutorial
    const implementationCode = await publicClient.getCode({ address: implementationAddress });
    console.log(
      "🔎 Implementation code check:",
      implementationAddress,
      implementationCode && implementationCode !== "0x" ? `len=${implementationCode.length}` : "NO CODE",
    );
    if (!implementationCode || implementationCode === "0x") {
      throw new Error(
        `SimpleAccount implementation has no code on Sepolia at ${implementationAddress}. This address from the tutorial may not be deployed on Sepolia.`,
      );
    }

    // Step 3: Use the wallet client from wagmi (following Privy tutorial exactly)
    if (!walletClient) {
      throw new Error("Wallet client not available");
    }

    console.log("✅ Wallet client available");
    console.log("🔍 Wallet addresses:", {
      embeddedWalletAddress: embeddedWallet.address,
      walletClientAddress: walletClient.account.address,
      implementationAddress: "0xe6Cae83BdE06E4c305530e199D7217f42808555B",
      addressesMatch: embeddedWallet.address === walletClient.account.address,
    });

    // Step 4: Set up Pimlico client (following Privy docs exactly)
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

    // Step 5: Create simple smart account (following Privy docs exactly)
    const simpleSmartAccount = await toSimpleSmartAccount({
      owner: walletClient,
      entryPoint: {
        address: entryPoint08Address,
        version: "0.8",
      },
      client: publicClient,
      address: walletClient.account.address,
    });

    console.log("✅ Simple smart account created:", simpleSmartAccount.address);

    // Step 6: Create smart account client (following Privy docs exactly)
    const smartAccountClient = createSmartAccountClient({
      account: simpleSmartAccount,
      chain: sepolia,
      bundlerTransport: http(pimlicoUrl),
      paymaster: pimlicoClient,
      userOperation: {
        estimateFeesPerGas: async () => {
          return (await pimlicoClient.getUserOperationGasPrice()).fast;
        },
      },
    });

    console.log("✅ Smart account client created");

    // Step 7: Sign the EIP-7702 authorization (following Privy docs exactly)
    console.log("🔐 Signing EIP-7702 authorization...");

    const authorization = await signAuthorization({
      contractAddress: "0xe6Cae83BdE06E4c305530e199D7217f42808555B", // Simple account implementation address from tutorial
      chainId: sepolia.id,
      nonce: await publicClient.getTransactionCount({
        address: walletClient.account.address,
      }),
    });

    console.log("✅ EIP-7702 authorization signed:", authorization);

    // Ensure the authorization object has the correct structure for the bundler
    const fullAuthorization = {
      contractAddress: "0xe6Cae83BdE06E4c305530e199D7217f42808555B",
      address: walletClient.account.address, // This must be the EOA, not the implementation
      chainId: authorization.chainId,
      nonce: authorization.nonce,
      r: authorization.r,
      s: authorization.s,
      v: authorization.v,
    };

    console.log("🔍 Final authorization object:", {
      contractAddress: fullAuthorization.contractAddress,
      address: fullAuthorization.address,
      chainId: fullAuthorization.chainId,
      nonce: fullAuthorization.nonce,
      hasSignature: !!(fullAuthorization.r && fullAuthorization.s && fullAuthorization.v),
    });

    // Step 8: Build PYUSD transfer call data
    const transferData = encodeFunctionData({
      abi: PYUSD_ABI,
      functionName: "transfer",
      args: [recipientAddress, amountInWei],
    });

    console.log("📝 Transfer data built");

    // Step 9: Send gas-sponsored transaction (following Privy docs exactly)
    console.log("🚀 Sending gas-sponsored transaction...");

    const sponsorshipPolicyId = process.env.NEXT_PUBLIC_SPONSORSHIP_POLICY_ID;

    if (!sponsorshipPolicyId) {
      throw new Error(
        "Missing NEXT_PUBLIC_SPONSORSHIP_POLICY_ID. Configure Pimlico Gas Sponsorship policy or remove gasless requirement.",
      );
    }

    const transactionHash = await smartAccountClient.sendTransaction({
      calls: [
        {
          to: CONTRACTS.PYUSD,
          data: transferData,
          value: BigInt(0),
        },
      ],
      factory: "0x7702",
      factoryData: "0x",
      paymasterContext: {
        sponsorshipPolicyId,
      },
      authorization: fullAuthorization,
    });

    console.log("✅ Gasless transaction submitted!");
    console.log("Transaction hash:", transactionHash);

    return {
      success: true,
      txHash: transactionHash,
      address: embeddedWallet.address,
    };
  } catch (error) {
    console.error("❌ Privy gasless payment failed:", error);
    throw error;
  }
}
