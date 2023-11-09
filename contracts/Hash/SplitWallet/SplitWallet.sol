// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";
import "./SplitPlatform.sol";

contract SplitWallet {

    event Withdraw(address indexed caller, uint256 totalAmount);

    SplitPlatform immutable private _split;
    uint256 private immutable  _walletId;
    mapping(address => bool) public owners;

    constructor(uint256 walletId, address[] memory accounts) {
        _walletId = walletId;
        _split = SplitPlatform(msg.sender);
        for(uint256 i ; i<accounts.length ; ++i){
            owners[accounts[i]] = true;
        }
    }

    function withdraw(
        address[] memory accounts, 
        uint256[] memory percents
    ) external {
        require(owners[msg.sender], "Only wallet's owners");
        uint256 totalAmount = _split.distribute(_walletId, accounts, percents);
        emit Withdraw(msg.sender, totalAmount);
    }

    function getBalance() external view returns (uint256) {
        return _split.balances(address(this));
    }

}