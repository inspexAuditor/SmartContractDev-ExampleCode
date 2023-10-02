// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract SimpleErrorHandlingContract {

    uint256 public value;

    function setValue(uint256 _value) external {
        if (_value == 10){
            revert("Value cannot be 10");
        }
        value = _value;
    }

    function decrementValue(uint _amount) external {
        require(_amount <= value, "Insufficient value");
        value -= _amount;
    }

    function incrementValue(uint _amount) external {
        uint oldValue = value;
        value += _amount;
        assert(value > oldValue);
    }
}
