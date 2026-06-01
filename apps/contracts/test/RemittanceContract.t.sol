// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {RemittanceContract} from "../src/RemittanceContract.sol";

contract MockERC20 {
    string public name = "Mock USDm";
    string public symbol = "USDm";
    uint8 public decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor() {
        balanceOf[msg.sender] = 1000000 * 10**18;
        totalSupply = 1000000 * 10**18;
    }

    function transfer(address to, uint256 value) public returns (bool) {
        require(balanceOf[msg.sender] >= value, "Insufficient balance");
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        return true;
    }

    function approve(address spender, uint256 value) public returns (bool) {
        allowance[msg.sender][spender] = value;
        return true;
    }

    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        require(balanceOf[from] >= value, "Insufficient balance");
        if (msg.sender != from) {
            require(allowance[from][msg.sender] >= value, "Insufficient allowance");
            allowance[from][msg.sender] -= value;
        }
        balanceOf[from] -= value;
        balanceOf[to] += value;
        return true;
    }

    function mint(address to, uint256 amount) public {
        balanceOf[to] += amount;
        totalSupply += amount;
    }
}

contract RemittanceContractTest is Test {
    RemittanceContract public remittance;
    MockERC20 public token;

    address public alice = address(0x1);
    address public bob = address(0x2);
    address public agent = address(0x3);

    function setUp() public {
        token = new MockERC20();
        remittance = new RemittanceContract(address(token), agent);

        // Mint token to Alice (sender)
        token.mint(alice, 1000 * 10**18);
        
        // Alice approves the RemittanceContract to pull tokens
        vm.prank(alice);
        token.approve(address(remittance), type(uint256).max);
    }

    function test_CreateSchedule() public {
        vm.startPrank(alice);
        uint256 start = block.timestamp + 1 days;
        uint256 id = remittance.createSchedule(
            bob,
            "Bob Miller",
            "+1234567890",
            50 * 10**18,
            2, // Monthly
            start,
            true,
            150 * 10**18
        );
        vm.stopPrank();

        assertEq(id, 1);
        
        RemittanceContract.Schedule memory s = remittance.getSchedule(1);
        assertEq(s.owner, alice);
        assertEq(s.recipient, bob);
        assertEq(s.amount, 50 * 10**18);
        assertEq(s.frequency, 2);
        assertEq(s.startDate, start);
        assertEq(s.nextExecutionTimestamp, start);
        assertTrue(s.hasMonthlyLimit);
        assertEq(s.maxMonthlyAmount, 150 * 10**18);
        assertEq(s.status, 0); // Active
        assertEq(s.recipientName, "Bob Miller");
        assertEq(s.recipientPhone, "+1234567890");
    }

    function test_EditSchedule() public {
        vm.prank(alice);
        uint256 id = remittance.createSchedule(
            bob,
            "Bob Miller",
            "",
            50 * 10**18,
            2,
            block.timestamp,
            false,
            0
        );

        vm.prank(alice);
        remittance.editSchedule(id, 75 * 10**18, true, 200 * 10**18);

        RemittanceContract.Schedule memory s = remittance.getSchedule(id);
        assertEq(s.amount, 75 * 10**18);
        assertTrue(s.hasMonthlyLimit);
        assertEq(s.maxMonthlyAmount, 200 * 10**18);
    }

    function test_PauseAndResumeSchedule() public {
        vm.prank(alice);
        uint256 id = remittance.createSchedule(
            bob,
            "Bob Miller",
            "",
            50 * 10**18,
            2,
            block.timestamp,
            false,
            0
        );

        // Pause
        vm.prank(alice);
        remittance.pauseSchedule(id);
        assertEq(remittance.getSchedule(id).status, 1); // Paused

        // Try to execute while paused - should revert
        vm.warp(block.timestamp + 1);
        vm.prank(agent);
        vm.expectRevert("Schedule is not active");
        remittance.executeScheduledPayment(id);

        // Resume
        vm.prank(alice);
        remittance.resumeSchedule(id);
        assertEq(remittance.getSchedule(id).status, 0); // Active
    }

    function test_CancelSchedule() public {
        vm.prank(alice);
        uint256 id = remittance.createSchedule(
            bob,
            "Bob Miller",
            "",
            50 * 10**18,
            2,
            block.timestamp,
            false,
            0
        );

        vm.prank(alice);
        remittance.cancelSchedule(id);
        assertEq(remittance.getSchedule(id).status, 2); // Cancelled
    }

    function test_ExecuteOneTimePayment() public {
        uint256 start = block.timestamp + 1 days;
        vm.prank(alice);
        uint256 id = remittance.createSchedule(
            bob,
            "Bob Miller",
            "",
            100 * 10**18,
            0, // One-time
            start,
            false,
            0
        );

        // Warp time to due date
        vm.warp(start);

        // Execute payment by agent
        vm.prank(agent);
        remittance.executeScheduledPayment(id);

        assertEq(token.balanceOf(bob), 100 * 10**18);
        assertEq(token.balanceOf(alice), 900 * 10**18);

        RemittanceContract.Schedule memory s = remittance.getSchedule(id);
        assertEq(s.status, 3); // Completed
        assertEq(s.nextExecutionTimestamp, 0);
    }

    function test_ExecuteRecurringPaymentAndLimits() public {
        vm.warp(100000);
        uint256 start = 100000;
        vm.prank(alice);
        uint256 id = remittance.createSchedule(
            bob,
            "Bob Miller",
            "",
            100 * 10**18,
            1, // Weekly
            start,
            true, // Enable monthly limit
            250 * 10**18 // Max monthly limit
        );

        // 1st Execution (Week 1)
        vm.prank(agent);
        remittance.executeScheduledPayment(id);

        assertEq(token.balanceOf(bob), 100 * 10**18);
        RemittanceContract.Schedule memory s1 = remittance.getSchedule(id);
        assertEq(s1.nextExecutionTimestamp, start + 7 days);
        assertEq(s1.currentMonthPaid, 100 * 10**18);

        // 2nd Execution (Week 2)
        vm.warp(start + 7 days);
        vm.prank(agent);
        remittance.executeScheduledPayment(id);

        assertEq(token.balanceOf(bob), 200 * 10**18);
        RemittanceContract.Schedule memory s2 = remittance.getSchedule(id);
        assertEq(s2.nextExecutionTimestamp, start + 14 days);
        assertEq(s2.currentMonthPaid, 200 * 10**18);

        // 3rd Execution (Week 3) - Should exceed limit (200 + 100 = 300 > 250)
        vm.warp(start + 14 days);
        vm.prank(agent);
        vm.expectRevert("Exceeds monthly limit");
        remittance.executeScheduledPayment(id);

        // 4th Execution (after a month has passed) - Should reset limits and succeed
        vm.warp(start + 30 days);
        vm.prank(agent);
        remittance.executeScheduledPayment(id);

        assertEq(token.balanceOf(bob), 300 * 10**18);
        RemittanceContract.Schedule memory s3 = remittance.getSchedule(id);
        assertEq(s3.currentMonthPaid, 100 * 10**18);
        assertEq(s3.lastPaidMonthTimestamp, start + 30 days);
    }
}
