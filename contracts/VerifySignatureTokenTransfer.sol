// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract InsdexToken is ERC20 {
    constructor() ERC20("", "") {}

    function freeMint(uint amount) public {
        _mint(msg.sender, amount);
    }
}

contract TokenSender {

    using ECDSA for bytes32;

    mapping(bytes32 => bool) executed;

    function transfer(address sender, uint amount, address recipient, address tokenContract, uint nonce, bytes memory signature) public {
        bytes32 messageHash = getHash(sender, amount, recipient, tokenContract, nonce);
        bytes32 signedMessageHash = messageHash.toEthSignedMessageHash();

        require(!executed[signedMessageHash], "Already executed!");

        address signer = signedMessageHash.recover(signature);

        require(signer == sender, "Signature does not come from sender");

        executed[signedMessageHash] = true;
        bool sent = ERC20(tokenContract).transferFrom(sender, recipient, amount);
        require(sent, "Transfer failed");
    }

    function getHash(address sender, uint amount, address recipient, address tokenContract, uint nonce) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(sender, amount, recipient, tokenContract, nonce));
    }
}