// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract AccessControlCustomWhitelist {
    
    string constant public name = "Private Bank (only whitelisted)";
    address public admin;
    mapping (address => bool) public whitelist;
    mapping (address => uint256) public balanceOf;

    constructor(address newAdmin) payable {
        admin = newAdmin;
    }

    modifier onlyWhitelist() {
        require(whitelist[msg.sender], "Caller is not in the whitelist");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Caller is not an admin");
        _;
    }

    function addWhitelist(address[] memory users) external onlyAdmin {
        for(uint i=0; i<users.length ; ++i){
            whitelist[users[i]] = true;
        }
    }

    function removeWhitelist(address[] memory users) external onlyAdmin {
        for(uint i=0; i<users.length ; ++i){
            whitelist[users[i]] = false;
        }
    }
    
    function deposit(address _receiver) external payable onlyWhitelist {
        require(msg.value > 0, "invalid balance");
        balanceOf[_receiver] += msg.value;
    }

    function withdraw(address _to, uint256 _amount) external onlyWhitelist {
        require(balanceOf[msg.sender] >= _amount, "insufficient balance");
        balanceOf[msg.sender] -= _amount;
        (bool sent, ) = payable(_to).call{value: _amount}("");
        require(sent, "Failed to send Ether");
    }

}
