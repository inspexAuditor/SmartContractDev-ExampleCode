// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract BeaconImplementationV2 {
    
    string constant private version = "2.0.0";

    function getVersion() external pure returns (string memory) {
        return version;
    }

}
