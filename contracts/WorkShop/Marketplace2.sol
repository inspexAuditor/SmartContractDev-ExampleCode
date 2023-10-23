// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Marketplace2 is Ownable {
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

    function test(
        bytes memory signature,
        address from,
        address to
    ) public pure returns (address) {
        // VERIFY THE SIGNATURE
        bytes32 messageHash = keccak256(abi.encodePacked(from, to));
        bytes32 message = ECDSA.toEthSignedMessageHash(messageHash);
        address recoveredAddress = ECDSA.recover(message, signature);
        return recoveredAddress;
    }

    function verifySignature(
        bytes32 messageHash,
        bytes memory signature
    ) public pure returns (address) {
        address signer = ECDSA.recover(messageHash, signature);
        return signer;
    }

    function getMessageHash1(address _address) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(_address));
    }

    function getMessageHash(
        Offer calldata _offer
    ) public view returns (bytes32) {
        // BUG - remove isSell will result in cross purpose bug
        // BUG - remove expiry will result in never exipre sig
        // BUG - remove address(this) will result in cross-contract sig replay
        // BUG - remove block.chainid will result in cross-chain, fork sig replay
        return
            keccak256(
                abi.encodePacked(
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

    function test2(
        bytes memory signature,
        Offer calldata _offer
    ) public view returns (address) {
        // VERIFY THE SIGNATURE
        bytes32 messageHash = keccak256(
            abi.encodePacked(
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
        bytes32 message = ECDSA.toEthSignedMessageHash(messageHash);
        address recoveredAddress = ECDSA.recover(message, signature);
        return recoveredAddress;
    }

    function getChainId() external view returns (uint256) {
        return block.chainid;
    }

    // BUG - remove cancelListing function will result in unable to revoke sigature
    function cancelListing(uint256 _nonce) external {
        usedNonce[msg.sender][_nonce] = true;
    }

    function getSigner2(
        bytes32 messageHash,
        bytes calldata _signature
    ) external pure returns (address) {
        address signer = ECDSA.recover(messageHash, _signature);

        // address signer = messageHash.recover(_signature);
        return signer;
    }

    function acceptOffer(
        Offer calldata _offer,
        bytes calldata _signature
    ) external {
        bytes32 messageHash = getMessageHash(_offer);
        // BUG - using ecrecover directly, change usedNonce > usedSig[sig] can vulnerable to sigature malleability
        // address signer = messageHash.recover(_signature);
        bytes32 message = ECDSA.toEthSignedMessageHash(messageHash);
        address signer = ECDSA.recover(message, _signature);
        require(!usedNonce[signer][_offer.nonce], "Nonce Used");

        address buyer = _offer.isSell ? msg.sender : signer;
        address seller = _offer.isSell ? signer : msg.sender;

        // BUG - remove used sig,nonce check will result in replay attack
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
}
