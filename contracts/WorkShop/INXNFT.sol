// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract INXNFT is ERC721Enumerable, Ownable {
    using Address for address;

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

    function purchaseNFTV1(uint256 quantity) external {
        require(!Address.isContract(msg.sender));
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

    // BUG - get input from, to, for transfer erc20 from victim then mint to attacker
    function purchaseNFT(uint256 quantity) external {
        require(msg.sender == tx.origin, "No contract allowed");
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
        require(msg.sender == tx.origin, "No contract allowed");
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
        // BUG - not check already minted token, must check minted amount with allowed
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

    function hashLeaf() external view returns (bytes32) {
        bytes32 leaf = keccak256(
            bytes.concat(
                keccak256(abi.encode(msg.sender, whitelistMaxPurchase))
            )
        );
        return leaf;
    }

    // BUG - manual whitelist waste gas
    mapping(address => uint256) public whitelist; // Whitelisted addresses and their purchase limits.

    function addToWhitelist(
        address[] calldata addresses,
        uint256[] calldata purchaseLimits
    ) external onlyOwner {
        require(addresses.length == purchaseLimits.length, "Invalid input");
        for (uint256 i = 0; i < addresses.length; i++) {
            whitelist[addresses[i]] = purchaseLimits[i];
        }
    }

    function removeFromWhitelist(
        address[] calldata addresses
    ) external onlyOwner {
        for (uint256 i = 0; i < addresses.length; i++) {
            delete whitelist[addresses[i]];
        }
    }

    function purchaseNFTWhitelist(uint256 quantity) external {
        require(!publicSaleOpen, "Invalid phrase");
        require(quantity > 0, "Invalid quantity");
        require(
            totalSupply() + quantity <= maxSupply,
            "Sale would exceed max supply"
        );
        require(
            whitelistMinted[msg.sender] + quantity <= whitelist[msg.sender],
            "Unauthorized"
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
