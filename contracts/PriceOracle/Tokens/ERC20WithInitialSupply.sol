// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20WithInitialSupply is ERC20 {

    constructor(
        string memory name_, 
        string memory symbol_, 
        uint256 initialSupply 
    ) ERC20(name_, symbol_) {
        _mint(msg.sender, initialSupply);
    }

}
