// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.6;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract CounterV7Contract {

    uint256 counter;

    function get() external view returns(uint256) {
        return counter;
    }

    function setMax() external {
        counter = type(uint256).max;
    } 

    function increase() external {
        counter += 1;
    }

    function decrease() external {
        counter -= 1;
    }

}