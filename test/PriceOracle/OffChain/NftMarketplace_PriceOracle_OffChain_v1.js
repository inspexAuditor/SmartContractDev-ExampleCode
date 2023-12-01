const { expect } = require("chai");
const { ethers } = require("hardhat");


describe("NftMarketplace Off-Chain PriceOracle v1", function () {

  let RPC_URL;
  let wethAddress;
  let usdcAddress;
  let aaveAddress;
  let ethPriceFeed;
  let usdcPriceFeed;
  let aavePriceFeed;


  async function deploy(targetChain) {
    /// Define forking and address info following the targetChain
    RPC_URL = ""
    if (targetChain === "Ethereum") {
      /*
        Layer: 1
        Chain: Ethereum mainnet
      */
      RPC_URL = "https://eth.drpc.org";
      wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
      usdcAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
      aaveAddress = "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9";
      ethPriceFeed = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";  /// Pair: ETH/USD
      usdcPriceFeed = "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6"; /// Pair: USDC/USD
      aavePriceFeed = "0x547a514d5e3769680Ce22B2361c10Ea13619e8a9"; /// Pair: AAVE/USD
    } else if (targetChain == "Optimism") {
      /*
        Layer: 2
        Chain: Optimism mainnet
      */
      RPC_URL = "https://optimism.drpc.org"
      wethAddress = "0x4200000000000000000000000000000000000006";
      usdcAddress = "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85";
      aaveAddress = "0x76FB31fb4af56892A25e32cFC43De717950c9278";
      ethPriceFeed = "0x13e3Ee699D1909E989722E753853AE30b17e08c5";  /// Pair: ETH/USD
      usdcPriceFeed = "0x16a9FA2FDa030272Ce99B29CF780dFA30361E0f3"; /// Pair: USDC/USD
      aavePriceFeed = "0x338ed6787f463394D24813b297401B9F05a8C9d1"; /// Pair: AAVE/USD
    } 

    /// Fork from specific chain
    await hre.network.provider.request({
      method: "hardhat_reset",
      params: [{forking: {jsonRpcUrl: RPC_URL},},],
    });

    /// Get accounts
    let [deployer, seller, buyer] = await ethers.getSigners();

    /// Deploy environment contracts
    const ERC20 = await ethers.getContractFactory("ERC20");
    const WETH = await ethers.getContractFactory("MockWETH");
    const ERC721OneSupply = await ethers.getContractFactory("ERC721OneSupply");
    const Marketplace = await ethers.getContractFactory("NftMarketplace_PriceOracle_OffChain_v1");
    
    const usdc = ERC20.attach(usdcAddress);
    const aave = ERC20.attach(aaveAddress);
    const weth = WETH.attach(wethAddress);
    const nft = await ERC721OneSupply.connect(deployer).deploy("Inspex NFT", "iNFT");
    const marketplace = await Marketplace.connect(deployer).deploy(wethAddress);

    /// Add WETH, USDC, and AAVE  to whitelist
    await marketplace.connect(deployer).addWhitelistTokenAndPriceFeed(usdcAddress, usdcPriceFeed);
    await marketplace.connect(deployer).addWhitelistTokenAndPriceFeed(aaveAddress, aavePriceFeed);
    await marketplace.connect(deployer).addWhitelistTokenAndPriceFeed(wethAddress, ethPriceFeed);

    /// Airdrop NFT to the seller
    const nftId = 0;
    await nft.connect(deployer).transferFrom(deployer.address, seller.address, nftId);

    return { marketplace, nft, usdc, aave, weth, seller, buyer };
  }

  async function sellerCreateAnOffer(marketplace, nft, priceToken, priceBase, seller) {
    const nftId = 0;
    const priceTokenDecimals = await priceToken.decimals();
    const decimals = ethers.BigNumber.from("10").pow(priceTokenDecimals);
    const priceAsPriceToken = priceBase.mul(decimals);
    await nft.connect(seller).approve(marketplace.address, nftId);
    const createOfferTX = await marketplace.connect(seller).createOffer(
      nft.address,
      nftId,
      priceToken.address,
      priceAsPriceToken
    );
    const createOfferTXData = await createOfferTX.wait();
    const createOfferTXEvent = await createOfferTXData.events.find(event => event.event === "CreateOffer");
    const [, offerId, ] = createOfferTXEvent.args; /// offerId = 0
    return { nftId, priceAsPriceToken, offerId }
  }

  describe("Deployment", () => {
    it("Deploy NftMarketplace_PriceOracle_OffChian_v1 [Layer1]", async () => {
      const { marketplace, nft, usdc, aave, weth, seller, buyer } = await deploy("Ethereum");
    });

    it("Deploy NftMarketplace_PriceOracle_OffChian_v1 [Layer2]", async () => {
      const { marketplace, nft, usdc, aave, weth, seller, buyer } = await deploy("Optimism");
    });
  });

  describe("Using of Chainlink's Price Feed contract", () => {

    async function simulate(chain, token) {
      const { marketplace, nft, usdc, aave, weth, seller, buyer } = await deploy(chain);
      let priceToken, priceBase;
      /*
        Seller create an offer: selling NFT ID:0
      */
      if (token === "USDC") {
        priceToken = usdc;
        priceBase = ethers.BigNumber.from("3000"); /// 3,000 USDC
      } else if (token === "AAVE"){
        priceToken = aave;
        priceBase = ethers.BigNumber.from("30");   /// 30 AAVE
      }
      const { nftId, priceAsPriceToken, offerId } = await sellerCreateAnOffer(marketplace, nft, priceToken, priceBase, seller);
      console.log(`=== Offer Info ====`);
      console.log(`Offer ID: ${offerId}`);
      console.log(`NFT ID  : ${nftId}`);
      console.log(`Price   : ${ethers.utils.formatUnits(priceAsPriceToken, await priceToken.decimals())} ${token}`);
      /*
        Check price oracle data
      */
      console.log(`=== Data from Price Oracle ===`);
      const [ethPrice, ethPriceDecimals] = await marketplace.getTokenPrice(weth.address);
      const [tokenPrice, tokenPriceDecimals] = await marketplace.getTokenPrice(priceToken.address);
      console.log(`ETH price  : ${ethers.utils.formatUnits(ethPrice, ethPriceDecimals)} USD`);
      console.log(`${token} price : ${ethers.utils.formatUnits(tokenPrice, tokenPriceDecimals)} USD`);
      console.log(`=== Convert NFT's Price to WETH ===`);
      const nftPriceAsWeth = await marketplace.convertToWETHAmount(priceToken.address, priceAsPriceToken);
      console.log(`Price   : ${ethers.utils.formatEther(nftPriceAsWeth)} WETH`);
      /*
        Buyer accept the offer 0 by paying with WETH
      */
      await weth.connect(buyer).deposit({value: nftPriceAsWeth});
      await weth.connect(buyer).approve(marketplace.address, nftPriceAsWeth);
      await marketplace.connect(buyer).acceptOffer(nft.address, offerId, true);
      
      expect(await nft.ownerOf(nftId)).to.equal(buyer.address);
    }

    it("[Layer 1] USDC - Ethereum mainnet", async () => {
      await simulate("Ethereum", "USDC");
    }); 

    it("[Layer 2] USDC - Optimism mainnet", async () => {
      await simulate("Optimism", "USDC");
    }); 

    it("[Layer 1] AAVE - Ethereum mainnet", async () => {
      await simulate("Ethereum", "AAVE");
    }); 
    
    it("[Layer 2] AAVE - Optimism mainnet", async () => {
      await simulate("Optimism", "AAVE");
    }); 

  });

});