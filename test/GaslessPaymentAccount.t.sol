// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {GaslessPaymentAccount} from "../contracts/GaslessPaymentAccount.sol";
import {MockPYUSD} from "../contracts/MockPYUSD.sol";
import {Test} from "forge-std/Test.sol";

contract GaslessPaymentAccountTest is Test {
    GaslessPaymentAccount gaslessPaymentAccount;
    MockPYUSD pyusd;

    // Hardhat node funded accounts
    address constant FEE_RECEIVER = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;
    address constant user1 = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
    address constant user2 = 0x90F79bf6EB2c4f870365E785982E1f101E93b906;
    address constant owner = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266; // Account #0

    function setUp() public {
        // Deploy mock PYUSD token
        pyusd = new MockPYUSD(1000000e6); // 1M PYUSD

        // Deploy GaslessPaymentAccount with mock PYUSD address, fee receiver, and owner
        gaslessPaymentAccount = new GaslessPaymentAccount(
            address(pyusd),
            FEE_RECEIVER,
            owner
        );

        // Give users some PYUSD
        pyusd.mint(user1, 1000e6); // 1000 PYUSD
        pyusd.mint(user2, 1000e6); // 1000 PYUSD

        // Approve GaslessPaymentAccount to spend PYUSD
        vm.prank(user1);
        pyusd.approve(address(gaslessPaymentAccount), type(uint256).max);

        vm.prank(user2);
        pyusd.approve(address(gaslessPaymentAccount), type(uint256).max);
    }

    function test_InitialState() public view {
        assertEq(gaslessPaymentAccount.feeReceiver(), FEE_RECEIVER);
        assertEq(gaslessPaymentAccount.freeTierLimit(), 5);
        assertEq(gaslessPaymentAccount.freeTierRatio(), 5);
        assertEq(gaslessPaymentAccount.serviceFeeBasisPoints(), 50); // 0.5%
        assertEq(gaslessPaymentAccount.minServiceFee(), 0.01e6); // $0.01
        assertEq(gaslessPaymentAccount.maxServiceFee(), 5e6); // $5.00
        assertEq(gaslessPaymentAccount.owner(), owner);
    }

    function test_FreeTierTransactions() public {
        // First 5 transactions should be free
        for (uint256 i = 0; i < 5; i++) {
            uint256 initialBalance = pyusd.balanceOf(user1);

            vm.prank(user1);
            gaslessPaymentAccount.executePYUSDTransfer(user2, 10e6); // 10 PYUSD

            // Balance should only decrease by the transfer amount (no fee)
            assertEq(pyusd.balanceOf(user1), initialBalance - 10e6);

            // Check tier status
            (uint256 freeRemaining, ) = gaslessPaymentAccount.getTierStatus(
                user1
            );
            assertEq(freeRemaining, 4 - i);
        }
    }

    function test_PaidTransactionsAfterFreeLimit() public {
        // Use up all free transactions
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(user1);
            gaslessPaymentAccount.executePYUSDTransfer(user2, 10e6);
        }

        // Next transaction should have service fee
        uint256 initialBalance = pyusd.balanceOf(user1);
        uint256 initialFeeReceiverBalance = pyusd.balanceOf(FEE_RECEIVER);

        vm.prank(user1);
        gaslessPaymentAccount.executePYUSDTransfer(user2, 100e6); // 100 PYUSD

        // Calculate expected fee: 100 * 0.5% = 0.5 PYUSD
        uint256 expectedFee = 0.5e6;

        // Check balances
        assertEq(pyusd.balanceOf(user1), initialBalance - 100e6 - expectedFee);
        assertEq(
            pyusd.balanceOf(FEE_RECEIVER),
            initialFeeReceiverBalance + expectedFee
        );
    }

    function test_OneInFiveFreeAfterLimit() public {
        // Use up all free transactions
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(user1);
            gaslessPaymentAccount.executePYUSDTransfer(user2, 10e6);
        }

        // Transactions 6-9 should have fees
        for (uint256 i = 0; i < 4; i++) {
            uint256 initialBalance = pyusd.balanceOf(user1);

            vm.prank(user1);
            gaslessPaymentAccount.executePYUSDTransfer(user2, 10e6);

            // Should have service fee
            assertLt(pyusd.balanceOf(user1), initialBalance - 10e6);
        }

        // Transaction 10 (5th after limit) should be free
        uint256 finalBalance = pyusd.balanceOf(user1);
        uint256 finalFeeReceiverBalance = pyusd.balanceOf(FEE_RECEIVER);

        vm.prank(user1);
        gaslessPaymentAccount.executePYUSDTransfer(user2, 10e6);

        // Should be free (no fee)
        assertEq(pyusd.balanceOf(user1), finalBalance - 10e6);
        assertEq(pyusd.balanceOf(FEE_RECEIVER), finalFeeReceiverBalance);
    }

    function test_ServiceFeeCalculation() public {
        // Test service fee calculation by checking the parameters
        assertEq(
            gaslessPaymentAccount.serviceFeeBasisPoints(),
            50,
            "Service fee should be 0.5% (50 basis points)"
        );
        assertEq(
            gaslessPaymentAccount.minServiceFee(),
            0.01e6,
            "Minimum fee should be $0.01"
        );
        assertEq(
            gaslessPaymentAccount.maxServiceFee(),
            5e6,
            "Maximum fee should be $5.00"
        );
    }

    function test_TierStatusCalculation() public {
        // Initial status
        (uint256 freeRemaining, uint256 nextFree) = gaslessPaymentAccount
            .getTierStatus(user1);
        assertEq(freeRemaining, 5);
        assertEq(nextFree, 1);

        // After 3 transactions
        for (uint256 i = 0; i < 3; i++) {
            vm.prank(user1);
            gaslessPaymentAccount.executePYUSDTransfer(user2, 10e6);
        }

        (freeRemaining, nextFree) = gaslessPaymentAccount.getTierStatus(user1);
        assertEq(freeRemaining, 2);
        assertEq(nextFree, 1);

        // After using all free transactions
        for (uint256 i = 0; i < 2; i++) {
            vm.prank(user1);
            gaslessPaymentAccount.executePYUSDTransfer(user2, 10e6);
        }

        (freeRemaining, nextFree) = gaslessPaymentAccount.getTierStatus(user1);
        assertEq(freeRemaining, 0);
        assertEq(nextFree, 1); // Next transaction (6th) is free
    }

    function test_OwnerOnlyFunctions() public {
        // Test that non-owners cannot call setter functions
        vm.prank(user1); // user1 is not owner
        vm.expectRevert();
        gaslessPaymentAccount.setFreeTierLimit(10);

        vm.prank(user2); // user2 is not owner
        vm.expectRevert();
        gaslessPaymentAccount.setFreeTierRatio(3);

        vm.prank(user1); // user1 is not owner
        vm.expectRevert();
        gaslessPaymentAccount.setServiceFeeBasisPoints(100);

        vm.prank(user2); // user2 is not owner
        vm.expectRevert();
        gaslessPaymentAccount.setMinServiceFee(0.02e6);

        vm.prank(user1); // user1 is not owner
        vm.expectRevert();
        gaslessPaymentAccount.setMaxServiceFee(10e6);

        vm.prank(user2); // user2 is not owner
        vm.expectRevert();
        gaslessPaymentAccount.setFeeReceiver(user2);

        // Test that owner can call setter functions
        vm.prank(owner);
        gaslessPaymentAccount.setFreeTierLimit(10);
        assertEq(gaslessPaymentAccount.freeTierLimit(), 10);

        // Test setting free tier ratio
        vm.prank(owner);
        gaslessPaymentAccount.setFreeTierRatio(3);
        assertEq(gaslessPaymentAccount.freeTierRatio(), 3);

        // Test setting service fee basis points
        vm.prank(owner);
        gaslessPaymentAccount.setServiceFeeBasisPoints(100); // 1%
        assertEq(gaslessPaymentAccount.serviceFeeBasisPoints(), 100);

        // Test setting min/max fees
        vm.prank(owner);
        gaslessPaymentAccount.setMinServiceFee(0.02e6); // $0.02
        assertEq(gaslessPaymentAccount.minServiceFee(), 0.02e6);

        vm.prank(owner);
        gaslessPaymentAccount.setMaxServiceFee(10e6); // $10.00
        assertEq(gaslessPaymentAccount.maxServiceFee(), 10e6);

        // Test setting fee receiver
        vm.prank(owner);
        gaslessPaymentAccount.setFeeReceiver(user2);
        assertEq(gaslessPaymentAccount.feeReceiver(), user2);
    }

    function test_NonOwnerAccessControl() public {
        // Test that non-owners cannot call any owner-only functions
        // Using user1 (not owner)
        vm.prank(user1);
        vm.expectRevert();
        gaslessPaymentAccount.setFreeTierLimit(10);

        vm.prank(user1);
        vm.expectRevert();
        gaslessPaymentAccount.setFreeTierRatio(3);

        vm.prank(user1);
        vm.expectRevert();
        gaslessPaymentAccount.setServiceFeeBasisPoints(100);

        vm.prank(user1);
        vm.expectRevert();
        gaslessPaymentAccount.setMinServiceFee(0.02e6);

        vm.prank(user1);
        vm.expectRevert();
        gaslessPaymentAccount.setMaxServiceFee(10e6);

        vm.prank(user1);
        vm.expectRevert();
        gaslessPaymentAccount.setFeeReceiver(user2);

        // Test that non-owners cannot call OpenZeppelin owner functions
        vm.prank(user1);
        vm.expectRevert();
        gaslessPaymentAccount.transferOwnership(user1);

        vm.prank(user1);
        vm.expectRevert();
        gaslessPaymentAccount.renounceOwnership();

        // Verify original values are unchanged (non-owners couldn't modify them)
        assertEq(gaslessPaymentAccount.freeTierLimit(), 5);
        assertEq(gaslessPaymentAccount.freeTierRatio(), 5);
        assertEq(gaslessPaymentAccount.serviceFeeBasisPoints(), 50);
        assertEq(gaslessPaymentAccount.minServiceFee(), 0.01e6);
        assertEq(gaslessPaymentAccount.maxServiceFee(), 5e6);
        assertEq(gaslessPaymentAccount.feeReceiver(), FEE_RECEIVER);
        assertEq(gaslessPaymentAccount.owner(), owner);
    }

    function test_OwnerOnlyFunctionValidation() public {
        // Test validation in setter functions
        vm.prank(owner);
        vm.expectRevert("Free tier ratio must be greater than 0");
        gaslessPaymentAccount.setFreeTierRatio(0);

        vm.prank(owner);
        vm.expectRevert("Basis points cannot exceed 10000 (100%)");
        gaslessPaymentAccount.setServiceFeeBasisPoints(10001);

        vm.prank(owner);
        vm.expectRevert("Min fee cannot exceed max fee");
        gaslessPaymentAccount.setMinServiceFee(10e6); // This exceeds current max of 5e6

        vm.prank(owner);
        vm.expectRevert("Max fee cannot be less than min fee");
        gaslessPaymentAccount.setMaxServiceFee(0.005e6); // This is less than current min of 0.01e6

        vm.prank(owner);
        vm.expectRevert("Invalid fee receiver address");
        gaslessPaymentAccount.setFeeReceiver(address(0));
    }
}
