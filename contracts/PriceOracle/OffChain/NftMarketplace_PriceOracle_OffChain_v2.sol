// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../NftMarketplace_PriceOracle_v0.sol";

contract NftMarketplace_PriceOracle_OffChain_v2 is NftMarketplace_PriceOracle_v0, Ownable {

    mapping(address => AggregatorV3Interface) public whitelistTokenAndPriceFeed;
    mapping(address => uint256) public stalePriceThreshold;

    constructor(IERC20 weth) NftMarketplace_PriceOracle_v0(weth) {}

    function addWhitelistTokenAndPriceFeed(address token, address tokenPriceFeed, uint256 threshold) public onlyOwner() {
        whitelistTokenAndPriceFeed[token] = AggregatorV3Interface(tokenPriceFeed);
        require(threshold > 0, "Invalid Threshold");
        stalePriceThreshold[token] = threshold;
    }

    function removeWhitelistTokenAndPriceFeed(address token) public onlyOwner() {
        delete whitelistTokenAndPriceFeed[token];
        delete stalePriceThreshold[token];
    }

    function convertToWETHAmount(
        address token, 
        uint256 amount
    ) public view override returns (uint256 wethAmount){
        require(address(whitelistTokenAndPriceFeed[address(_WETH)]) != address(0), "WETH is not currently supported");
        require(address(whitelistTokenAndPriceFeed[token]) != address(0), "Token is not currently supported");
        
        uint8 wethDecimals = ERC20(address(_WETH)).decimals();

        (uint256 ethPrice, uint8 ethPriceDecimals) = getTokenPrice(address(_WETH));
        uint256 ethScaledPrice = scalePrice(ethPrice, ethPriceDecimals, wethDecimals);
    
         uint8 tokenDecimals =  ERC20(address(token)).decimals();
        (uint256 tokenPrice, uint8 tokenPriceDecimals) = getTokenPrice(token);
        uint256 tokenScaledPrice = scalePrice(tokenPrice, tokenPriceDecimals, wethDecimals);
        uint256 tokenScaledAmount = scalePrice(amount, tokenDecimals, wethDecimals);

        wethAmount = tokenScaledPrice * tokenScaledAmount / ethScaledPrice;
    }

    /* 
        This function is scaling the price's decimals to be the same as WETH.
    */
    function scalePrice(
        uint256 price, 
        uint8 priceDecimals, 
        uint8 wethDecimals
    ) internal pure returns (uint256 scaledPrice){
        if (priceDecimals < wethDecimals) {
            scaledPrice = price * uint256(10 ** uint256(wethDecimals - priceDecimals));
        } else if ( priceDecimals > wethDecimals ) {
            scaledPrice = price / uint256(10 ** uint256(priceDecimals - wethDecimals));
        } else {
            scaledPrice = price;
        }
    }

    /*
        Get lastest price from Chainlink's Price Oracle
     */
    function getTokenPrice(address token) public view returns (uint256, uint8) {
        AggregatorV3Interface priceFeed = whitelistTokenAndPriceFeed[token];

        require(address(priceFeed) != address(0), "Invalid price feed");

        uint8 priceDecimals = priceFeed.decimals();
        (uint80 roundID,int256 answer, ,uint256 updatedAt, uint80 answeredInRound) = priceFeed.latestRoundData();

        require(answer > 0,"Negative Price");
        require(updatedAt != 0, "Incomplete round");
        require(answeredInRound >= roundID, "Stale price (AnsweredInRound)");
        require(block.timestamp <= updatedAt + stalePriceThreshold[token], "Stale price (UpdatedAt)");

        return (uint256(answer), priceDecimals);
    }
}