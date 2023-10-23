// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract NFTMarketplace {

    struct Listing {
        address seller;
        address nftAddress;
        uint256 tokenId;
        address tokenAddress;
        uint256 price;
        bool active;
    }

    Listing[] public listings;

    event NFTListed(address seller, address nftAddress, uint256 tokenId, address tokenAddress, uint256 price, uint256 listingId);
    event NFTSold(address buyer, address seller, address nftAddress, uint256 tokenId, address tokenAddress, uint256 price, uint256 listingId);

    function listNFT(address _nftAddress, uint256 _tokenId, address _tokenAddress, uint256 _price) external {
        // BUG - transferFrom(IERC721().ownerOf(tokenId),..... - transfer nft from owner
        IERC721(_nftAddress).transferFrom(msg.sender, address(this), _tokenId);
        uint256 listingId = listings.length;
        listings.push(Listing({
            seller: msg.sender,
            nftAddress: _nftAddress,
            tokenId: _tokenId,
            tokenAddress: _tokenAddress,
            price: _price,
            active: true
        }));
        emit NFTListed(msg.sender, _nftAddress, _tokenId, _tokenAddress, _price, listingId);
    }

    function cancelListing(uint256 _listingId) external {
        Listing storage listing = listings[_listingId];
        // BUG - remove seller check , resulting in attacker can cancel any listing to unauthorized transfer nft out from contract
        require(listing.seller == msg.sender, "Not Seller");
        // BUG - remove state check, resulting in attacker can cancelListing to unauthorized transfer nft out from contract, e.g. A already sold tokenid 1 to B, B list on market, A cancelListing and get tokenid 1 back
        require(listing.active, "Not Active");

        listing.active = false;

        IERC721(listing.nftAddress).transferFrom(address(this), msg.sender, listing.tokenId);
    }

    function buyNFT(uint256 _listingId) external {
        Listing storage listing = listings[_listingId];
        require(listing.active, "Listing is no longer available");

        listing.active = false;

        IERC20(listing.tokenAddress).transferFrom(msg.sender, listing.seller, listing.price);
        IERC721(listing.nftAddress).transferFrom(address(this), msg.sender, listing.tokenId);
        emit NFTSold(msg.sender, listing.seller, listing.nftAddress, listing.tokenId, listing.tokenAddress, listing.price, _listingId);
    }

    function getListingCount() public view returns (uint256) {
        return listings.length;
    }
}
