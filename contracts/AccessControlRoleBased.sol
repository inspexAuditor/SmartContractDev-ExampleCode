// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract AccessControlRoleBased is ERC721, AccessControl {

    bytes32 public constant VIP_MINTER_ROLE =  keccak256("VIP_MINTER_ROLE");
    bytes32 public constant NORMAL_MINTER_ROLE =  keccak256("NORMAL_MINTER_ROLE");
    uint256 public constant mintPrice = 10 ether;
    uint256 public constant normalFee = 1.5 ether;
    uint256 public constant vipFee = 0.75 ether;

    mapping(address => uint256) public mintCountPerUser;
    uint256 public mintCount;
    uint256 public limitSupply;
    uint256 public limitPerUser;
    uint256 public currentTokenId;

    constructor(uint256 _limitPerUser, uint256 _limitSupply) ERC721("Rare Item", "RIT"){
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        limitPerUser = _limitPerUser;
        limitSupply = _limitSupply;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /// Admin functions
    function addVipMinter(address[] memory newVIPs) external onlyRole(DEFAULT_ADMIN_ROLE) {
        for(uint i ; i<newVIPs.length ;){
            _grantRole(VIP_MINTER_ROLE, newVIPs[i]);
            unchecked { i++; }
        }
    }

    function addNormalMinter(address[] memory newMinters) external onlyRole(DEFAULT_ADMIN_ROLE) {
        for(uint i ; i<newMinters.length ;){
            _grantRole(NORMAL_MINTER_ROLE, newMinters[i]);
            unchecked { i++; }
        }
    }

    function withdraw() external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 current_balance = address(this).balance;
        require(current_balance > 0, "Current balance is zero");
        (bool sent, ) = (msg.sender).call{value: current_balance}("");
        require(sent, "Failed to send Ether");
    }
    
    /// User functions
    function mint() public payable onlyRole(NORMAL_MINTER_ROLE) returns(uint256) {
        require(mintCount + 1 <= limitSupply, "Sold out!!");
        require(mintCountPerUser[msg.sender] + 1 <= limitPerUser, "You have reached the minting limit");
        require(msg.value == mintPrice + normalFee, "Insufficien ETH");

        mintCount += 1;
        mintCountPerUser[msg.sender] += 1;
        currentTokenId += 1;

        _mint(msg.sender, currentTokenId);
        return currentTokenId;
    }

    function mintVIP() public payable onlyRole(VIP_MINTER_ROLE) returns(uint256) {
        require(mintCount + 1 <= limitSupply, "Sold out!!");
        require(mintCountPerUser[msg.sender] + 1 <= limitPerUser, "You have reached the minting limit");
        require(msg.value == mintPrice + vipFee, "Insufficien ETH");

        mintCount += 1;
        mintCountPerUser[msg.sender] += 1;
        currentTokenId += 1;

        _mint(msg.sender, currentTokenId);
        return currentTokenId;
    }

}
