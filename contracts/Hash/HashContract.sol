// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract HashContract {
    
    function getEncode(
        string memory partOne, 
        string memory partTwo, 
        uint256 salt,
        bytes  memory b,
        bytes32 b32
    ) external pure returns (bytes memory){
        return abi.encode(partOne, partTwo, salt, b, b32);
    }

    function getEncodePacked(
        string memory partOne, 
        string memory partTwo, 
        uint256 salt,
        bytes  memory b,
        bytes32 b32
    ) external pure returns (bytes memory){
        return abi.encodePacked(partOne, partTwo, salt, b, b32);
    }
    

    function getHashEncode(
        string memory partOne, 
        string memory partTwo, 
        uint256 salt,
        bytes  memory b,
        bytes32 b32
    ) external pure returns (bytes32){
        return keccak256(abi.encode(partOne, partTwo, salt, b, b32));
    }

    function getHashEncodePacked(
        string memory partOne, 
        string memory partTwo,
        uint256 salt,
        bytes  memory b,
        bytes32 b32
    ) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(partOne, partTwo, salt, b, b32));
    }

}
