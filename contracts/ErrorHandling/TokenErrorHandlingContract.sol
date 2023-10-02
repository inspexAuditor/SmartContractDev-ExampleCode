// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract TokenErrorHandlingContract {

    mapping(address => mapping(address => uint256)) public balances;

    function depositUnsafe(address _token, uint256 _amount) external {
        balances[_token][msg.sender] += _amount;
        IToken(_token).transferFrom(msg.sender, address(this), _amount);   
    }

    function depositSafe(address _token, uint256 _amount) external {
        /// this function is not supported fee on transfer
        balances[_token][msg.sender] += _amount;
        bool success = IToken(_token).transferFrom(msg.sender, address(this), _amount);
        require(success, "transferFrom failed");
    }

    function withdraw(address _token, uint256 _amount) external {
        balances[_token][msg.sender] -= _amount;
        bool success = IToken(_token).transfer(msg.sender, _amount);
        require(success, "transfer failed");
    }
}


interface IToken {
    function transfer(address receiver, uint256 amount) external returns (bool);
    function transferFrom(address sender, address receiver, uint256 amount) external returns (bool);
    function balanceOf(address account) external returns (uint256);
}

