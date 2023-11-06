// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract BankReentrancyGuard is ReentrancyGuard {
    mapping(address => uint) public balances;

    function addBalance() public payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() public nonReentrant {
        require(balances[msg.sender] > 0);
        (bool sent, ) = msg.sender.call{value: balances[msg.sender]}("");
        require(sent, "Failed to send ether");
        balances[msg.sender] = 0;
    }

}
