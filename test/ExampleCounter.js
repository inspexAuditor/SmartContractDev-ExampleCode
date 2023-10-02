const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ExampleCounter", function () {
  
  async function deploy() {
    /// Get accounts
    let [deployer, otherAccount] = await ethers.getSigners();

    /// Deploy testing contracts
    const Counter = await ethers.getContractFactory("ExampleCounter");
    const requiredAmount = ethers.utils.parseEther("0.1");
    const answer = 7;
    const counter = await Counter.connect(deployer).deploy(answer, {value: requiredAmount, gasLimit: 5000000});

    return { counter, deployer, otherAccount };
  }

  describe("Deployment", () => {
    it("Deploy Counter contract", async () => {
      const { counter, deployer } = await deploy();
      console.log(`deployer addres  : ${await deployer.getAddress()}`);
      console.log(`contract owner: ${await counter.owner()}`);
      expect(await counter.owner()).to.be.equal(deployer.address);
    });
  });

  describe("Test Counter", () => {
    it("Increment", async () => {
      const { counter, deployer } = await deploy();
      const old_count = parseInt(await counter.get());
      await counter.connect(deployer).inc();
      const new_count = parseInt(await counter.get());
      console.log(`old_count: ${old_count}`);
      console.log(`new_count: ${new_count}`);
      expect(new_count).to.equal(old_count+1);
    });

    it("Decrement", async () => {
      const { counter, deployer } = await deploy();
      await counter.connect(deployer).inc();
      const old_count = parseInt(await counter.get());
      await counter.connect(deployer).dec();
      const new_count = parseInt(await counter.get());
      console.log(`old_count: ${old_count}`);
      console.log(`new_count: ${new_count}`);
      expect(new_count).to.equal(old_count-1);
    });
  });

});