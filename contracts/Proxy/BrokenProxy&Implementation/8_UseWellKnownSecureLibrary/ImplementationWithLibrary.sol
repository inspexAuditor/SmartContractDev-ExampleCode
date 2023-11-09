// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

contract ImplementationWithLibrary is Initializable {

    /// Immutable variables
    uint256 public immutable immutableVariable;
    /// Private State Variables
    uint256 private _version;
    address private _admin;

    constructor(uint256 number) {
        /// The constructor should only contain definitions of immutable variables or disable the initializer
        immutableVariable = number;
        _disableInitializers();
    }

    function initialize(uint256 version, address admin) public initializer {
        _version = version;
        _admin = admin;
    }

    function getVersion() external view returns (uint256) {
        return _version;
    }

    function getAdmin() external view returns (address) {
        return _admin;
    }

    function setAdmin(address newAdmin) external {
        _admin = newAdmin;
    }

}