// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {RemittanceContract} from "../src/RemittanceContract.sol";

contract RemittanceContractScript is Script {
    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        // Use Celo Sepolia cUSD address by default for testnet deployments
        address cUSDAddress = vm.envOr("CUSD_ADDRESS", address(0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1));
        address agentAddress = vm.envOr("AGENT_ADDRESS", msg.sender);

        RemittanceContract remittance = new RemittanceContract(cUSDAddress, agentAddress);
        console.log("Agent (automation runner):", agentAddress);
        console.log("RemittanceContract deployed successfully at:", address(remittance));

        vm.stopBroadcast();
    }
}
