// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract TokenErrorHandlingContract {

    event Deposit(address depositor, address token, uint256 amount);

    mapping(address => mapping(address => uint256)) public balances;

    function depositUnsafe(address _token, uint256 _amount) external {
        balances[_token][msg.sender] += _amount;
        bytes memory data = abi.encodeCall(IToken.transferFrom, (msg.sender, address(this), _amount));
        _token.call(data); /// call _token.transferFrom()
        emit Deposit(msg.sender, _token, _amount);
    }

    function depositSafe(address _token, uint256 _amount) external {
        uint256 balanceBefore = IToken(_token).balanceOf(address(this));
        /// Check the return value after transfer
        bytes memory data = abi.encodeCall(IToken.transferFrom, (msg.sender, address(this), _amount));
        (bool success, bytes memory returndata) = _token.call(data); /// call _token.transferFrom()
        require( 
            success &&                                                          /// Is the execution success
                (returndata.length == 0 || abi.decode(returndata, (bool))) &&   /// If returndata has value, Is it equal to 'true'
                address(_token).code.length > 0,                              /// Is token's address a contract
            "transferFrom failed"
        );
        uint256 balanceAfter = IToken(_token).balanceOf(address(this));
        /// Calculate the actual amount that the contract has received
        uint256 actualAmount = balanceAfter - balanceBefore;
        balances[_token][msg.sender] += actualAmount;
        emit Deposit(msg.sender, _token, actualAmount);
    }

    function withdraw(address _token, uint256 _amount) external {
        balances[_token][msg.sender] -= _amount;
        bytes memory data = abi.encodeCall(IToken.transfer, (msg.sender, _amount));
        (bool success, bytes memory returndata) = _token.call(data); /// call _token.transferFrom()
        require(success && (returndata.length == 0 || abi.decode(returndata, (bool))) && address(_token).code.length > 0,                              /// Token's address must be a contract
            "transferFrom failed"
        );
    }
}


interface IToken {
    function transfer(address receiver, uint256 amount) external returns (bool);
    function transferFrom(address sender, address receiver, uint256 amount) external returns (bool);
    function balanceOf(address account) external returns (uint256);
}

