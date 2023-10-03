// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract LowLevelCallErrorHandlingContract {

    mapping(address => uint256) public balances;
    address payable public bank;

    constructor() {
        bank = payable(new LowLevelBank());
    }

    function depositUnsafe(address _for, uint256 _amount) external payable {
        balances[_for] += _amount;
        bank.call{value: _amount}("");
    }

    function depositSafe(address _for, uint256 _amount) external payable {
        balances[_for] += _amount;
        (bool sent, ) = bank.call{value: _amount}("");
        require(sent, "Failed to send Ether");
    }

    function withdraw(address _to, uint256 _amount) external {
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        balances[msg.sender] -= _amount;
        bool sent = LowLevelBank(bank).withdraw(_to, _amount);
        require(sent, "Failed to send Ether");
    }
}


contract LowLevelBank {
    address manager;
    constructor() { manager = msg.sender; }

    receive() external  payable {
        require(msg.value >= 1 ether, "insufficient amount");
    }

    function withdraw(address _to, uint256 _amount) external returns(bool){
        require(msg.sender == address(manager), "Unauthorized");
        (bool sent, ) = _to.call{value: _amount}("");
        return sent;
    } 
}