// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract EventTicket is ERC721, ERC721Enumerable, ERC721Burnable, Ownable {
    using Counters for Counters.Counter;

    //Sale States
    bool public isAllowListActive = false;
    mapping(address => bool) public mintClaimed; // Check that the NFT is Claimed?

    //Privates
    string private _baseURIextended;
    address private signer;

    //Constants
    uint256 public constant MAX_SUPPLY = 555;
    uint256 public constant PRICE_PER_TOKEN = 1 ether;
    uint256 public constant RESERVE_COUNT = 55;

    Counters.Counter public _tokenIdCounter;

    constructor() ERC721("ERC721Token", "ERC721") {
        _safeMint(msg.sender, _tokenIdCounter.current());
    }

    function totalSupply() public view override returns (uint256) {
        return _tokenIdCounter.current();
    }

    function safeMint(address to) public onlyOwner {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
    }

    // The following functions are overrides required by Solidity.

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    //Allowed Minting
    function setIsAllowListActive(bool _isAllowListActive) external onlyOwner {
        isAllowListActive = _isAllowListActive;
    }

    function setSigner(address _signer) external onlyOwner {
        signer = _signer;
    }

    function mintAllowList(
        address _address,
        bytes calldata _voucher
    ) external payable {
        uint256 ts = totalSupply();
        require(isAllowListActive, "Allow list is not active");
        require(!mintClaimed[_address], "Already claimed mint");
        require(ts + 1 <= MAX_SUPPLY, "Purchase would exceed max tokens");
        require(
            msg.value >= PRICE_PER_TOKEN,
            "Ether value sent is not correct"
        );
        require(msg.sender == _address, "Not your voucher");

        bytes32 hash = keccak256(abi.encodePacked(_address));
        require(_verifySignature(signer, hash, _voucher), "Invalid voucher");

        mintClaimed[_address] = true;
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(_address, tokenId);
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

    //

    //Overrides
    function setBaseURI(string memory baseURI_) external onlyOwner {
        _baseURIextended = baseURI_;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseURIextended;
    }

    //

    function reserve() public onlyOwner {
        require(totalSupply() == 0, "Tokens already reserved");
        _safeMint(msg.sender, RESERVE_COUNT);
    }

    //Withdraw balance
    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        payable(msg.sender).transfer(balance);
    }

    //

    function getMessageHash(
        address _address
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(_address));
    }

    function getEthSignedMessageHash(
        bytes32 _messageHash
    ) public pure returns (bytes32) {
        /*
        Signature is produced by signing a keccak256 hash with the following format:
        "\x19Ethereum Signed Message\n" + len(msg) + msg
        */
        return
            keccak256(
                abi.encodePacked(
                    "\x19Ethereum Signed Message:\n32",
                    _messageHash
                )
            );
    }

    function verify(
        address _signer,
        address _to,
        uint _amount,
        string memory _message,
        uint _nonce,
        bytes memory signature
    ) public pure returns (bool) {
        bytes32 messageHash = getMessageHash(_to);
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);

        return recoverSigner(ethSignedMessageHash, signature) == _signer;
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
            /*
            First 32 bytes stores the length of the signature

            add(sig, 32) = pointer of sig + 32
            effectively, skips first 32 bytes of signature

            mload(p) loads next 32 bytes starting at the memory address p into memory
            */

            // first 32 bytes, after the length prefix
            r := mload(add(sig, 32))
            // second 32 bytes
            s := mload(add(sig, 64))
            // final byte (first byte of the next 32 bytes)
            v := byte(0, mload(add(sig, 96)))
        }


        // implicitly return (r, s, v)
    }

    

    function getMalleabilitySignature(
        bytes memory sig
    ) public pure returns (bytes memory malsig) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(sig);

        if (v == 27) v++;
        else if (v == 28) v--;

        s = bytes32(
            0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141 -
                uint256(s)
        );
        return abi.encodePacked(r, s, v);
    }

        function getRSV(
        bytes memory sig
    ) public pure returns (bytes32 r) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(sig);

        if (v == 27) v++;
        else if (v == 28) v--;

        s = bytes32(
            0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141 -
                uint256(s)
        );
        return s;
    }
}
