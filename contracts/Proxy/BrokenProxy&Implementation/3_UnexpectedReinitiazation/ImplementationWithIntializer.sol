// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

import "./SimpleInitializable.sol";

contract ImplementationWithIntializer is SimpleInitializable {

    /// Private State Variables
    uint256 private _version;
    address private _admin;

    function initialize(uint256 version) public initializer {
        _version = version;
        _admin = msg.sender;
    }

    function getVersion() external view returns (uint256) {
        return _version;
    }

    function getAdmin() external view returns (address) {
        return _admin;
    }

    function setAdmin(address newAdmin) external {
        require(msg.sender == _admin, "Only admin can call this function");
        _admin = newAdmin;
    }

}
