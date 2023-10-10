// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract SimpleToken {
    uint public totalSupply;
    mapping(address => uint) public balanceOf;
    mapping(address => mapping(address => uint)) public allowance;
    string public name = "SPT";
    string public symbol = "SimpleToken";
    uint8 public decimals = 18;

    constructor(uint256 initialSupply) {
        _mint(initialSupply);
    }

    function transfer(address recipient, uint amount) external {
        balanceOf[msg.sender] -= amount;
        balanceOf[recipient] += amount;
    }

    function approve(address spender, uint amount) external {
        allowance[msg.sender][spender] = amount;
    }

    function transferFrom(
        address sender,
        address recipient,
        uint amount
    ) external {
        allowance[sender][msg.sender] -= amount;
        balanceOf[sender] -= amount;
        balanceOf[recipient] += amount;
    }

    function _mint(uint amount) internal {
        balanceOf[msg.sender] += amount;
        totalSupply += amount;
    }

    function burn(uint amount) external {
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
    }
}
