"use client";

import { ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { sepolia } from "viem/chains";

interface PrivyProviderWrapperProps {
  children: ReactNode;
}

export function PrivyProviderWrapper({ children }: PrivyProviderWrapperProps) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    console.error(
      "❌ NEXT_PUBLIC_PRIVY_APP_ID not found in environment variables"
    );
    return <div>Error: Privy App ID not configured</div>;
  }

  console.log("🔧 Privy Provider Config:", {
    appId: appId.substring(0, 8) + "...",
    embeddedWallets: {
      showWalletUIs: false,
      createOnLogin: "all-users",
      noPromptOnSignature: false,
    },
    loginMethods: ["email", "wallet"],
  });

  return (
    <PrivyProvider
      appId={appId}
      config={{
        embeddedWallets: {
          showWalletUIs: false,
          createOnLogin: "all-users",
          noPromptOnSignature: false,
        },
        defaultChain: sepolia,
        supportedChains: [sepolia],
        loginMethods: ["email", "wallet"],
        appearance: {
          theme: "dark",
          accentColor: "#676fff",
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
