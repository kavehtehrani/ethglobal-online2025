// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockPYUSD
 * @dev Mock PYUSD token for local testing only
 * Real PYUSD is deployed at 0x6c3ea9036406852006290770bedfcaba0e23a0e8 on mainnet
 */
contract MockPYUSD is ERC20 {
    constructor() ERC20("PayPal USD", "PYUSD") {
        // Mint initial supply to deployer for testing
        _mint(msg.sender, 1000000 * 10 ** 6); // 1M PYUSD (6 decimals)
    }

    /**
     * @dev Mint tokens for testing purposes
     * @param to Address to mint tokens to
     * @param amount Amount to mint (in smallest unit, 6 decimals)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @dev Override decimals to match real PYUSD (6 decimals)
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
