// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract IncorrectOperationOrdering {
    
    address public owner; 
    uint256 public feePercent = 20;
    uint256 public collectedFee;

    event Donate(uint256 amount, uint256 fee, address donator);

    constructor() { owner = msg.sender; }

    function donate() external payable {
        require(msg.value >= 1 ether, "Too small amount");
        uint256 donateAmount = msg.value;
        /* 
            feePercent / 100 = 0
            fee = donateAmount * 0;
            The fee amount will always be zero.
        */
        uint256 fee = donateAmount * (feePercent / 100);
        uint256 donatAmountWithouteFee = donateAmount - fee;
        collectedFee += fee;
        emit Donate(donatAmountWithouteFee, fee, msg.sender);
    }

    function donateV2() external payable {
        require(msg.value >= 1 ether, "Too small amount");
        uint256 donateAmount = msg.value;
        /* 
            If donateAmount = 1000;
            fee = 1000 * 2 / 100
                = 2000 / 100
                = 20
        */
        uint256 fee = donateAmount * feePercent / 100;
        uint256 donatAmountWithouteFee = donateAmount - fee;
        collectedFee += fee;
        emit Donate(donatAmountWithouteFee, fee, msg.sender);
    }

    function withdrawNative() external {
        require(msg.sender == owner, "Only owner");
        (bool sent, ) = (msg.sender).call{value: address(this).balance}("");
        require(sent, "Failed to send Ether");
    }

}
