const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AccessControlOwnable", function () {
  
  async function deploy() {
    /// Get accounts
    let [deployer, donator, theft] = await ethers.getSigners();

    /// Deploy testing contracts
    const DonationWithCustomAccesssControl = await ethers.getContractFactory("AccessControlCustom");
    const donation = await DonationWithCustomAccesssControl.connect(deployer).deploy({gasLimit: 5000000});

    return { donation, deployer, donator, theft };
  }

  describe("Deployment", () => {
    it("Deploy AccessControlExample contract", async () => {
      const { donation, deployer } = await deploy();
      console.log(`deployer address  : ${await deployer.getAddress()}`);
      console.log(`contract owner: ${await donation.owner()}`);
      expect(await donation.owner() == deployer);
    });
  });

  describe("Donation", () => {
    it("Owner withdraws the donation", async () => {
      const { donation, deployer, donator } = await deploy();
      /// Donator donate to ETH to the contract
      const donate_amount = ethers.utils.parseEther("10");
      await donation.connect(donator).donate({value: donate_amount});
      /// Check balance of deployer before withdraw
      let balance_before = await ethers.provider.getBalance(deployer.getAddress());
      console.log(`balance before: ${ethers.utils.formatEther(balance_before)} ethers`)
      /// Deployer withdraw ETH from the contract
      await donation.connect(deployer).withdraw();
      /// Check balance of deployer after withdraw
      let balance_after = await ethers.provider.getBalance(deployer.getAddress());
      console.log(`balance after : ${ethers.utils.formatEther(balance_after)} ethers`)
    });

    it("Theft is trying to steal the donation", async () => {
      const { donation, deployer, donator, theft } = await deploy();
      /// Donator donate to ETH to the contract
      const donate_amount = ethers.utils.parseEther("10");
      await donation.connect(donator).donate({value: donate_amount});
      /// Try to steal the donation, which will be reverted.
      await expect(donation.connect(theft).withdraw()).to.be.reverted;
    });
  });

});