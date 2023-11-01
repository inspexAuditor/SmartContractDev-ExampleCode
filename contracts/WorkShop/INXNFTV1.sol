// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract INXNFTV1 is ERC721Enumerable, Ownable {
    IERC20 public token;
    uint256 public price;
    uint256 public whitelistPrice;
    uint256 public maxSupply;
    uint256 public whitelistMaxPurchase;
    bytes32 public merkleRoot;
    mapping(address => uint256) public whitelistMinted;
    bool public publicSaleOpen;

    constructor(
        address _token,
        uint256 _price,
        uint256 _whitelistPrice,
        uint256 _maxSupply,
        uint256 _whitelistMaxPurchase,
        bytes32 _merkleRoot
    ) ERC721("Inspex NFT", "INXNFT") {
        token = IERC20(_token);
        price = _price;
        whitelistPrice = _whitelistPrice;
        maxSupply = _maxSupply;
        whitelistMaxPurchase = _whitelistMaxPurchase;
        merkleRoot = _merkleRoot;
    }

    function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        merkleRoot = _merkleRoot;
    }

    function startPublicSale() external onlyOwner {
        publicSaleOpen = true;
    }

    function stopPublicSale() external onlyOwner {
        publicSaleOpen = false;
    }

    function mintReserve(uint256 quantity) external onlyOwner {
        require(totalSupply() + quantity <= maxSupply, "Exceed max supply");
        _mintNFT(quantity);
    }

    function purchaseNFT(uint256 quantity) external {
        require(publicSaleOpen, "Sale is not open yet");
        require(quantity > 0, "Invalid quantity");
        require(
            totalSupply() + quantity <= maxSupply,
            "Purchase limit exceeded"
        );

        require(
            token.transferFrom(msg.sender, address(this), price * quantity),
            "Token transfer failed"
        );
        _mintNFT(quantity);
    }

    function _mintNFT(uint256 quantity) internal {
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = totalSupply() + 1;
            _mint(msg.sender, tokenId);
        }
    }

    function purchaseNFTWhitelist(
        uint256 quantity,
        bytes32[] calldata merkleProof
    ) external {
        require(!publicSaleOpen, "Invalid phrase");
        require(quantity > 0, "Invalid quantity");
        require(
            totalSupply() + quantity <= maxSupply,
            "Sale would exceed max supply"
        );

        bytes32 leaf = keccak256(
            bytes.concat(
                keccak256(abi.encode(msg.sender, whitelistMaxPurchase))
            )
        );
        require(
            MerkleProof.verify(merkleProof, merkleRoot, leaf),
            "Invalid proof"
        );
        require(
            whitelistMinted[msg.sender] + quantity <= whitelistMaxPurchase,
            "Exceed whitelist limit"
        );
        whitelistMinted[msg.sender] += quantity;
        require(
            token.transferFrom(
                msg.sender,
                address(this),
                whitelistPrice * quantity
            ),
            "Token transfer failed"
        );
        _mintNFT(quantity);
    }
}
