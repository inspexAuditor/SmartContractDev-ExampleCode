const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AccessControlRoleBased", function () {
  
  async function deploy() {
    /// Get accounts
    let [deployer, vip_one, vip_two, normal_one, normal_two] = await ethers.getSigners();

    /// Deploy testing contracts
    const RareItemNFT = await ethers.getContractFactory("AccessControlRoleBased");
    const limitPerUser = 1;
    const limitSupply = 3;
    const nft = await RareItemNFT.connect(deployer).deploy(limitPerUser, limitSupply);
    const vips = [vip_one.address, vip_two.address];
    const normals = [normal_one.address, normal_two.address];
    await nft.connect(deployer).addVipMinter(vips);
    await nft.connect(deployer).addNormalMinter(normals);
    return { nft, deployer, vip_one, vip_two, normal_one, normal_two };
  }

  describe("Deployment", () => {
    it("Deploy AccessControlRoleBased contract", async () => {
      const { nft, deployer } = await deploy();
      /// check deployer's role
      console.log(`deployer address  : ${await deployer.getAddress()}`);
      const defaultAdminRole = await nft.DEFAULT_ADMIN_ROLE();
      expect(await nft.hasRole(defaultAdminRole, deployer.address)).to.be.true;
    });
  });

  describe("Minting NFTs", () => {
    it("VIP mint", async () => {
      const { nft, deployer, vip_one, vip_two } = await deploy();
      /// calculate amount to pay
      const price = await nft.mintPrice();
      const vipFee = await nft.vipFee();
      const total = price.add(vipFee); // use BigNum method
      /// vip mint
      await nft.connect(vip_one).mintVIP({value:total});
      await nft.connect(vip_two).mintVIP({value:total});
      /// check balance 
      expect(await nft.balanceOf(vip_one.address)).to.be.equal(1);
      expect(await nft.balanceOf(vip_two.address)).to.be.equal(1);
    });

    it("Normal mint ", async () => {
      const { nft, deployer, vip_one, vip_two, normal_one, normal_two } = await deploy();
      /// calculate amount to pay 
      const price = await nft.mintPrice();
      const normalFee = await nft.normalFee();
      const total = price.add(normalFee);
      /// normal mint
      await nft.connect(normal_one).mint({value:total});
      await nft.connect(normal_two).mint({value:total});
      /// check balance 
      expect(await nft.balanceOf(normal_one.address)).to.be.equal(1);
      expect(await nft.balanceOf(normal_two.address)).to.be.equal(1);
    });

    it("VIP mint by normal", async () => {
      const { nft, deployer, vip_one, vip_two, normal_one, normal_two } = await deploy();
      /// calculate amount to pay
      const price = await nft.mintPrice();
      const vipFee = await nft.vipFee();
      const total = price.add(vipFee); 
      /// vip mint by normal;
      await expect(nft.connect(normal_one).mintVIP({value:total})).to.be.reverted;
      await expect(nft.connect(normal_two).mintVIP({value:total})).to.be.reverted;
    });

    it("Mint more than limit supply", async () => {
      const { nft, deployer, vip_one, vip_two, normal_one, normal_two } = await deploy();
      /// calculate amount to pay
      const price = await nft.mintPrice();
      const vipFee = await nft.vipFee();
      const normalFee = await nft.normalFee();
      const vipTotal = price.add(vipFee);
      const normalTotal = price.add(normalFee);
      /// mint 
      await nft.connect(vip_one).mintVIP({value:vipTotal});
      await nft.connect(vip_two).mintVIP({value:vipTotal});
      await nft.connect(normal_one).mint({value:normalTotal});
      await expect(nft.connect(normal_two).mint({value:normalTotal})).to.be.reverted;
      expect(await nft.balanceOf(vip_one.address)).to.be.equal(1);
      expect(await nft.balanceOf(vip_two.address)).to.be.equal(1);
      expect(await nft.balanceOf(normal_one.address)).to.be.equal(1);
    });

    it("Mint more than limit per user", async () => {
      const { nft, deployer, vip_one} = await deploy();
      /// calculate amount to pay
      const price = await nft.mintPrice();
      const vipFee = await nft.vipFee();
      const vipTotal = price.add(vipFee);
      /// mint 
      await nft.connect(vip_one).mintVIP({value:vipTotal});
      await expect(nft.connect(vip_one).mintVIP({value:vipTotal})).to.be.reverted;
      expect(await nft.balanceOf(vip_one.address)).to.be.equal(1);
    });
  });

});