# Gasless PYUSD Payments

A clean Next.js application for sending PYUSD on Sepolia without paying gas fees using EIP-7702 + Pimlico + Privy.

## Features

- ✅ **Privy Authentication**: Secure embedded wallet with email/wallet login
- ✅ **EIP-7702 Support**: Make your EOA act as a smart account
- ✅ **Gasless Transactions**: Pimlico sponsors gas fees
- ✅ **PYUSD Integration**: Real PYUSD transfers on Sepolia
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
2. **Test Basic Transactions**: Verify Privy wallet works with regular ETH/PYUSD transfers
3. **Send Gasless Payments**: Use EIP-7702 + Pimlico for gasless PYUSD transfers

## Architecture

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Authentication**: Privy with embedded wallets
- **Blockchain**: Viem for Ethereum interactions
- **Account Abstraction**: Permissionless for EIP-7702
- **Gas Sponsorship**: Pimlico for gasless transactions

## Key Files

- `src/app/page.tsx` - Main application interface
- `src/lib/privyGaslessPayment.ts` - Gasless payment implementation
- `src/lib/basicPrivyTest.ts` - Basic transaction tests
- `src/lib/constants.ts` - Configuration constants
- `src/components/PrivyProviderWrapper.tsx` - Privy provider setup

## Testing

The app includes basic transaction tests to verify:

1. Privy wallet connectivity
2. ETH transfer functionality
3. PYUSD transfer functionality
4. Gasless payment implementation

## Network

- **Chain**: Sepolia Testnet
- **PYUSD Contract**: `0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9`
- **EIP-7702 Implementation**: `0xe6Cae83BdE06E4c305530e199D7217f42808555B`
