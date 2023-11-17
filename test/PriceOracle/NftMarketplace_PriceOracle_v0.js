const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NftMarketplace PriceOracle v0", function () {
  
  async function deploy() {
    /// Get accounts
    let [deployer, buyer, seller] = await ethers.getSigners();

    /// Deploy testing contracts
    const MockWETH = await ethers.getContractFactory("MockWETH");
    const ERC721OneSupply = await ethers.getContractFactory("ERC721OneSupply");
    const NftMarketplace_PriceOracle_v0 = await ethers.getContractFactory("NftMarketplace_PriceOracle_v0");

    const weth = await MockWETH.connect(deployer).deploy();
    const nft = await ERC721OneSupply.connect(deployer).deploy("Inspex NFT", "iNFT");
    const marketplace = await NftMarketplace_PriceOracle_v0.connect(deployer).deploy(weth.address);

    /// Airdrop
    const nftId = 0;
    await nft.connect(deployer).transferFrom(deployer.address, seller.address, nftId);

    return { marketplace, weth, nft, buyer, seller };
  }

  describe("Deployment", () => {
    it("Deploy NftMarketplace_PriceOracle_v0", async () => {
      const { marketplace, weth, nft, buyer, seller } = await deploy();
      const nftId = 0;
      expect(await nft.ownerOf(nftId)).to.equal(seller.address);
    });
  });

  describe("Test Offering", () => {
    it("Seller create an aoffer, then buyer accept it", async () => {
      const { marketplace, weth, nft, buyer, seller } = await deploy();
      /// Selller create an offer
      const price = ethers.utils.parseEther("10");
      const nftId = 0;
      await nft.connect(seller).approve(marketplace.address, nftId);
      const createOfferTX = await marketplace.connect(seller).createOffer(
        nft.address,
        nftId,
        weth.address,
        price
      );
      const createOfferTXData = await createOfferTX.wait();
      const createOfferTXEvent = await createOfferTXData.events.find(event => event.event === "CreateOffer");
      const [, offerId, ] = createOfferTXEvent.args;
      //// Buyer accept the offer
      await weth.connect(buyer).deposit({value: price});
      await weth.connect(buyer).approve(marketplace.address, price);
      await marketplace.connect(buyer).acceptOffer(nft.address, offerId, weth.address);

      expect(await weth.balanceOf(seller.address)).to.equal(price);
      expect(await nft.ownerOf(nftId)).to.equal(buyer.address);
    });

  });

});