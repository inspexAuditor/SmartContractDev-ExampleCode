// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract BeaconImplementationV1 {
    
    string constant private version = "1.0.0";

    function getVersion() external pure returns (string memory) {
        return version;
    }

}
