// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

import "../3_UnexpectedReinitiazation/SimpleInitializable.sol";

contract UninitializedImplementationProblem is SimpleInitializable {

    /// Immutable variables
    uint256 public immutable immutableVariable;
    /// Private State Variables
    uint256 private _version;
    address private _admin;

    constructor(uint256 number) {
        immutableVariable = number;
    }

    function initialize(uint256 version) public initializer {
        _version = version;
        _admin = msg.sender;
    }

    function getVersion() external view returns (uint256) {
        return _version;
    }

    function getAdmin() public view returns (address) {
        return _admin;
    }

    function setAdmin(address newAdmin) external {
        require(msg.sender == _admin, "Only admin can call this function");
        _admin = newAdmin;
    }

    function setAdminButDelegatecall(address delegatecallTarget, address newAdmin) external {
        require(msg.sender == _admin, "Only admin can call this function");
        (bool success, ) = delegatecallTarget.delegatecall(
            abi.encodeWithSignature(
                "setAdmin(address)",
                newAdmin
            )
        );
        require(success, "delegatecall failed");
    }

}
