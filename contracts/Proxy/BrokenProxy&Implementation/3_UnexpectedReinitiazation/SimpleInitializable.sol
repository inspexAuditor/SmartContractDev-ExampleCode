// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

/// This contract is just showing some parts of EIP-1967
contract SimpleInitializable {
    /// _INITIALIZABLE_SOT = bytes32(uint256(keccak256("eip1967.proxy.SimpleInitializable")) - 1)
    bytes32 internal constant _INITIALIZABLE_SLOT = 0x398dd0199e59665bbd171f05340e17c61906f52300dc3d459e805cfb06fa5da2;

    struct InitializableStorage {
        bool _initialized;
    }

    function _getIsInitialized() internal pure returns (InitializableStorage storage r) {
        assembly {
            r.slot := _INITIALIZABLE_SLOT
        }
    }

    function _setIsInitialized(bool isInitialized) internal {
        _getIsInitialized()._initialized = isInitialized;
    }

    function _isInitialized() private view returns (bool initialized){
        initialized = _getIsInitialized()._initialized;
    }

    function _disableInitializer() internal {
        _setIsInitialized(true);
    }

    modifier initializer {
        require(_isInitialized() == false, "This contract is already initialized");
        _;
        _setIsInitialized(true);
    }
    
}
