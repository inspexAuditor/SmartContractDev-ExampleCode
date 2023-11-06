// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract BankCheckEffectInteraction {
    mapping(address => uint) public balances;

    function addBalance() public payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() public {
        require(balances[msg.sender] > 0, "Insufficient balance");
        balances[msg.sender] = 0;
        (bool sent, ) = msg.sender.call{value: balances[msg.sender]}("");
        require(sent, "Failed to send Ether");
    }
}
