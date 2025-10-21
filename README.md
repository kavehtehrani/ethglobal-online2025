# Gasless PYUSD Payments

A clean Next.js application for sending PYUSD on Sepolia without paying gas fees using EIP-7702 + Pimlico + Privy with smart contract-based tiered fee system.

## Features

- ✅ **Privy Authentication**: Secure embedded wallet with email/wallet login
- ✅ **EIP-7702 Support**: Make your EOA act as a smart account
- ✅ **Gasless Transactions**: Pimlico sponsors gas fees
- ✅ **Smart Contract Tier System**: TransactionCounter.sol tracks usage and determines free/paid transactions
- ✅ **PYUSD Integration**: Real PYUSD transfers on Sepolia
- ✅ **Compact UI**: Streamlined interface with integrated balance display
- ✅ **Tier Status Display**: Real-time free/paid transaction indicators
- ✅ **Clean Architecture**: No Scaffold-ETH complexity

## Setup

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Create environment file**:
   Create `.env.local` with:

   ```env
   # Privy Configuration
   NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here
   PRIVY_SECRET=your_privy_secret

   # Pimlico Configuration
   NEXT_PUBLIC_PIMLICO_API_KEY=your_pimlico_api_key_here
   NEXT_PUBLIC_SPONSORSHIP_POLICY_ID=your_sponsorship_policy_id_here

   # Optional: Custom EIP-7702 Implementation
   # NEXT_PUBLIC_7702_IMPLEMENTATION=0xYourImplementationAddress
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

## Usage

1. **Login with Privy**: Use email or wallet to authenticate
2. **View Tier Status**: See your current free/paid transaction status
3. **Test Basic Transactions**: Verify Privy wallet works with regular ETH/PYUSD transfers
4. **Send Gasless Payments**: Use EIP-7702 + Pimlico for gasless PYUSD transfers with smart contract fee logic

## Architecture

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Authentication**: Privy with embedded wallets
- **Blockchain**: Viem for Ethereum interactions
- **Account Abstraction**: Permissionless for EIP-7702
- **Gas Sponsorship**: Pimlico for gasless transactions
- **Smart Contract**: TransactionCounter.sol for tiered fee logic
- **Tier System**: 5 free transactions, then 1 in 5 free with service fees

## Key Files

- `src/app/page.tsx` - Main application interface with compact layout
- `src/components/TierStatus.tsx` - Tier status display component
- `src/lib/privyGaslessPayment.ts` - Gasless payment implementation
- `src/lib/basicPrivyTest.ts` - Basic transaction tests
- `src/lib/constants.ts` - Configuration constants
- `src/components/PrivyProviderWrapper.tsx` - Privy provider setup
- `contracts/TransactionCounter.sol` - Smart contract for tiered fee logic
- `test/TransactionCounter.sol` - Comprehensive smart contract tests

## Testing

The app includes comprehensive tests to verify:

1. **Smart Contract Tests**: TransactionCounter.sol with 20+ test cases
2. **Privy wallet connectivity**: Basic ETH/PYUSD transfers
3. **Gasless payment implementation**: EIP-7702 + Pimlico integration
4. **Tier system logic**: Free/paid transaction calculations
5. **UI components**: Tier status display and compact layout

## Network

- **Chain**: Sepolia Testnet
- **PYUSD Contract**: `0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9`
- **EIP-7702 Implementation**: `0xe6Cae83BdE06E4c305530e199D7217f42808555B`
- **TransactionCounter Contract**: Deployed smart contract for tier tracking

## Smart Contract Integration

The `TransactionCounter.sol` contract implements a tiered fee system:

- **Free Tier**: First 5 transactions are completely free
- **Paid Tier**: After 5 transactions, every 5th transaction is free (1 in 5)
- **Service Fees**: Paid transactions include 0.5% service fee
- **Real-time Tracking**: Contract tracks user transaction counts
- **EIP-7702 Integration**: Works seamlessly with EIP-7702 transactions

## UI Improvements

- **Compact Layout**: Integrated balance display in authentication section
- **Tier Status**: Real-time free/paid transaction indicators
- **Responsive Design**: Optimized for desktop and mobile
- **Theme Support**: Light/dark mode with proper color theming
