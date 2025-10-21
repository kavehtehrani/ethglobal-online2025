// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../contracts/TransactionCounter.sol";

contract TransactionCounterTest is Test {
    TransactionCounter public transactionCounter;
    address public owner;
    address public user1;
    address public user2;
    address public nonOwner;

    event TransactionCountIncremented(address indexed user, uint256 newCount);
    event FreeTierConfigUpdated(uint256 newLimit, uint256 newRatio);

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        nonOwner = makeAddr("nonOwner");

        transactionCounter = new TransactionCounter(owner);
    }

    function testDeployment() public {
        assertEq(transactionCounter.owner(), owner);

        (uint256 limit, uint256 ratio) = transactionCounter.getFreeTierConfig();
        assertEq(limit, 5);
        assertEq(ratio, 5);

        assertEq(transactionCounter.getCount(user1), 0);
        assertEq(transactionCounter.getCount(user2), 0);
    }

    function testIncrementCount() public {
        vm.expectEmit(true, false, false, true);
        emit TransactionCountIncremented(user1, 1);

        transactionCounter.incrementCount(user1);
        assertEq(transactionCounter.getCount(user1), 1);
    }

    function testIncrementCountMultiple() public {
        transactionCounter.incrementCount(user1);
        transactionCounter.incrementCount(user1);
        transactionCounter.incrementCount(user1);

        assertEq(transactionCounter.getCount(user1), 3);
    }

    function testIncrementCountDifferentUsers() public {
        transactionCounter.incrementCount(user1);
        transactionCounter.incrementCount(user2);
        transactionCounter.incrementCount(user1);

        assertEq(transactionCounter.getCount(user1), 2);
        assertEq(transactionCounter.getCount(user2), 1);
    }

    function testUpdateFreeTierConfig() public {
        vm.expectEmit(false, false, false, true);
        emit FreeTierConfigUpdated(10, 3);

        transactionCounter.updateFreeTierConfig(10, 3);

        (uint256 limit, uint256 ratio) = transactionCounter.getFreeTierConfig();
        assertEq(limit, 10);
        assertEq(ratio, 3);
    }

    function testUpdateFreeTierConfigZeroRatio() public {
        vm.expectRevert("Free tier ratio must be > 0");
        transactionCounter.updateFreeTierConfig(10, 0);
    }

    function testUpdateFreeTierConfigNonOwner() public {
        vm.prank(nonOwner);
        vm.expectRevert();
        transactionCounter.updateFreeTierConfig(10, 3);
    }

    function testAccessControl() public {
        // Anyone can increment count
        vm.prank(user1);
        transactionCounter.incrementCount(user1);
        assertEq(transactionCounter.getCount(user1), 1);

        // Anyone can read count
        vm.prank(user2);
        uint256 count = transactionCounter.getCount(user1);
        assertEq(count, 1);

        // Anyone can read config
        vm.prank(user2);
        (uint256 limit, uint256 ratio) = transactionCounter.getFreeTierConfig();
        assertEq(limit, 5);
        assertEq(ratio, 5);
    }

    function testGasOptimization() public {
        uint256 gasStart = gasleft();
        transactionCounter.incrementCount(user1);
        uint256 gasUsed = gasStart - gasleft();

        console.log("Gas used for increment:", gasUsed);
        assertLt(gasUsed, 100000); // Should be less than 100k gas
    }

    function testConfigUpdateGas() public {
        uint256 gasStart = gasleft();
        transactionCounter.updateFreeTierConfig(10, 3);
        uint256 gasUsed = gasStart - gasleft();

        console.log("Gas used for config update:", gasUsed);
        assertLt(gasUsed, 150000); // Should be less than 150k gas
    }

    function testLargeTransactionCounts() public {
        // Test with large numbers
        for (uint256 i = 0; i < 1000; i++) {
            transactionCounter.incrementCount(user1);
        }

        assertEq(transactionCounter.getCount(user1), 1000);
    }

    function testZeroAddress() public {
        transactionCounter.incrementCount(address(0));
        assertEq(transactionCounter.getCount(address(0)), 1);
    }

    function testConfigPersistence() public {
        // Increment some counts
        transactionCounter.incrementCount(user1);
        transactionCounter.incrementCount(user1);

        // Change config
        transactionCounter.updateFreeTierConfig(10, 3);

        // Counts should remain the same
        assertEq(transactionCounter.getCount(user1), 2);

        // New config should be active
        (uint256 limit, uint256 ratio) = transactionCounter.getFreeTierConfig();
        assertEq(limit, 10);
        assertEq(ratio, 3);
    }

    function testBatchOperations() public {
        // Simulate batch increment
        transactionCounter.incrementCount(user1);
        transactionCounter.incrementCount(user2);
        transactionCounter.incrementCount(user1);

        assertEq(transactionCounter.getCount(user1), 2);
        assertEq(transactionCounter.getCount(user2), 1);
    }

    function testHighFrequencyUsage() public {
        // Simulate high-frequency usage
        for (uint256 i = 0; i < 20; i++) {
            transactionCounter.incrementCount(user1);
        }

        assertEq(transactionCounter.getCount(user1), 20);
    }

    function testConcurrentUsers() public {
        // Simulate concurrent users
        for (uint256 i = 0; i < 5; i++) {
            transactionCounter.incrementCount(user1);
            transactionCounter.incrementCount(user2);
        }

        assertEq(transactionCounter.getCount(user1), 5);
        assertEq(transactionCounter.getCount(user2), 5);
    }

    function testEdgeCases() public {
        // Test with very large numbers
        transactionCounter.updateFreeTierConfig(type(uint256).max, 1);

        (uint256 limit, uint256 ratio) = transactionCounter.getFreeTierConfig();
        assertEq(limit, type(uint256).max);
        assertEq(ratio, 1);
    }

    function testEventEmission() public {
        // Test TransactionCountIncremented event
        vm.expectEmit(true, false, false, true);
        emit TransactionCountIncremented(user1, 1);
        transactionCounter.incrementCount(user1);

        // Test FreeTierConfigUpdated event
        vm.expectEmit(false, false, false, true);
        emit FreeTierConfigUpdated(10, 3);
        transactionCounter.updateFreeTierConfig(10, 3);
    }

    function testRealWorldScenario() public {
        // Simulate realistic usage pattern
        address[] memory users = new address[](3);
        users[0] = makeAddr("user1");
        users[1] = makeAddr("user2");
        users[2] = makeAddr("user3");

        // Each user makes different numbers of transactions
        for (uint256 i = 0; i < 3; i++) {
            transactionCounter.incrementCount(users[i]);
        }

        for (uint256 i = 0; i < 3; i++) {
            transactionCounter.incrementCount(users[0]);
        }

        for (uint256 i = 0; i < 2; i++) {
            transactionCounter.incrementCount(users[1]);
        }

        assertEq(transactionCounter.getCount(users[0]), 4); // 1 + 3
        assertEq(transactionCounter.getCount(users[1]), 3); // 1 + 2
        assertEq(transactionCounter.getCount(users[2]), 1); // 1
    }
}
