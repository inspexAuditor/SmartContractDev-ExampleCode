// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract NoContractAllowed {

    mapping(address => bool) public whitelist;

    function isContract(address account) private view  returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }

    function noContractAllow() external {
        require(!isContract(msg.sender), "No contract allowed");
        whitelist[msg.sender] = true;
    }
}