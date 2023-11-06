const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Hashing and encoding", function () {
  
  async function deploy() {
    /// Get accounts
    let [deployer] = await ethers.getSigners();

    /// Deploy testing contracts
    const HashContract = await ethers.getContractFactory("HashContract");
    const hashContract = await HashContract.connect(deployer).deploy();
    const part1 = "hash";
    const part2 = "me";
    const salt = 1337;
    const randomBytes = ethers.utils.arrayify("0x12dc3f4a");              //convert string to bytes
    const randomBytes32 = ethers.utils.formatBytes32String("r4nd0m3yte"); //convert string to bytes32
    return { hashContract, part1, part2, salt, randomBytes, randomBytes32 };
  }

  function prettyPrintBytes(data) {
    const rows = (data.length-2)/2/32;
    for(let i=0;i<rows;i++){
      let row_data = ethers.utils.hexDataSlice(data, 32*i, 32*(i)+32);
      console.log(`    ${i<10?"0"+i:i}: ${row_data}`);
    }
  } 

  describe("Differences result between encode() and encodePacked()", () => {
    it("Encode vs EncodePacked", async () => {
      const { hashContract, part1, part2, salt, randomBytes, randomBytes32 } = await deploy();
      ///Compare hash result
      const hashEncode = await hashContract.getHashEncode(part1, part2, salt, randomBytes, randomBytes32);
      const hashEncodePacked = await hashContract.getHashEncodePacked(part1, part2, salt, randomBytes, randomBytes32);
      const newPart1 = "has";
      const newPart2 = "hme";
      const newHashEncode = await hashContract.getHashEncode(newPart1, newPart2, salt, randomBytes, randomBytes32);
      const newHashEncodePacked = await hashContract.getHashEncodePacked(newPart1, newPart2, salt, randomBytes, randomBytes32);
      console.log(`--- "hash"+"me"+salt+randomBytes+randomBytes32 ---`);
      console.log(`hashEncode         : ${hashEncode}`);
      console.log(`hashEncodePacked   : ${hashEncodePacked}`);
      console.log(`--- "has"+"hme"+salt+randomBytes+randomBytes32 ---`);
      console.log(`newHashEncode      : ${newHashEncode}`);
      console.log(`newHashEncodePacked: ${newHashEncodePacked}`);
      ///Compare bytes data
      const encodeBytesData = await hashContract.getEncode(part1, part2, salt, randomBytes, randomBytes32);
      const encodePackedBytesData = await hashContract.getEncodePacked(part1, part2, salt, randomBytes, randomBytes32);
      const newEncodeBytesData = await hashContract.getEncode(newPart1, newPart2, salt, randomBytes, randomBytes32);
      const newEncodePackedBytesData = await hashContract.getEncodePacked(newPart1, newPart2, salt, randomBytes, randomBytes32);
      console.log(`--- Bytes data after encode vs encode Packed ---`);
      console.log(`data1: "hash"+"me"+salt+randomBytes+randomBytes32`);
      console.log(`data2: "has"+"hme"+salt+randomBytes+randomBytes32`);
      console.log(`encode(data1) :`);
      prettyPrintBytes(encodeBytesData);
      console.log(`encode(data2) :`);
      prettyPrintBytes(newEncodeBytesData);
      console.log(`encodePacked(data1) :`);
      prettyPrintBytes(encodePackedBytesData);
      console.log(`encodePacked(data2) :`);
      prettyPrintBytes(newEncodePackedBytesData);
      expect(encodeBytesData).to.not.equal(newEncodeBytesData);
      expect(encodePackedBytesData).to.equal(newEncodePackedBytesData);
    });
  });

  describe("Extra: Calculating hash by using Ethers", () => {
    it("Encode", async () => {
      const { hashContract, part1, part2, salt, randomBytes, randomBytes32 } = await deploy();
      /// Calculate hash by using ethers.js
      const encodedDataFromJS = ethers.utils.defaultAbiCoder.encode(
        ['string', 'string', 'uint256', 'bytes', 'bytes32'], //types
        [part1, part2, salt, randomBytes, randomBytes32]     //values
      );
      const hashFromJS = ethers.utils.keccak256(encodedDataFromJS);
      /// Retrive hash from contract
      const encodedDataFromContract = await hashContract.getEncode(part1, part2, salt, randomBytes, randomBytes32);
      const hashFromContract = await hashContract.getHashEncode(part1, part2, salt, randomBytes, randomBytes32);
      console.log(`data from JS      :`);
      prettyPrintBytes(encodedDataFromJS);
      console.log(`data from contract:`);
      prettyPrintBytes(encodedDataFromContract);
      console.log(`hash from JS      : ${hashFromJS}`);
      console.log(`hash from contract: ${hashFromContract}`);
      expect(encodedDataFromJS).to.eq(encodedDataFromContract);
      expect(hashFromJS).to.eq(hashFromContract);
    });

    it("EncodePacked", async () => {
      const { hashContract, part1, part2, salt, randomBytes, randomBytes32 } = await deploy();
      /// Calculate hash by using ethers.js
      const encodedDataFromJS = ethers.utils.solidityPack( //encodePacked(params)
        ['string', 'string', 'uint256', 'bytes', 'bytes32'], //types
        [part1, part2, salt, randomBytes, randomBytes32]     //values
      );
      const hashFromJS = ethers.utils.solidityKeccak256( //keccak256(encodePacked(params))
        ['string', 'string', 'uint256', 'bytes', 'bytes32'], //types
        [part1, part2, salt, randomBytes, randomBytes32]     //values
      );
      /// Retrive hash from contract
      const encodedDataFromContract = await hashContract.getEncodePacked(part1, part2, salt, randomBytes, randomBytes32);
      const hashFromContract = await hashContract.getHashEncodePacked(part1, part2, salt, randomBytes, randomBytes32);
      console.log(`data from JS      :`);
      prettyPrintBytes(encodedDataFromJS);
      console.log(`data from contract:`);
      prettyPrintBytes(encodedDataFromContract);
      console.log(`hash from JS      : ${hashFromJS}`);
      console.log(`hash from contract: ${hashFromContract}`);
      expect(encodedDataFromJS).to.eq(encodedDataFromContract);
      expect(hashFromJS).to.eq(hashFromContract);
    });

    it("EncodePacked and Encode '1' '23' ", async () => {
      const { hashContract, part1, part2, salt, randomBytes, randomBytes32 } = await deploy();

      const getEncodeV1 = await hashContract.getEncodeV1(1, 23);
      const getEncodePackedV1 = await hashContract.getEncodePackedV1(1, 23);
      const getHashEncode = await hashContract.getHashEncodeV1(1, 23);
      const getHashEncodePacked = await hashContract.getHashEncodePackedV1(1, 23);

      console.log("\ngetEncodeV1",getEncodeV1)
      console.log("\ngetEncodePackedV1",getEncodePackedV1)
      console.log("\ngetHashEncode",getHashEncode)
      console.log("\ngetHashEncodePacked",getHashEncodePacked)


    });
  });

});