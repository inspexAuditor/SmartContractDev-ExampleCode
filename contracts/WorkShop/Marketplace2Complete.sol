// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Marketplace2Complete is Ownable {
    using ECDSA for bytes32;
    mapping(address => mapping(uint256 => bool)) public usedNonce;

    struct Offer {
        bool isSell;
        address nftAddress;
        uint256 tokenId;
        address tokenAddress;
        uint256 price;
        uint256 expiry;
        uint256 nonce;
    }

    event NFTSold(
        address buyer,
        address seller,
        address nftAddress,
        uint256 tokenId,
        address tokenAddress,
        uint256 price
    );

    function cancelListing(uint256 _nonce) external {
        usedNonce[msg.sender][_nonce] = true;
    }

    function acceptOffer(
        Offer calldata _offer,
        bytes calldata _signature
    ) external {
        bytes32 messageHash = getMessageHashEncode(_offer);
        bytes32 message = ECDSA.toEthSignedMessageHash(messageHash);
        address signer = ECDSA.recover(message, _signature);

        require(!usedNonce[signer][_offer.nonce], "Nonce Used");

        address buyer = _offer.isSell ? msg.sender : signer;
        address seller = _offer.isSell ? signer : msg.sender;

        require(block.timestamp <= _offer.expiry, "Offer has expired");

        usedNonce[signer][_offer.nonce] = true;
        IERC20(_offer.tokenAddress).transferFrom(buyer, seller, _offer.price);
        IERC721(_offer.nftAddress).transferFrom(seller, buyer, _offer.tokenId);
        emit NFTSold(
            buyer,
            seller,
            _offer.nftAddress,
            _offer.tokenId,
            _offer.tokenAddress,
            _offer.price
        );
    }


    function getMessageHashEncode(
        Offer calldata _offer
    ) public view returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    _offer.isSell,
                    _offer.nftAddress,
                    _offer.tokenId,
                    _offer.tokenAddress,
                    _offer.price,
                    _offer.expiry,
                    address(this),
                    block.chainid
                )
            );
    }

    function getChainId() external view returns (uint256) {
        return block.chainid;
    }

    function getEthSignedMessageHash(
        bytes32 hash
    ) public pure returns (bytes32 message) {
        assembly {
            mstore(0x00, "\x19Ethereum Signed Message:\n32")
            mstore(0x1c, hash)
            message := keccak256(0x00, 0x3c)
        }
    }
}
