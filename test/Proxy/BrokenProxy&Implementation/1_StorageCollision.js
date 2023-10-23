const { expect } = require("chai");
const { arrayify } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

describe("StorageCollision", function () {
  
  async function deploy() {
    /// Get accounts
    let [deployer, admin] = await ethers.getSigners();

    /// Deploy testing contracts
    const VerySimpleImplementation = await ethers.getContractFactory("VerySimpleImplementation");
    const StorageCollisionProxyProblem = await ethers.getContractFactory("StorageCollisionProxyProblem");
    const StorageCollisionProxySolution = await ethers.getContractFactory("StorageCollisionProxySolution");

    const version = 1;
    const verySimpleImp = await VerySimpleImplementation.connect(deployer).deploy(version);
    const scProxyProblem = await StorageCollisionProxyProblem.connect(deployer).deploy(verySimpleImp.address);
    const scProxySolution = await StorageCollisionProxySolution.connect(deployer).deploy(verySimpleImp.address);

    return { verySimpleImp, scProxyProblem, scProxySolution, deployer, admin };
  }

  describe("Test Storage Collision", () => {
    it("Problem: The storage is colliding due to the proxy store data in the first slot.", async () => {
      const { verySimpleImp, scProxyProblem, scProxySolution, deployer, admin } = await deploy();
      const verySimpleImpContract = await ethers.getContractFactory("VerySimpleImplementation");
      const scProxyProblem_as_impl = verySimpleImpContract.attach(scProxyProblem.address);
      /// set new admin address
      await scProxyProblem_as_impl.connect(deployer).setAdmin(admin.address);
      /// Read storage of the scProxyProblem contract
      console.log(`--- Storage of the proxy contract ---`);
      let _version = await ethers.provider.getStorageAt(scProxyProblem.address, 0);
      let _admin = await ethers.provider.getStorageAt(scProxyProblem.address, 1);
      console.log(`slot[0] (_version): ${_version}`);
      console.log(`slot[1] (_admin)  : ${_admin}`);
      /// Read storage of the verySimpleImp contract
      console.log(`--- Storage of the implementation contract ---`);
      _version = await ethers.provider.getStorageAt(verySimpleImp.address, 0);
      _admin = await ethers.provider.getStorageAt(verySimpleImp.address, 1);
      console.log(`slot[0] (_version): ${_version}`);
      console.log(`slot[1] (_admin)  : ${_admin}`);
      /// Other Info
      console.log(`--- Other Information ---`);
      console.log(`implementation    : ${verySimpleImp.address}`);
      console.log(`admin             : ${admin.address}`);
    });

    it("Solution: Data made by the proxy contract should be saved in a specific storage slot.", async () => {
      const { verySimpleImp, scProxyProblem, scProxySolution, deployer, admin } = await deploy();
      const verySimpleImpContract = await ethers.getContractFactory("VerySimpleImplementation");
      const scProxySolution_as_impl = verySimpleImpContract.attach(scProxySolution.address);
      /// set new admin address
      await scProxySolution_as_impl.connect(deployer).setAdmin(admin.address);
      /// Read storage of the scProxyProblem contract
      console.log(`--- Storage of the proxy contract ---`);
      let _version = await ethers.provider.getStorageAt(scProxySolution.address, 0);
      let _admin = await ethers.provider.getStorageAt(scProxySolution.address, 1);
      console.log(`slot[0] (_version): ${_version}`);
      console.log(`slot[1] (_admin)  : ${_admin}`);
      /// Read storage of the verySimpleImp contract
      console.log(`--- Storage of the implementation contract ---`);
      _version = await ethers.provider.getStorageAt(verySimpleImp.address, 0);
      _admin = await ethers.provider.getStorageAt(verySimpleImp.address, 1);
      console.log(`slot[0] (_version): ${_version}`);
      console.log(`slot[1] (_admin)  : ${_admin}`);
      /// Other Info
      console.log(`--- Other Information ---`);
      console.log(`implementation    : ${verySimpleImp.address}`);
      console.log(`admin             : ${admin.address}`);
    });
  });

});