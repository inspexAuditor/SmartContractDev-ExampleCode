// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract FeeOnTransferToken {
    uint public totalSupply;
    mapping(address => uint) public balanceOf;
    mapping(address => mapping(address => uint)) public allowance;
    string public name = "FoTT";
    string public symbol = "FeeOnTransferToken";
    uint8 public decimals = 18;
    uint256 public feePercentage = 10; /// fee 10% in every transfer
    address public beneficiary;

    constructor(uint256 initialSupply, address _beneficiary) {
        beneficiary = _beneficiary;
        _mint(initialSupply);
    }

    function _transfer(address _from, address _to, uint256 _amount) internal {
        balanceOf[_from] -= _amount;
        balanceOf[_to] += _amount;
    }

    function transfer(address recipient, uint amount) external {
        uint256 fee = amount * feePercentage / 100;
        uint256 amountAfterFee = amount - fee;
        _transfer(msg.sender, beneficiary, fee);
        _transfer(msg.sender, recipient, amountAfterFee);
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
        uint256 fee = amount * feePercentage / 100;
        uint256 amountAfterFee = amount - fee;
        _transfer(sender, beneficiary, fee);
        _transfer(sender, recipient, amountAfterFee);
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
