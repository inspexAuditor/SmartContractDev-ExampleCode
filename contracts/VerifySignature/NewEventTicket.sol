// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract SpecialNFTSale is ERC721Enumerable, AccessControlEnumerable {
    using ECDSA for bytes32;
    using Counters for Counters.Counter;

    bytes32 public constant SIGNER_ROLE = keccak256("SIGNER_ROLE");
    bytes32 public constant ADMIN_ROLE = DEFAULT_ADMIN_ROLE;

    uint256 public constant NFT_PRICE = 1 ether;
    Counters.Counter private _tokenIdCounter;

    mapping(bytes => bool) public redeemedVouchers;
    mapping(address => uint256) public approvals;
    uint256 public totalTeamMembers;

    event VoucherRedeemed(bytes voucher);

    constructor(address _admin) ERC721("SpecialNFT", "SNFT") {
        _setupRole(ADMIN_ROLE, _admin);
        _setRoleAdmin(SIGNER_ROLE, ADMIN_ROLE);
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(ERC721Enumerable, AccessControlEnumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function mintNFT(address recipient) private {
        _tokenIdCounter.increment();
        _mint(recipient, _tokenIdCounter.current());
    }

    function buyNFTWithVoucher(
        bytes calldata voucher,
        bytes calldata signature
    ) external payable {
        require(msg.value == NFT_PRICE, "Incorrect Ether sent.");
        require(!redeemedVouchers[voucher], "Voucher already redeemed.");

        bytes32 hash = keccak256(voucher).toEthSignedMessageHash();
        address signer = hash.recover(signature);

        require(hasRole(SIGNER_ROLE, signer), "Invalid voucher signature.");

        redeemedVouchers[voucher] = true;
        emit VoucherRedeemed(voucher);

        mintNFT(msg.sender);
    }

    function addTeamMember(address member) external {
        require(
            hasRole(ADMIN_ROLE, _msgSender()),
            "Only admin can add team members."
        );

        grantRole(SIGNER_ROLE, member);
        totalTeamMembers++;
    }

    function approveWithdrawal() external {
        require(hasRole(SIGNER_ROLE, _msgSender()), "Not a team member.");

        approvals[_msgSender()] = 1;
    }

    function withdrawFunds() external {
        uint256 requiredApprovals = totalTeamMembers / 2; // At least half of the team members
        uint256 currentApprovals = 0;

        for (uint256 i = 0; i < getRoleMemberCount(SIGNER_ROLE); i++) {
            address member = getRoleMember(SIGNER_ROLE, i);
            if (approvals[member] == 1) {
                currentApprovals++;
            }
        }

        require(
            currentApprovals >= requiredApprovals,
            "More approvals needed."
        );

        uint256 balance = address(this).balance;
        uint256 perMember = balance / totalTeamMembers;

        for (uint256 i = 0; i < getRoleMemberCount(SIGNER_ROLE); i++) {
            address member = getRoleMember(SIGNER_ROLE, i);
            payable(member).transfer(perMember);
            approvals[member] = 0;
        }
    }
}
