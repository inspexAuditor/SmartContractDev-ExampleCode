// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract ProxyWithLibrary is Proxy, ERC1967Upgrade {

    constructor(address _logic, bytes memory _data) payable {
        _upgradeToAndCall(_logic, _data, false);
    }

    function _implementation() internal view override returns (address impl) {
        return ERC1967Upgrade._getImplementation();
    }

}