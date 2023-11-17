// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockWETH is ERC20 {

    constructor() ERC20("Wrapped ETH", "WETH") {}

    function deposit() external payable {
        require(msg.value > 0, "invalid value");
        _mint(msg.sender, msg.value);
    } 

    function withdraw(uint256 amount) external {
        require(balanceOf(msg.sender) >= amount, "insufficient balance");
        _burn(msg.sender,amount);
        (bool sent, ) = msg.sender.call{value: amount}("");
        require(sent, "Failed to send Ether");
    }

}
