const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("UnderflowOverflowBeforeV8", function () {
  
  async function deploy() {
    /// Get accounts
    let [deployer] = await ethers.getSigners();

    /// Deploy testing contracts
    const CounterV7 = await ethers.getContractFactory("CounterV7Contract");
    const CounterV7Safe = await ethers.getContractFactory("CounterV7SafeContract");
    const conterv7 = await CounterV7.connect(deployer).deploy();
    const conterv7Safe = await CounterV7Safe.connect(deployer).deploy();

    return { conterv7, conterv7Safe, deployer };
  }

  describe("Deployment", () => {
    it("Deploy Counter contract", async () => {
      const { conterv7, conterv7Safe, deployer } = await deploy();
      expect(await conterv7.get()).to.equal(0);
      expect(await conterv7Safe.get()).to.equal(0);
      await conterv7Safe.increase();
      expect(await conterv7Safe.get()).to.equal(1);
      await conterv7Safe.decrease();
      expect(await conterv7Safe.get()).to.equal(0);
    });
  });

  describe("Underflow and overflow in version < 0.8.0", () => {
    it("Underflow", async () => {
      const { conterv7, conterv7Safe, deployer } = await deploy();
      let value = await conterv7.get();
      console.log(`value before decrease: ${value}`);
      /// underflow: 0-1 = max
      await conterv7.connect(deployer).decrease();
      value = await conterv7.get();
      console.log(`value after decrease : ${value}`);
    });

    it("Overflow", async () => {
      const { conterv7, conterv7Safe, deployer } = await deploy();
      /// set counter to max of uint8
      await conterv7.connect(deployer).setMax();
      let value = await conterv7.get();
      console.log(`value before increase: ${value}`);
      /// overflow: max+1 = 0
      await conterv7.connect(deployer).increase();
      value = await conterv7.get();
      console.log(`value after increase : ${value}`);
    });
  });

  describe("SafeMath for version < 0.8.0", () => {
    it("Safe from underflow", async () => {
      const { conterv7, conterv7Safe, deployer } = await deploy();
      let value = await conterv7Safe.get();
      console.log(`value before decrease: ${value}`);
      /// tx will be reverted due to the underflow
      await expect(conterv7Safe.connect(deployer).decrease()).to.be.revertedWith("SafeMath: subtraction overflow");
    });

    it("Safe from overflow", async () => {
      const { conterv7, conterv7Safe, deployer } = await deploy();
      /// set counter to max of uint8
      await conterv7Safe.connect(deployer).setMax();
      let value = await conterv7Safe.get();
      console.log(`value before increase: ${value}`);
      /// tx will be reverted due to the overflow
      await expect(conterv7Safe.connect(deployer).increase()).to.be.revertedWith("SafeMath: addition overflow");
    });
  });

});