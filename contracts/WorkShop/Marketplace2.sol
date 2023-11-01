// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Marketplace2 is Ownable {
    using ECDSA for bytes32;
    mapping(address => mapping(uint256 => bool)) public usedNonce;

    struct Offer1 {
        bool isSell;
        address nftAddress;
        uint256 tokenId;
        address tokenAddress;
        uint256 price;
    }

    struct Offer2 {
        bool isSell;
        address nftAddress;
        uint256 tokenId;
        address tokenAddress;
        uint256 price;
    }

    struct Offer3 {
        bool isSell;
        address nftAddress;
        uint256 tokenId;
        address tokenAddress;
        uint256 price;
        uint256 expiry;
    }

    struct Offer4 {
        bool isSell;
        address nftAddress;
        uint256 tokenId;
        address tokenAddress;
        uint256 price;
        uint256 expiry;
        uint256 nonce;
    }

    struct Offer7 {
        bool isSell;
        address nftAddress;
        uint256 tokenId;
        address tokenAddress;
        uint256 price;
        uint256 expiry;
        uint256 nonce;
    }

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

    // BUG - remove cancelListing function will result in unable to revoke sigature
    function cancelListing(uint256 _nonce) external {
        usedNonce[msg.sender][_nonce] = true;
    }

    function acceptOffer(
        Offer calldata _offer,
        bytes calldata _signature
    ) external {
        bytes32 messageHash = getMessageHashEncode(_offer);
        // BUG - using ecrecover directly, change usedNonce > usedSig[sig] can vulnerable to sigature malleability
        bytes32 message = ECDSA.toEthSignedMessageHash(messageHash);
        // address signer = ECDSA.recover(message, _signature); // Good
        address signer = recoverSigner(message, _signature); // Bad

        require(!usedNonce[signer][_offer.nonce], "Nonce Used");

        address buyer = _offer.isSell ? msg.sender : signer;
        address seller = _offer.isSell ? signer : msg.sender;

        require(block.timestamp <= _offer.expiry, "Offer has expired");

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

    // Accept Offer V0
    struct OfferV0 {
        bool isSell;
        address nftAddress;
        uint256 tokenId;
        address tokenAddress;
        uint256 price;
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

        IERC20(_offer.tokenAddress).transferFrom(buyer, seller, _offer.price);
        IERC721(_offer.nftAddress).transferFrom(seller, buyer, _offer.tokenId);

        emit NFTSold(
            buyer,
            signer,
            _offer.nftAddress,
            _offer.tokenId,
            _offer.tokenAddress,
            _offer.price
        );
    }

    //FIXED : Replay Attack
    mapping(bytes => bool) public _signatureUsed;
    function acceptOfferV1(
        Offer1 calldata _offer,
        bytes calldata _signature
    ) external {
        require(!_signatureUsed[_signature], "The Signature Already Used");
        _signatureUsed[_signature] = true;

        bytes32 messageHash = getMessageHashEncode1(_offer);
        bytes32 EthMessageHash = getEthSignedMessageHash(messageHash);
        address signer = recoverSigner(EthMessageHash, _signature);
        address buyer = _offer.isSell ? msg.sender : signer;
        address seller = _offer.isSell ? signer : msg.sender;

        IERC20(_offer.tokenAddress).transferFrom(buyer, seller, _offer.price);
        IERC721(_offer.nftAddress).transferFrom(seller, buyer, _offer.tokenId);

        emit NFTSold(
            buyer,
            signer,
            _offer.nftAddress,
            _offer.tokenId,
            _offer.tokenAddress,
            _offer.price
        );
    }

    //FIXED : Replay Attack Malleability Signature
    function acceptOfferV2(
        Offer1 calldata _offer,
        bytes calldata _signature
    ) external {
        require(!_signatureUsed[_signature], "The Signature Already Used");
        _signatureUsed[_signature] = true;

        bytes32 messageHash = getMessageHashEncode1(_offer);
        bytes32 message = ECDSA.toEthSignedMessageHash(messageHash);
        address signer = ECDSA.recover(message, _signature);

        address buyer = _offer.isSell ? msg.sender : signer;
        address seller = _offer.isSell ? signer : msg.sender;

        IERC20(_offer.tokenAddress).transferFrom(buyer, seller, _offer.price);
        IERC721(_offer.nftAddress).transferFrom(seller, buyer, _offer.tokenId);

        emit NFTSold(
            buyer,
            signer,
            _offer.nftAddress,
            _offer.tokenId,
            _offer.tokenAddress,
            _offer.price
        );
    }

    //FIXED : Never Expire Signature
    function acceptOfferV3(
        Offer3 calldata _offer,
        bytes calldata _signature
    ) external {
        require(!_signatureUsed[_signature], "The Signature Already Used");
        _signatureUsed[_signature] = true;

        bytes32 messageHash = getMessageHashEncode3(_offer);
        bytes32 message = ECDSA.toEthSignedMessageHash(messageHash);
        address signer = ECDSA.recover(message, _signature);

        address buyer = _offer.isSell ? msg.sender : signer;
        address seller = _offer.isSell ? signer : msg.sender;

        require(block.timestamp <= _offer.expiry, "Offer has expired");

        IERC20(_offer.tokenAddress).transferFrom(buyer, seller, _offer.price);
        IERC721(_offer.nftAddress).transferFrom(seller, buyer, _offer.tokenId);

        emit NFTSold(
            buyer,
            signer,
            _offer.nftAddress,
            _offer.tokenId,
            _offer.tokenAddress,
            _offer.price
        );
    }

    //FIXED : Cross Purpose
    function acceptOfferV4(
        Offer3 calldata _offer,
        bytes calldata _signature
    ) external {
        require(!_signatureUsed[_signature], "The Signature Already Used");
        _signatureUsed[_signature] = true;

        bytes32 messageHash = getMessageHashEncode3(_offer);
        bytes32 message = ECDSA.toEthSignedMessageHash(messageHash);
        address signer = ECDSA.recover(message, _signature);

        address buyer = _offer.isSell ? msg.sender : signer;
        address seller = _offer.isSell ? signer : msg.sender;

        require(block.timestamp <= _offer.expiry, "Offer has expired");

        IERC20(_offer.tokenAddress).transferFrom(buyer, seller, _offer.price);
        IERC721(_offer.nftAddress).transferFrom(seller, buyer, _offer.tokenId);

        emit NFTSold(
            buyer,
            signer,
            _offer.nftAddress,
            _offer.tokenId,
            _offer.tokenAddress,
            _offer.price
        );
    }

    //FIXED : Cancel Listing
    function acceptOfferV5(
        Offer7 calldata _offer,
        bytes calldata _signature
    ) external {

        bytes32 messageHash = getMessageHashEncode7(_offer);
        bytes32 message = ECDSA.toEthSignedMessageHash(messageHash);
        address signer = ECDSA.recover(message, _signature);

        address buyer = _offer.isSell ? msg.sender : signer;
        address seller = _offer.isSell ? signer : msg.sender;

        require(block.timestamp <= _offer.expiry, "Offer has expired");

        require(!usedNonce[signer][_offer.nonce], "Nonce Used");
        usedNonce[signer][_offer.nonce] = true;

        IERC20(_offer.tokenAddress).transferFrom(buyer, seller, _offer.price);
        IERC721(_offer.nftAddress).transferFrom(seller, buyer, _offer.tokenId);

        emit NFTSold(
            buyer,
            signer,
            _offer.nftAddress,
            _offer.tokenId,
            _offer.tokenAddress,
            _offer.price
        );
    }

    //-------------------------

    function acceptOffer2(
        Offer2 calldata _offer,
        bytes calldata _signature
    ) external {
        bytes32 messageHash = getMessageHashEncode2(_offer);
        bytes32 message = ECDSA.toEthSignedMessageHash(messageHash);
        address signer = recoverSigner(message, _signature);

        address buyer = _offer.isSell ? msg.sender : signer;
        address seller = _offer.isSell ? signer : msg.sender;

        IERC20(_offer.tokenAddress).transferFrom(buyer, seller, _offer.price);
        IERC721(_offer.nftAddress).transferFrom(seller, buyer, _offer.tokenId);

        emit NFTSold(
            buyer,
            signer,
            _offer.nftAddress,
            _offer.tokenId,
            _offer.tokenAddress,
            _offer.price
        );
    }

    function acceptOffer3(
        Offer3 calldata _offer,
        bytes calldata _signature
    ) external {
        bytes32 messageHash = getMessageHashEncode3(_offer);
        bytes32 message = ECDSA.toEthSignedMessageHash(messageHash);
        address signer = recoverSigner(message, _signature);

        address buyer = _offer.isSell ? msg.sender : signer;
        address seller = _offer.isSell ? signer : msg.sender;

        require(block.timestamp <= _offer.expiry, "Offer has expired");

        IERC20(_offer.tokenAddress).transferFrom(buyer, seller, _offer.price);
        IERC721(_offer.nftAddress).transferFrom(seller, buyer, _offer.tokenId);

        emit NFTSold(
            buyer,
            signer,
            _offer.nftAddress,
            _offer.tokenId,
            _offer.tokenAddress,
            _offer.price
        );
    }

    function acceptOffer4(
        Offer3 calldata _offer,
        bytes calldata _signature
    ) external {
        bytes32 messageHash = getMessageHashEncode4(_offer);
        bytes32 message = ECDSA.toEthSignedMessageHash(messageHash);
        address signer = recoverSigner(message, _signature);

        address buyer = _offer.isSell ? msg.sender : signer;
        address seller = _offer.isSell ? signer : msg.sender;

        require(block.timestamp <= _offer.expiry, "Offer has expired");

        IERC20(_offer.tokenAddress).transferFrom(buyer, seller, _offer.price);
        IERC721(_offer.nftAddress).transferFrom(seller, buyer, _offer.tokenId);

        emit NFTSold(
            buyer,
            signer,
            _offer.nftAddress,
            _offer.tokenId,
            _offer.tokenAddress,
            _offer.price
        );
    }

    function acceptOffer5(
        Offer3 calldata _offer,
        bytes calldata _signature
    ) external {
        bytes32 messageHash = getMessageHashEncode5(_offer);
        bytes32 message = ECDSA.toEthSignedMessageHash(messageHash);
        address signer = recoverSigner(message, _signature);

        address buyer = _offer.isSell ? msg.sender : signer;
        address seller = _offer.isSell ? signer : msg.sender;

        require(block.timestamp <= _offer.expiry, "Offer has expired");

        IERC20(_offer.tokenAddress).transferFrom(buyer, seller, _offer.price);
        IERC721(_offer.nftAddress).transferFrom(seller, buyer, _offer.tokenId);

        emit NFTSold(
            buyer,
            signer,
            _offer.nftAddress,
            _offer.tokenId,
            _offer.tokenAddress,
            _offer.price
        );
    }

    function acceptOffer6(
        Offer3 calldata _offer,
        bytes calldata _signature
    ) external {
        bytes32 messageHash = getMessageHashEncode5(_offer);
        bytes32 message = ECDSA.toEthSignedMessageHash(messageHash);
        address signer = ECDSA.recover(message, _signature);

        address buyer = _offer.isSell ? msg.sender : signer;
        address seller = _offer.isSell ? signer : msg.sender;

        require(block.timestamp <= _offer.expiry, "Offer has expired");

        IERC20(_offer.tokenAddress).transferFrom(buyer, seller, _offer.price);
        IERC721(_offer.nftAddress).transferFrom(seller, buyer, _offer.tokenId);

        emit NFTSold(
            buyer,
            signer,
            _offer.nftAddress,
            _offer.tokenId,
            _offer.tokenAddress,
            _offer.price
        );
    }

    function acceptOffer7(
        Offer7 calldata _offer,
        bytes calldata _signature
    ) external {
        bytes32 messageHash = getMessageHashEncode7(_offer);
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

    function getMessageHashEncode2(
        Offer2 calldata _offer
    ) public pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    _offer.isSell,
                    _offer.nftAddress,
                    _offer.tokenId,
                    _offer.tokenAddress,
                    _offer.price
                )
            );
    }

    function getMessageHashEncode3(
        Offer3 calldata _offer
    ) public pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    _offer.isSell,
                    _offer.nftAddress,
                    _offer.tokenId,
                    _offer.tokenAddress,
                    _offer.price,
                    _offer.expiry
                )
            );
    }

    function getMessageHashEncode4(
        Offer3 calldata _offer
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
                    address(this)
                )
            );
    }

    function getMessageHashEncode5(
        Offer3 calldata _offer
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

    function getMessageHashEncode7(
        Offer7 calldata _offer
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
                    _offer.nonce,
                    address(this),
                    block.chainid
                )
            );
    }

    function getMessageHashEncode(
        Offer calldata _offer
    ) public view returns (bytes32) {
        // BUG - remove isSell will result in cross purpose bug
        // BUG - remove expiry will result in never exipre sig
        // BUG - remove address(this) will result in cross-contract sig replay
        // BUG - remove block.chainid will result in cross-chain, fork sig replay
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

    function getMessageHashEncodePacked(
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

    function getChainId() external view returns (uint256) {
        return block.chainid;
    }

    function verify(
        address _signer,
        bytes32 _hash,
        bytes memory signature
    ) public pure returns (bool) {
        bytes32 messageHash = _hash;
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);

        return recoverSigner(ethSignedMessageHash, signature) == _signer;
    }

    // function getEthSignedMessageHash(
    //     bytes32 _messageHash
    // ) public pure returns (bytes32) {
    //     return
    //         keccak256(
    //             abi.encodePacked(
    //                 "\x19Ethereum Signed Message:\n32",
    //                 _messageHash
    //             )
    //         );
    // }

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

    function _verifySignature(
        address _signer,
        bytes32 _hash,
        bytes memory _signature
    ) private pure returns (bool) {
        return
            _signer ==
            ECDSA.recover(ECDSA.toEthSignedMessageHash(_hash), _signature);
    }
}
