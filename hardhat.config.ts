import { HardhatUserConfig, configVariable } from "hardhat/config";
import hardhatViem from "@nomicfoundation/hardhat-viem";
import hardhatIgnition from "@nomicfoundation/hardhat-ignition-viem";
import hardhatKeystore from "@nomicfoundation/hardhat-keystore";
import "@nomicfoundation/hardhat-verify";

const config: HardhatUserConfig = {
  plugins: [hardhatViem, hardhatIgnition, hardhatKeystore],
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      type: "edr-simulated",
      chainId: 1337,
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
      chainId: 11155111,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  etherscan: {
    apiKey: {
      'sepolia': 'empty' // Not required by blockscout, can be any non-empty string
    },
    customChains: [
      {
        network: "sepolia",
        chainId: 11155111,
        urls: {
          apiURL: "https://eth-sepolia.blockscout.com/api",
          browserURL: "https://eth-sepolia.blockscout.com"
        }
      }
    ]
  },
  sourcify: {
    enabled: false
  }
};

export default config;
