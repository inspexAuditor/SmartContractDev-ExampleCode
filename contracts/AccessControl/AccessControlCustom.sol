// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract AccessControlCustom {
    
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function donate() external payable {
        require(msg.value > 0, "Please donate more than zero.");
    }

    function withdraw() external {
        require(msg.sender == owner, "You are not the owner");
        uint256 current_balance = address(this).balance;
        require(current_balance > 0, "Current balance is zero");
        (bool sent, ) = (msg.sender).call{value: current_balance}("");
        require(sent, "Failed to send Ether");
    }

}
