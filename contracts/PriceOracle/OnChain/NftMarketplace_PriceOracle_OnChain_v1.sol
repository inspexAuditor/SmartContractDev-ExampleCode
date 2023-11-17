// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

import "./UniSwapV2_V8/UniswapV2Library_V8.sol";
import "../NftMarketplace_PriceOracle_v0.sol";

contract NftMarketplace_PriceOracle_OnChain_v1 is NftMarketplace_PriceOracle_v0 {
    
    address private _uniswapFactory;

    constructor(IERC20 weth, address uniswapFactory ) NftMarketplace_PriceOracle_v0(weth) {
        _uniswapFactory = uniswapFactory;
    }

    function convertToWETHAmount(
        address token, 
        uint256 amount
    ) public view override returns (uint256 wethAmount){
        (uint256 reserveWETH, uint256 reserveToken) = UniswapV2Library_V8.getReserves(
            _uniswapFactory,
            address(_WETH),
            token
        );
        wethAmount = UniswapV2Library_V8.quote(amount, reserveToken, reserveWETH);
    }
    
}
