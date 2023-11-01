const { expect } = require("chai");
const { arrayify } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

describe("StorageOrderingInNewImplementation", function () {
  
  async function deploy() {
    /// Get accounts
    let [deployer, admin, newAdmin] = await ethers.getSigners();

    /// Deploy testing contracts
    const ImplementationBeforeUpgrade = await ethers.getContractFactory("ImplementationBeforeUpgrade");
    const ImplementationAfterUpgradeProblem = await ethers.getContractFactory("ImplementationAfterUpgradeProblem");
    const ImplementationAfterUpgradeSolution = await ethers.getContractFactory("ImplementationAfterUpgradeSolution");
    const SimpleUpgradableProxy = await ethers.getContractFactory("SimpleUpgradableProxy");
    
    const implementation = await ImplementationBeforeUpgrade.connect(deployer).deploy(10);
    const newImplementationProblem = await ImplementationAfterUpgradeProblem.connect(deployer).deploy(10);
    const newImplementationSolution = await ImplementationAfterUpgradeSolution.connect(deployer).deploy(10);

    const initVersion = 8;
    const data = implementation.interface.encodeFunctionData("initialize(uint256,address)", [initVersion, admin.address]);
    const upgradableProxy = await SimpleUpgradableProxy.connect(deployer).deploy(admin.address, implementation.address, data);

    return { newImplementationProblem, newImplementationSolution, upgradableProxy, deployer, admin, newAdmin };
  }

  describe("Test storage ordering in new implementation", () => {
    it("Problem: The new implementation has defined a new state variable in slot 0, which stores the value of '_version' state variable.", async () => {
      const {  newImplementationProblem, newImplementationSolution, upgradableProxy, deployer, admin, newAdmin } = await deploy();
      let _counter, _newVarA, _newVarB, _version, _admin;
      console.log(`addmin.address: ${admin.address}`);
      console.log(`-- Before the upgrade --`);
      _version = await ethers.provider.getStorageAt(upgradableProxy.address, 0);
      _admin = await ethers.provider.getStorageAt(upgradableProxy.address, 1);
      console.log(`slot[0] (_version): ${_version}`);
      console.log(`slot[1] (_admin)  : ${_admin}`);
      console.log(`-- The upgrade --`);
      const initVersion = 9;
      const initCounter = 1;
      console.log(`initVersion: ${initVersion}`);
      console.log(`initCounter: ${initCounter}`);
      const data = newImplementationProblem.interface.encodeFunctionData("initialize(uint256,uint256)", [initVersion,initCounter]);
      await upgradableProxy.connect(admin).upgradeToAndCall(newImplementationProblem.address, data);
      console.log(`-- After the upgrade --`);
      _counter = await ethers.provider.getStorageAt(upgradableProxy.address, 0);
      _newVarA = await ethers.provider.getStorageAt(upgradableProxy.address, 1);
      _newVarB = await ethers.provider.getStorageAt(upgradableProxy.address, 2);
      _version = await ethers.provider.getStorageAt(upgradableProxy.address, 3);
      _admin = await ethers.provider.getStorageAt(upgradableProxy.address, 4);
      console.log(`slot[0] (_counter): ${_counter}`);
      console.log(`slot[1] (_newVarA): ${_newVarA}`);
      console.log(`slot[2] (_newVarB): ${_newVarB}`);
      console.log(`slot[3] (_version): ${_version}`);
      console.log(`slot[4] (_admin)  : ${_admin}`);
    });

    it("Solution: Always add new state variables at the bottom slot", async () => {
      const { newImplementationProblem, newImplementationSolution, upgradableProxy, deployer, admin, newAdmin } = await deploy();
      let _counter, _newVarA, _newVarB, _version, _admin;
      console.log(`addmin.address: ${admin.address}`);
      console.log(`-- Before the upgrade --`);
      _version = await ethers.provider.getStorageAt(upgradableProxy.address, 0);
      _admin = await ethers.provider.getStorageAt(upgradableProxy.address, 1);
      console.log(`slot[0] (_version): ${_version}`);
      console.log(`slot[1] (_admin)  : ${_admin}`);
      console.log(`-- The upgrade --`);
      const initVersion = 9;
      const initCounter = 1;
      console.log(`initVersion: ${initVersion}`);
      console.log(`initCounter: ${initCounter}`);
      const data = newImplementationSolution.interface.encodeFunctionData("initialize(uint256,uint256)", [initVersion,initCounter]);
      await upgradableProxy.connect(admin).upgradeToAndCall(newImplementationSolution.address, data);
      console.log(`-- After the upgrade --`);
      _version = await ethers.provider.getStorageAt(upgradableProxy.address, 0);
      _admin = await ethers.provider.getStorageAt(upgradableProxy.address, 1);
      _counter = await ethers.provider.getStorageAt(upgradableProxy.address, 2);
      _newVarA = await ethers.provider.getStorageAt(upgradableProxy.address, 3);
      _newVarB = await ethers.provider.getStorageAt(upgradableProxy.address, 4);
      console.log(`slot[0] (_version): ${_version}`);
      console.log(`slot[1] (_admin)  : ${_admin}`);
      console.log(`slot[2] (_counter): ${_counter}`);
      console.log(`slot[3] (_newVarA): ${_newVarA}`);
      console.log(`slot[4] (_newVarB): ${_newVarB}`);
      /// Admin try to call admin's function
      const ImplementationAfterUpgradeSolution = await ethers.getContractFactory("ImplementationAfterUpgradeSolution");
      const upgradableProxy_as_newImplementationSolution = ImplementationAfterUpgradeSolution.attach(upgradableProxy.address);
      await upgradableProxy_as_newImplementationSolution.connect(admin).setAdmin(newAdmin.address);
      /// Verify the current admin 
      const currentAdmin = await upgradableProxy_as_newImplementationSolution.getAdmin();
      console.log(`newAdmin.address: ${newAdmin.address}`);
      console.log(`current admin   : ${currentAdmin}`);
    });
  });

});