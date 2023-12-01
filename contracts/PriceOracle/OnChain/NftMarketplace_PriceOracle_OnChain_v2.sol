// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

import "./UniSwapV2_V8/ExampleSlidingWindowOracle_V8.sol";
import "../NftMarketplace_PriceOracle_v0.sol";

contract NftMarketplace_PriceOracle_OnChain_v2 is NftMarketplace_PriceOracle_v0 {
    
    ExampleSlidingWindowOracle_V8 public priceOracle; 

    constructor(
        IERC20 weth, 
        address uniswapFactory, 
        uint windowSize, 
        uint8 granularity
    ) NftMarketplace_PriceOracle_v0(weth) {
        priceOracle = new ExampleSlidingWindowOracle_V8(uniswapFactory, windowSize, granularity);
    }

    function convertToWETHAmount(
        address token, 
        uint256 amount
    ) public view override returns (uint256 wethAmount){
        return priceOracle.consult(token, amount, address(_WETH));
    }
    
}
