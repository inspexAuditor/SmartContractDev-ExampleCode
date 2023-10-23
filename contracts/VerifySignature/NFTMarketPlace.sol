pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract NFTMarketplace {
    using SafeMath for uint256;
    using ECDSA for bytes32;

    address private admin;
    address private operator;
    uint256 public feePercentage = 0; // ตั้งเริ่มต้นเป็น 0
    uint256 constant MAX_FEE = 3; // ไม่เกิน 3%

    mapping(address => bool) public whitelistedNFTs;

    event NFTListed(
        address indexed seller,
        address indexed tokenAddress,
        uint256 tokenId,
        uint256 price,
        uint256 expiry,
        bytes signature
    );
    event NFTSold(
        address indexed seller,
        address indexed buyer,
        address indexed tokenAddress,
        uint256 tokenId,
        uint256 price
    );

    constructor() {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not authorized");
        _;
    }

    modifier onlyOperator() {
        require(msg.sender == operator, "Not authorized as operator");
        _;
    }

    function setOperator(address _operator) external onlyAdmin {
        operator = _operator;
    }

    function whitelistNFT(address _nftAddress) external onlyOperator {
        whitelistedNFTs[_nftAddress] = true;
    }

    function delistNFT(address _nftAddress) external onlyOperator {
        whitelistedNFTs[_nftAddress] = false;
    }

    function setFeePercentage(uint256 _feePercentage) external onlyAdmin {
        require(_feePercentage <= MAX_FEE, "Fee too high");
        feePercentage = _feePercentage;
    }

    function buyNFT(
        address _nftAddress,
        uint256 _tokenId,
        uint256 _price,
        uint256 _expiry,
        bytes memory _signature
    ) external payable {
        require(whitelistedNFTs[_nftAddress], "NFT not whitelisted");
        require(msg.value == _price, "Incorrect Ether sent");

        // Verify signature
        bytes32 message = keccak256(
            abi.encodePacked(
                _nftAddress,
                _tokenId,
                _price,
                _expiry,
                address(this)
            )
        );
        require(_expiry > block.timestamp, "Signature expired");
        address seller = message.toEthSignedMessageHash().recover(_signature);
        require(
            IERC721(_nftAddress).ownerOf(_tokenId) == seller,
            "Seller does not own the NFT"
        );

        uint256 feeAmount = _price.mul(feePercentage).div(100);
        uint256 sellerAmount = _price.sub(feeAmount);

        payable(seller).transfer(sellerAmount);
        payable(admin).transfer(feeAmount);

        IERC721(_nftAddress).transferFrom(seller, msg.sender, _tokenId);

        emit NFTSold(seller, msg.sender, _nftAddress, _tokenId, _price);
    }

    function getMessageHash(
        address _nftAddress,
        uint256 _tokenId,
        uint256 _price,
        uint256 _expiry
    ) public pure returns (bytes32) {
        return
            keccak256(abi.encodePacked(_nftAddress, _tokenId, _price, _expiry));
    }

    function getEthSignedMessageHash(
        bytes32 _messageHash
    ) public pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    "\x19Ethereum Signed Message:\n32",
                    _messageHash
                )
            );
    }

    function listNFTForSale(
        address _nftAddress,
        uint256 _tokenId,
        uint256 _price,
        uint256 _expiry
    ) public view returns (bytes32) {
        require(whitelistedNFTs[_nftAddress], "NFT not whitelisted");

        bytes32 messageHash = getMessageHash(
            _nftAddress,
            _tokenId,
            _price,
            _expiry
        );
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);
        return ethSignedMessageHash;
    }
}
