// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

import "../3_UnexpectedReinitiazation/SimpleInitializable.sol";

contract ImplementationAfterUpgradeSolution is SimpleInitializable {

    /// Immutable variables
    uint256 public immutable immutableVariable;
    /// Private State Variables
    uint256 private _version;
    address private _admin;
    /// Always add new state variable to the bottom slot
    uint256 private _counter;
    uint256 private _newVarA;
    uint256 private _newVarB;

    constructor(uint256 number) {
        /// The constructor should only contain definitions of immutable variables or disable the initializer
        immutableVariable = number;
        _disableInitializer();
    }

    function initialize(uint256 version, uint256 counter) public initializer {
        _version = version;
        _admin = msg.sender;
        _counter = counter;
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

