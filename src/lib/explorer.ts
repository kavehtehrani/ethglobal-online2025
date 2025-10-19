/**
 * Utility functions for generating blockchain explorer links
 */

export type ExplorerLinkType = "tx" | "address";

/**
 * Generate a Blockscout explorer link for Sepolia testnet
 * @param type - The type of link ('tx' for transaction, 'address' for wallet address)
 * @param hash - The transaction hash or wallet address
 * @returns The full Blockscout URL
 */
export function getExplorerLink(type: ExplorerLinkType, hash: string): string {
  const baseUrl = "https://eth-sepolia.blockscout.com";

  switch (type) {
    case "tx":
      return `${baseUrl}/tx/${hash}`;
    case "address":
      return `${baseUrl}/address/${hash}`;
    default:
      throw new Error(`Invalid explorer link type: ${type}`);
  }
}

/**
 * Generate a transaction explorer link
 * @param txHash - The transaction hash
 * @returns The full Blockscout transaction URL
 */
export function getTransactionLink(txHash: string): string {
  return getExplorerLink("tx", txHash);
}

/**
 * Generate an address explorer link
 * @param address - The wallet address
 * @returns The full Blockscout address URL
 */
export function getAddressLink(address: string): string {
  return getExplorerLink("address", address);
}
