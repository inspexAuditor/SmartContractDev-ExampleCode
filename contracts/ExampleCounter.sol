// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract ExampleCounter {
    uint256 private counter;
    address payable public owner;

    constructor(uint _answer) payable {
        require(msg.value == 0.1 ether,"invalid msg.value");
        require(_answer == 7, "invalid answer");
        owner = payable(msg.sender);
    }

    function get() external view returns(uint256) {
        return counter;
    }

    function inc() external {
        counter += 1;
    }

    function dec() external {
        counter -= 1;
    }
}
