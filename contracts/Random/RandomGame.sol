// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RandomGame is Ownable {
    IERC20 public immutable token;

    uint256 public constant MIN_NUMBER = 3;
    uint256 public constant MAX_NUMBER = 18;
    uint256 public constant PLAY_FEE = 100 * (10 ** 18); // 100 tokens, assuming 18 decimals
    uint256 public constant REWARD = 1000 * (10 ** 18); // 1000 tokens

    // New state variable to track if the game is active
    bool public gameActive = false;

    constructor(IERC20 _token) {
        token = _token;
    }

    function secretNumber() private view returns (uint256) {
        uint256 randomHash = uint256(
            keccak256(
                abi.encodePacked(blockhash(block.number), block.timestamp)
            )
        );
        return (randomHash % (MAX_NUMBER - MIN_NUMBER + 1)) + MIN_NUMBER;
    }

    function guess(uint256 _guess) external {
        require(gameActive, "The game is not active.");
        require(
            _guess >= MIN_NUMBER && _guess <= MAX_NUMBER,
            "Guess out of range."
        );

        uint256 pickedNumber = secretNumber();

        if (_guess != pickedNumber) {
            // Player loses: Transfer PLAY_FEE tokens from the player to the owner
            require(
                token.balanceOf(msg.sender) >= PLAY_FEE,
                "Insufficient token balance to play."
            );
            bool feePaid = token.transferFrom(msg.sender, owner(), PLAY_FEE);
            require(feePaid, "Failed to transfer play fee to the owner.");
        } else {
            // Player wins: Transfer REWARD tokens from the owner to the player
            token.transferFrom(owner(), address(this), REWARD);
            require(
                token.transfer(msg.sender, REWARD),
                "Failed to send token reward."
            );
        }
    }

    // Function to start the game by the owner
    function start() external onlyOwner {
        require(!gameActive, "The game is already active.");
        gameActive = true;
    }

    // Function to stop the game by the owner
    function stop() external onlyOwner {
        require(gameActive, "The game is not active.");
        token.approve(address(this), 0);
        gameActive = false;
    }
}
