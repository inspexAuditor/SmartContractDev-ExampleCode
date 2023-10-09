// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.6;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

import "openzeppelin-contracts-06/math/SafeMath.sol";

contract CounterV7SafeContract {

    using SafeMath for uint256;
    uint256 counter;

    function get() external view returns(uint256) {
        return counter;
    }

    function setMax() external {
        counter = type(uint256).max;
    } 

    function increase() external {
        counter = counter.add(1);
    }

    function decrease() external {
        counter = counter.sub(1);
    }
}
