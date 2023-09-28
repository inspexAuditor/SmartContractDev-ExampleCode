const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NoContractAllowed", function () {
  
  async function deploy() {
    /// Get accounts
    let [deployer] = await ethers.getSigners();

    /// Deploy testing contracts
    const NoContractAllowed = await ethers.getContractFactory("NoContractAllowed");
    const noContractAllowed = await NoContractAllowed.connect(deployer).deploy();

    return { noContractAllowed, deployer };
  }

  describe("Attack scenario", () => {
    it("Bypass isContract() to get whitelisted", async () => {
      const { noContractAllowed, deployer } = await deploy();
      /// Deploy solver contract 
      const SolverContract = await ethers.getContractFactory("NoContractAllowedSolver");
      const target = noContractAllowed.address;
      const solver = await SolverContract.connect(deployer).deploy(target, {gasLimit:5000000});
      expect(await noContractAllowed.whitelist(solver.address)).to.be.true;
    });
  });

});