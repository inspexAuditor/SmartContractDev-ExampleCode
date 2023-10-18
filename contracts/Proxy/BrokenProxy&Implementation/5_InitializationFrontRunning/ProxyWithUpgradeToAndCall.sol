// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";
import "../3_UnexpectedReinitiazation/SimpleInitializable.sol";

/// This contract is just showing some parts of EIP-1967
contract ProxyWithUpgradeToAndCall is SimpleInitializable {
    /// To avoid clashes in storage usage between the proxy and logic contract, 
    /// the address of the logic contract is typically saved in a specific storage slot
    /// According to the EIP-1967:
    /// _IMPLEMENTATION_SLOT = bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1)
    bytes32 internal constant _IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    struct AddressSlot {
        address value;
    }

    constructor(address _logic, bytes memory data) {
        assert(_IMPLEMENTATION_SLOT == bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1));
        _upgradeToAndCall(_logic, data);
    }

    function _upgradeToAndCall(address newImplementation, bytes memory data) internal {
        _setImplementation(newImplementation);
        require(newImplementation.code.length != 0, "newImplementation is not a contract");
        if (data.length > 0) {
            (bool success, ) = newImplementation.delegatecall(data);
            require(success, "delegatecall failed");
        }
    }

    function _implementation() internal view virtual returns (address impl) {
        return _getImplementation().value;
    }
    
    fallback() external payable virtual {
        _delegate(_implementation());
    }

    function _delegate(address implementation) internal virtual {
        assembly {
            // Copy msg.data. We take full control of memory in this inline assembly
            // block because it will not return to Solidity code. We overwrite the
            // Solidity scratch pad at memory position 0.
            calldatacopy(0, 0, calldatasize())

            // Call the implementation.
            // out and outsize are 0 because we don't know the size yet.
            let result := delegatecall(gas(), implementation, 0, calldatasize(), 0, 0)

            // Copy the returned data.
            returndatacopy(0, 0, returndatasize())

            switch result
            // delegatecall returns 0 on error.
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }

    function _getImplementation() internal pure returns (AddressSlot storage r) {
        assembly {
            r.slot := _IMPLEMENTATION_SLOT
        }
    }

    function _setImplementation(address newImplementation) private {
        require(newImplementation.code.length > 0, "newImplementation is not a contract");
        _getImplementation().value = newImplementation;
    }
    
}
