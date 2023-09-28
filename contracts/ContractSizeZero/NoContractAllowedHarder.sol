// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract NoContractAllowedHarder {

    mapping(address => bool) public whitelist;
    mapping(address => uint256) public requestWhitelistInBlock;

    function isContract(address account) private view  returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }

    function requestWhitelistForSomeone(address to) external{
        require(!isContract(to), "No contract allowed");
        requestWhitelistInBlock[to] = block.number;
    }

    function noContractAllowHarder() external {
        require(requestWhitelistInBlock[msg.sender] < block.number, "Wait for the next block");
        whitelist[msg.sender] = true;
    }
}