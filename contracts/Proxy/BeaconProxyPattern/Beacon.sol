// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IBeacon.sol";

contract BeaconContract is IBeacon, Ownable {

    address private  _implementationAddress;

    constructor(address implementationAddress) {
        _implementationAddress = implementationAddress;
    }

    function implementation() external view override returns (address) {
        return _implementationAddress;
    }

    function upgradeImplementation(address newImplementationAddress) external onlyOwner {
        _implementationAddress = newImplementationAddress;
    }

}

