// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract ERC721OneSupply is ERC721 {

    constructor(string memory name_, string memory symbol_) ERC721(name_, symbol_) {
        uint256 tokenId = 0;
        _mint(msg.sender, tokenId);
    }

}
