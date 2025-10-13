"use client";

import { useEffect, useState } from "react";
import { Address as AddressType, createWalletClient, http, parseUnits } from "viem";
import { hardhat } from "viem/chains";
import { useAccount } from "wagmi";
import { BanknotesIcon } from "@heroicons/react/24/outline";
import { Address, AddressInput } from "~~/components/scaffold-eth";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

// Account index to use from generated hardhat accounts.
const FAUCET_ACCOUNT_INDEX = 0;

const localWalletClient = createWalletClient({
  chain: hardhat,
  transport: http(),
});

/**
 * PYUSD Faucet modal which lets you send MockPYUSD to any address.
 */
export const PYUSDFaucet = () => {
  const [loading, setLoading] = useState(false);
  const [inputAddress, setInputAddress] = useState<AddressType>();
  const [faucetAddress, setFaucetAddress] = useState<AddressType>();
  const [sendValue, setSendValue] = useState("1000"); // Default 1000 PYUSD

  const { chain: ConnectedChain } = useAccount();

  const { writeContractAsync: writeMockPYUSDAsync } = useScaffoldWriteContract({
    contractName: "MockPYUSD",
  });

  useEffect(() => {
    const getFaucetAddress = async () => {
      try {
        const accounts = await localWalletClient.getAddresses();
        setFaucetAddress(accounts[FAUCET_ACCOUNT_INDEX]);
      } catch (error) {
        notification.error(
          <>
            <p className="font-bold mt-0 mb-1">Cannot connect to local provider</p>
            <p className="m-0">
              - Did you forget to run <code className="italic bg-base-300 text-base font-bold">yarn chain</code> ?
            </p>
            <p className="mt-1 break-normal">
              - Or you can change <code className="italic bg-base-300 text-base font-bold">targetNetwork</code> in{" "}
              <code className="italic bg-base-300 text-base font-bold">scaffold.config.ts</code>
            </p>
          </>,
        );
        console.error("⚡️ ~ file: PYUSDFaucet.tsx:getFaucetAddress ~ error", error);
      }
    };
    getFaucetAddress();
  }, []);

  const sendPYUSD = async () => {
    if (!inputAddress || !sendValue) {
      notification.error("Please enter recipient address and amount");
      return;
    }

    try {
      setLoading(true);

      // Convert amount to proper units (6 decimals for PYUSD)
      const amountInWei = parseUnits(sendValue, 6);

      await writeMockPYUSDAsync({
        functionName: "mint",
        args: [inputAddress, amountInWei],
      });

      notification.success(`✅ Sent ${sendValue} PYUSD to ${inputAddress}`);
      setInputAddress(undefined);
      setSendValue("1000");
    } catch (error) {
      console.error("⚡️ ~ file: PYUSDFaucet.tsx:sendPYUSD ~ error", error);
      notification.error("Failed to send PYUSD");
    } finally {
      setLoading(false);
    }
  };

  // Render only on local chain
  if (ConnectedChain?.id !== hardhat.id) {
    return null;
  }

  return (
    <div>
      <label htmlFor="pyusd-faucet-modal" className="btn btn-secondary btn-sm font-normal gap-1">
        <BanknotesIcon className="h-4 w-4" />
        <span>PYUSD Faucet</span>
      </label>
      <input type="checkbox" id="pyusd-faucet-modal" className="modal-toggle" />
      <label htmlFor="pyusd-faucet-modal" className="modal cursor-pointer">
        <label className="modal-box relative">
          {/* dummy input to capture event onclick on modal box */}
          <input className="h-0 w-0 absolute top-0 left-0" />
          <h3 className="text-xl font-bold mb-3">PYUSD Faucet</h3>
          <label htmlFor="pyusd-faucet-modal" className="btn btn-ghost btn-sm btn-circle absolute right-3 top-3">
            ✕
          </label>
          <div className="space-y-3">
            <div className="flex space-x-4">
              <div>
                <span className="text-sm font-bold">From:</span>
                <Address address={faucetAddress} onlyEnsOrAddress />
              </div>
              <div>
                <span className="text-sm font-bold pl-3">Token:</span>
                <span className="text-sm">MockPYUSD</span>
              </div>
            </div>
            <div className="flex flex-col space-y-3">
              <AddressInput
                placeholder="Destination Address"
                value={inputAddress ?? ""}
                onChange={value => setInputAddress(value as AddressType)}
              />
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Amount (PYUSD)</span>
                </label>
                <input
                  type="number"
                  placeholder="1000"
                  className="input input-bordered w-full"
                  value={sendValue}
                  onChange={e => setSendValue(e.target.value)}
                />
              </div>
              <button
                className="h-10 btn btn-secondary btn-sm px-2 rounded-full"
                onClick={sendPYUSD}
                disabled={loading || !inputAddress || !sendValue}
              >
                {!loading ? (
                  <BanknotesIcon className="h-6 w-6" />
                ) : (
                  <span className="loading loading-spinner loading-sm"></span>
                )}
                <span>Send PYUSD</span>
              </button>
            </div>
            <div className="text-xs text-base-content/70">
              💡 This faucet mints new MockPYUSD tokens for testing purposes
            </div>
          </div>
        </label>
      </label>
    </div>
  );
};
