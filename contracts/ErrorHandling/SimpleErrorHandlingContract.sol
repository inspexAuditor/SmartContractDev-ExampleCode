// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract SimpleErrorHandlingContract {

    error ValueOutOfRange(uint256 lowerBound, uint256 upperBound);

    uint256 public value;

    function setValue(uint256 _value) external {
        if (_value < 10){
            revert("Value must be in range 10-100"); // revert with reason string
        }
        else if(_value > 100){
            revert ValueOutOfRange(1,100);  // revert with custom error
        }
        value = _value;
    }

    function decreseValue(uint256 _amount) external {
        uint256 newValue = value - _amount;
        require(newValue >= 10, "Value must be in range 10-100");
        value = newValue;
    }

    function increaseValue(uint256 _amount) external {
        uint256 newValue = value + _amount;
        assert(newValue <= 100);
        value = newValue;
    }
}
