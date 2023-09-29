// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract LotteryGame {
    address payable owner; // owner of this contract
    address payable[] players;
    uint256 public BET = 1 ether; // Use uint256 for Ether values
    uint8 public THRESHOLD = 3;
    uint256 public settlementBlockNumber;
    address public lastWinner; // Use `address` for consistency

    event Play(address indexed player, uint256 numOfPlayers);
    event Drawing(uint256 settlementBlockNumber);
    event Drawn(address indexed winner);

    constructor() payable {
        owner = payable(msg.sender);
    }

    // participate in the game
    function play() public payable {
        require(msg.value == BET, "One bet needs 1 ether");
        require(players.length < THRESHOLD, "Waiting for lottery result");

        players.push(payable(msg.sender)); // record the players
        emit Play(msg.sender, players.length);

        if (players.length == THRESHOLD) {
            // reach threshold, lock in the block hash in the future
            settlementBlockNumber = block.number + 10;
            emit Drawing(settlementBlockNumber);
        }
    }

    // draw a lottery
    function draw() public {
        require(msg.sender == owner, "Only contract owner can call draw()!");
        require(players.length == THRESHOLD,"Number of players doesn't reach threshold.");
        require(block.number > settlementBlockNumber,"SettlementBlock isn't valid yet!");
        require(block.number < settlementBlockNumber + 256,"SettlementBlock is out of date!");

        uint8 winner = randomNumber();
        lastWinner = players[winner];
        payable(players[winner]).transfer(address(this).balance);

        emit Drawn(lastWinner);

        settlementBlockNumber = 0;
        delete players;
    }

    function randomNumber() public view returns (uint8) {
        return uint8(uint(keccak256(abi.encodePacked(blockhash(settlementBlockNumber),block.timestamp)))) % THRESHOLD;
    }

    function getPlayers() public view returns (address payable[] memory) {
        return players;
    }

    function getSettlementBlock() public view returns (uint256) {
        return settlementBlockNumber;
    }

    function getThreshold() public view returns (uint8) {
        return THRESHOLD;
    }

    function getLastWinner() public view returns (address) {
        return lastWinner;
    }

    function getBalance() public view returns (uint) {
        return address(this).balance;
    }
}
