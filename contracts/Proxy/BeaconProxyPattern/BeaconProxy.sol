// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

import "@openzeppelin/contracts/proxy/Proxy.sol";
import "./IBeacon.sol";

contract BeaconProxyContract is Proxy {

    address private immutable _beacon;

    constructor(address newBeacon) {
        _beacon = newBeacon;
    } 

    function getBeacon() public view returns (address) {
        return _beacon;
    }

    function _implementation() internal view override returns (address){
        return IBeacon(getBeacon()).implementation();
    }

}

