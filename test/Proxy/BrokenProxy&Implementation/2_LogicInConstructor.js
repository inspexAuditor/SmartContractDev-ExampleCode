const { expect } = require("chai");
const { arrayify } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

describe("LogicInConstructor", function () {
  
  async function deploy() {
    /// Get accounts
    let [deployer, admin] = await ethers.getSigners();

    /// Deploy testing contracts
    const LogicInConstructorProblem = await ethers.getContractFactory("LogicInConstructorProblem");
    const LogicInConstructorSolution = await ethers.getContractFactory("LogicInConstructorSolution");
    const Proxy = await ethers.getContractFactory("StorageCollisionProxySolution");

    const version = 1;
    const logicInConstructorProblem = await LogicInConstructorProblem.connect(deployer).deploy(version);
    const logicInConstructorSolution = await LogicInConstructorSolution.connect(deployer).deploy();
    const proxyToProblem = await Proxy.connect(deployer).deploy(logicInConstructorProblem.address);
    const proxyToSolution = await Proxy.connect(deployer).deploy(logicInConstructorSolution.address);

    return { proxyToProblem, proxyToSolution, deployer, admin };
  }

  describe("Test logic in constructor", () => {
    it("Problem: The proxy contract does not store the version in the contract's storage.", async () => {
      const { proxyToProblem, proxyToSolution, deployer, admin } = await deploy();
      const LogicInConstructorProblem = await ethers.getContractFactory("LogicInConstructorProblem");
      const proxyToProblem_as_ProblemImple = LogicInConstructorProblem.attach(proxyToProblem.address);
      // Get version's value from proxy's storage
      const version = await proxyToProblem_as_ProblemImple.getVersion();
      const currentAdmin = await proxyToProblem_as_ProblemImple.getAdmin();
      console.log(`-- Current value in proxy's storage --`);
      console.log(`version: ${version}`);
      console.log(`admin  : ${currentAdmin}`);
      // Expected to be 0 (or equal to not set), because the version state variable was set in the constructor.
      expect(version).to.not.equal(1);
    });

    it("Solution: Define the initial value of the state variables in the intialize() function.", async () => {
      const { proxyToProblem, proxyToSolution, deployer, admin } = await deploy();
      const LogicInConstructorSolution = await ethers.getContractFactory("LogicInConstructorSolution");
      const proxyToSolution_as_SolutionImple = LogicInConstructorSolution.attach(proxyToSolution.address);
      //  Admin execute the initialize() function after upgrade to a implementation contract
      const version = 1;
      await proxyToSolution_as_SolutionImple.connect(admin).initialize(version);
      // Get version's value from proxy
      const versionInStorage = await proxyToSolution_as_SolutionImple.getVersion();
      const currentAdmin = await proxyToSolution_as_SolutionImple.getAdmin();
      console.log(`-- Current value in proxy's storage --`);
      console.log(`version: ${versionInStorage}`);
      console.log(`admin  : ${currentAdmin}`);
      console.log(`admin.address : ${admin.address}`);
      expect(currentAdmin).to.equal(admin.address);
    });
  });

});