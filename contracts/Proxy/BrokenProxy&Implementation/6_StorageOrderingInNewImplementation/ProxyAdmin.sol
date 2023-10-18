// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

/// This contract is just showing some parts of EIP-1967
contract ProxyAdmin {
    /// _PROXYADMIN_SLOT = bytes32(uint256(keccak256("eip1967.proxy.ProxyAdmin")) - 1)
    bytes32 internal constant _PROXYADMIN_SLOT = 0x507141a86dcfe825edd14fd74989272573adc6dd9c35311969263e9d07561961;

    struct ProxyAdminStorage {
        address admin;
    }

    function _getProxyAdminStorage() internal pure returns (ProxyAdminStorage storage r) {
        assembly {
            r.slot := _PROXYADMIN_SLOT
        }
    }

    function _setAdmin(address newAdmin) internal {
        _getProxyAdminStorage().admin = newAdmin;
    }

    function _getAdmin() internal view returns (address){
        return _getProxyAdminStorage().admin;
    }

    modifier onlyAdmin() {
        require(msg.sender == _getAdmin(), "You are not an admin");
        _;
    }
    
}
