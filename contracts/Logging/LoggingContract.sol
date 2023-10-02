// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract LoggingContract {
    
    uint256 private startTime;
    uint256 private endTime;

    event SetStartEndTime(uint256 _start, uint256 _end, uint256 _period);

    function setStartEndTime(uint256 _start, uint256 _end) external {
        uint256 _period = _end - _start;
        require(_start >= block.timestamp, "invalid period");
        require(_period >= 7 days, "invalid period");
        startTime = _start;
        endTime = _end;
        emit SetStartEndTime(_start, _end, _period);
    }

    function getCurrentTime() external view returns (uint256) {
        return block.timestamp;
    }
}
