// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract NftMarketplace_PriceOracle_v0 {

    using SafeERC20 for IERC20;

    event CreateOffer(address owner, uint256 offerID, Offer offer);
    event CancelOffer(address owner, uint256 offerID);
    event AcceptOffer(bool isSell, address buyer, address seller, uint256 offerID);

    enum Status{
        NOT_ACTIVE,
        ACTIVE,
        CLOSED,
        CANCELED
    }

    struct Offer {
        Status status;
        address owner;
        address nftAdress;
        uint256 nftId;
        address priceAddress;
        uint256 priceAmount;
        bool isSell;
    }

    /// NFT => Offer ID => Offer
    mapping(address => mapping(uint256 => Offer)) public nftOffers;
    /// Nft => Last Offer ID
    mapping(address => uint256) public lastOfferId;
    /// WETH contract
    IERC20 internal immutable _WETH;

    constructor(IERC20 weth) {
        _WETH = weth;
    }

    function createOffer(address nft, uint256 nftId, address token, uint256 amount) external returns(uint256 offerId){
        /// create new offer
        Offer memory offer;
        offer.status = Status.ACTIVE;
        offer.owner = msg.sender;
        offer.nftAdress = nft;
        offer.nftId = nftId;
        offer.priceAddress = token;
        offer.priceAmount = amount;
        offer.isSell = IERC721(nft).ownerOf(nftId) == msg.sender;
        /// add offer to list
        offerId = lastOfferId[nft]++;
        nftOffers[nft][offerId] = offer;
        emit CreateOffer(msg.sender, offerId, offer);
    }

    function cancelOffer(address nft, uint256 offerId) external {
        Offer storage offer = nftOffers[nft][offerId];
        /// validate data
        require(offer.status == Status.ACTIVE, "Offer is not active");
        require(offer.owner == msg.sender, "It's not yours");
        /// update offer's status
        offer.status = Status.CANCELED;
        emit CancelOffer(msg.sender, offerId);
    }

    function acceptOffer(address nft, uint256 offerId, bool isPayingWithWETH) external {
        Offer storage offer = nftOffers[nft][offerId];
        /// validate data
        require(offer.status == Status.ACTIVE, "Offer is not active");
        /// update offer status
        offer.status = Status.CLOSED;
        address buyer;
        address seller;
        if (offer.isSell == true){
            buyer = msg.sender;
            seller = offer.owner;
        } else {
            buyer = offer.owner;
            seller = msg.sender;
        }
        /// Support paying with WETH instance of offer.priceAddress
        if (isPayingWithWETH) {
            /// convert amount of offer.priceAddress to WETH
            uint256 requiredWETHAmount = convertToWETHAmount(offer.priceAddress, offer.priceAmount);
            _WETH.safeTransferFrom(buyer, seller, requiredWETHAmount);
        } else {
            IERC20(offer.priceAddress).safeTransferFrom(buyer, seller, offer.priceAmount);
        } 
        /// transfer nft to buyer
        IERC721(offer.nftAdress).safeTransferFrom(seller, buyer, offer.nftId, "");

        emit AcceptOffer(offer.isSell, buyer, seller, offerId);
    }

    function convertToWETHAmount(
        address token, 
        uint256 amount
    ) public view virtual returns (uint256 wethAmount){
        /// will be supported in the next version :)
        require(token == address(_WETH), "The conversion is not supported yet.");
        wethAmount = amount;
    }
}
