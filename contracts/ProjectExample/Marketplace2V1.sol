// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Marketplace2V1 is Ownable {
    using ECDSA for bytes32;
    mapping(address => mapping(uint256 => bool)) public usedNonce;

    struct Offer1 {
        bool isSell;
        address nftAddress;
        uint256 tokenId;
        address tokenAddress;
        uint256 price;
    }

    event NFTSold(
        address buyer,
        address seller,
        address nftAddress,
        uint256 tokenId,
        address tokenAddress,
        uint256 price
    );

    // BUG - remove cancelListing function will result in unable to revoke sigature
    function cancelListing(uint256 _nonce) external {
        usedNonce[msg.sender][_nonce] = true;
    }

    function acceptOfferV0(
        Offer1 calldata _offer,
        bytes calldata _signature
    ) external {
        bytes32 messageHash = getMessageHashEncode1(_offer);
        bytes32 EthMessageHash = getEthSignedMessageHash(messageHash);
        address signer = recoverSigner(EthMessageHash, _signature);

        address buyer = _offer.isSell ? msg.sender : signer;
        address seller = _offer.isSell ? signer : msg.sender;

        IERC20(_offer.tokenAddress).transferFrom(buyer, signer, _offer.price);
        IERC721(_offer.nftAddress).transferFrom(signer, seller, _offer.tokenId);
        emit NFTSold(
            buyer,
            signer,
            _offer.nftAddress,
            _offer.tokenId,
            _offer.tokenAddress,
            _offer.price
        );
    }

    function getMessageHashEncode1(
        Offer1 calldata _offer
    ) public pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    _offer.nftAddress,
                    _offer.tokenId,
                    _offer.tokenAddress,
                    _offer.price
                )
            );
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

    function recoverSigner(
        bytes32 _ethSignedMessageHash,
        bytes memory _signature
    ) public pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);
        return ecrecover(_ethSignedMessageHash, v, r, s);
    }

    function splitSignature(
        bytes memory sig
    ) public pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "invalid signature length");

        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }
}
