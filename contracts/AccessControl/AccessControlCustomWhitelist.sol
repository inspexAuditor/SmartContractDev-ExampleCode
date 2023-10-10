// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract AccessControlCustomWhitelist {
    
    address public admin;
    mapping (address => bool) public  whitelist;
    mapping (address => uint256) public  cooldown;

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
    receive() external payable {}

    function requestForETH() external onlyWhitelist {
        uint256 amount = 0.1 ether;
        require(address(this).balance >= amount, "Insufficient funds");
        require(cooldown[msg.sender] <= block.timestamp, "Please wait for the delay");
        cooldown[msg.sender] = block.timestamp + 7 days;
        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        require(sent, "Failed to send Ether");
    }

}
