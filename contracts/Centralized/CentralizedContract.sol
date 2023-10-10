// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract CentralizedContract is ERC20, Ownable {

    uint256 public constant limitSupply = 100_000_000;
    uint256 public currentSupply;
    IPriceProvider public priceProvider;

    event Buy(address receiver, uint256 payAmount, uint256 receiveAmount);
    event Sell(address receiver, uint256 sellAmount, uint256 receiveAmount);
    event WithdrawNative(address indexed recevier, uint256 indexed amount);

    constructor(address _priceProvider) ERC20("Centralized Token", "CTK") {
        _mint(address(this), limitSupply);
        priceProvider = IPriceProvider(_priceProvider);
    }

    function setPriceProvider(address _priceProvider) external onlyOwner{
        priceProvider = IPriceProvider(_priceProvider);
    }

    function withdrawNative(address _to) external onlyOwner returns (uint256){
        uint256 currentPrice = priceProvider.getPrice();
        uint256 totalValue = currentPrice * currentSupply;
        uint256 balance = address(this).balance;
        if (balance > totalValue){
            uint256 excessBalance = balance - totalValue;
            (bool sent, ) = (_to).call{value: excessBalance}("");
            require(sent, "Failed to send Ether");
            emit WithdrawNative(_to, excessBalance);
            return excessBalance;
        }
        emit WithdrawNative(_to, 0);
        return 0;
    }

    function buy(address _buyFor, uint256 _amount) external payable {
        /// Get price from provider
        uint256 currentPrice = priceProvider.getPrice();
        /// Check amount
        uint256 total = currentPrice * _amount;
        require(msg.value == total, "Insufficien ETH");
        require(currentSupply + _amount <= limitSupply, "Not enough supply");
        /// Transfer token to `_to` address
        currentSupply += _amount;
        _transfer(address(this), _buyFor, _amount);
        emit Buy(_buyFor, total, _amount);
    }

    function sell(address _receiver, uint256 _amount) external {
        /// Get price from provider
        uint256 currentPrice = priceProvider.getPrice();
        /// Check amount
        uint256 total = currentPrice * _amount;
        require(address(this).balance >= total, "Insufficien ETH");
        require(balanceOf(msg.sender) >= _amount, "Invalid amount");
        /// Transfer
        currentSupply -= _amount;
        _transfer(msg.sender, address(this), _amount);
        (bool sent, ) = (_receiver).call{value: total}("");
        require(sent, "Failed to send Ether");
        emit Sell(_receiver, _amount, total);
    }

}

interface IPriceProvider {
    function getPrice() external returns(uint256);
}

contract TrustedPriceProvider {
    function getPrice() external pure returns(uint256) {
        return 0.1 ether;
    }
}

contract MaliciousPriceProvider {
    function getPrice() external pure returns(uint256) {
        ///Very low price
        return 0.0000001 ether;
    }
}