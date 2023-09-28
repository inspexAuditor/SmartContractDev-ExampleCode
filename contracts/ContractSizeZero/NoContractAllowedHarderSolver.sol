// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract SimpleSolverFactory {

    address public solverAddress;

    function createSolver(address target) external returns(address){
        solverAddress = address(new NoContractAllowedHarderSolver(target));
        return solverAddress;
    }
}

contract NoContractAllowedHarderSolver {
    constructor(address target) {
        INoContractAllowedHarder(target).noContractAllowHarder();
    }
}

interface INoContractAllowedHarder {
    function noContractAllowHarder() external;
}