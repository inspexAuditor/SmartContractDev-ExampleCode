const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("IncorrectOperationOrdering", function () {
  
  async function deploy() {
    /// Get accounts
    let [deployer, donator] = await ethers.getSigners();

    /// Deploy testing contracts
    const Donate = await ethers.getContractFactory("IncorrectOperationOrdering");
    const donate = await Donate.connect(deployer).deploy();

    return { donate, deployer, donator };
  }

  describe("Deployment", () => {
    it("Deploy Counter contract", async () => {
      const { donate, deployer } = await deploy();
      expect(await donate.owner()).to.be.equal(deployer.address);
    });
  });

  describe("Donate Test", () => {
    it("Incorrect fee calculating - donate()", async () => {
      const { donate, deployer, donator} = await deploy();
      const feePercent = await donate.feePercent();
      const donateAmount = ethers.utils.parseEther("1"); // 1 ether or 1e18 or 10^18
      const expectedFee = donateAmount.mul(feePercent).div(100);
      console.log(`feePercent   : ${feePercent}%`);
      console.log(`donateAmount : ${ethers.utils.formatEther(donateAmount)} ether`);
      console.log(`expectedFee  : ${ethers.utils.formatEther(expectedFee)} ether`);
      await donate.connect(donator).donate({value: donateAmount});
      const collectedFee = await donate.collectedFee();
      console.log(`collectedFee : ${ethers.utils.formatEther(collectedFee)} ether`);
      expect(expectedFee).to.not.equal(collectedFee);
    });

    it("Correct way - donateV2()", async () => {
      const { donate, deployer, donator} = await deploy();
      const feePercent = await donate.feePercent();
      const donateAmount = ethers.utils.parseEther("1"); // 1 ether or 1e18 or 10^18
      const expectedFee = donateAmount.mul(feePercent).div(100);
      console.log(`feePercent   : ${feePercent}%`);
      console.log(`donateAmount : ${ethers.utils.formatEther(donateAmount)} ether`);
      console.log(`expectedFee  : ${ethers.utils.formatEther(expectedFee)} ether`);
      await donate.connect(donator).donateV2({value: donateAmount});
      const collectedFee = await donate.collectedFee();
      console.log(`collectedFee : ${ethers.utils.formatEther(collectedFee)} ether`);
      expect(expectedFee).to.be.equal(collectedFee);
    });
  });

});