// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract NoRevertToken {
    uint public totalSupply;
    mapping(address => uint) public balanceOf;
    mapping(address => mapping(address => uint)) public allowance;
    string public name = "NRT";
    string public symbol = "NoRevertToken";
    uint8 public decimals = 18;

    constructor(uint256 initialSupply) {
        _mint(initialSupply);
    }

    function transfer(address recipient, uint amount) external returns (bool) {
        if (balanceOf[msg.sender] < amount){
            return false;
        } else {
            balanceOf[msg.sender] -= amount;
            balanceOf[recipient] += amount;
            return true;
        }
        
    }

    function approve(address spender, uint amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(
        address sender,
        address recipient,
        uint amount
    ) external returns (bool) {
        allowance[sender][msg.sender] -= amount;
        if (balanceOf[sender] < amount){
            return false;
        } else {
            balanceOf[sender] -= amount;
            balanceOf[recipient] += amount;
            return true;
        }
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
