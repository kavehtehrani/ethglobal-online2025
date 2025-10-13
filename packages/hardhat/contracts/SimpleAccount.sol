// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SimpleAccount
 * @dev Minimal EIP-7702 compatible account implementation
 * Allows EOAs to delegate execution to this contract via EIP-7702
 */
contract SimpleAccount {
    /**
     * @dev Execute a call on behalf of the account
     * @param target Target contract address
     * @param value ETH value to send
     * @param data Calldata to send
     */
    function execute(address target, uint256 value, bytes calldata data) external payable {
        (bool success, ) = target.call{ value: value }(data);
        require(success, "SimpleAccount: execution failed");
    }

    /**
     * @dev Receive ETH
     */
    receive() external payable {}
}
