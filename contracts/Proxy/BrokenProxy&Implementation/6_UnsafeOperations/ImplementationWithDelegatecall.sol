// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract ImplementationWithDelegatecall {

    function callAnotherContract(address target, bytes memory data) external {
        (bool success, ) = target.delegatecall(data);
        require(success, "delegatecall failed");
    }

}
