const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VerifySignature", function () {

  async function deploy() {
    /// Get accounts
    let [deployer, otherAccount] = await ethers.getSigners();

    /// Deploy testing contracts
    const VerifySignature = await ethers.getContractFactory("VerifySignature");
    const verifySignature = await VerifySignature.connect(deployer).deploy();

    return { verifySignature, deployer, otherAccount };
  }

  describe("Deployment", () => {
    it("Deploy VerifySignature contract", async () => {
      const { verifySignature, deployer } = await deploy();
      console.log(`deployer addres  : ${await deployer.getAddress()}`);
      expect(await verifySignature).to.not.equal(0);
    });
  });

  describe("Test getMessageHash", () => {
    it("should return the correct message hash", async () => {
      const { verifySignature, deployer, otherAccount } = await deploy();

      // Define test inputs
      const to = otherAccount.address;
      const amount = 123;
      const message = "Hello, world!";
      const nonce = 1;

      // Calculate the expected message hash
      const expectedHash = ethers.utils.solidityKeccak256(
        ["address", "uint256", "string", "uint256"],
        [to, amount, message, nonce]
      );

      // Call the getMessageHash function
      const result = await verifySignature.getMessageHash(to, amount, message, nonce);
        console.log("result",result)
      // Assert that the result matches the expected hash
      expect(result).to.equal(expectedHash, "Message hash is incorrect");
    });
  });

  describe("Test getEthSignedMessageHash", () => {
    it('should return the correct Ethereum signed message hash', async () => {
      const { verifySignature, deployer, otherAccount } = await deploy();

      // Calculate the message hash
      const messageHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test'));

      // Calculate the expected Ethereum signed message hash
      const prefix = '\x19Ethereum Signed Message:\n32';
      const expectedHash = ethers.utils.keccak256(
        ethers.utils.concat([ethers.utils.toUtf8Bytes(prefix), ethers.utils.arrayify(messageHash)])
      );

      // Call the getEthSignedMessageHash function
      const result = await verifySignature.getEthSignedMessageHash(messageHash);
      console.log("result", result)
      console.log("expectedHash", expectedHash)
      // Assert that the result matches the expected hash
      // assert.strictEqual(result, expectedHash, 'Ethereum signed message hash is incorrect');
      expect(result).to.equal(expectedHash, "Message hash is incorrect");

    });
  });

  describe("Test verify", () => {
    it('should verify a valid signature', async () => {
      const { verifySignature, deployer, otherAccount } = await deploy();
      const signer = deployer.address;
      console.log("signer",signer)
      const to = otherAccount.address;
      const amount = 123;
      const message = 'Hello, world!';
      const nonce = 1;
      const messageHash = await verifySignature.getMessageHash(to, amount, message, nonce);
      console.log("1) getMessageHash:", messageHash);
      const getEthSignedMessageHash = await verifySignature.getEthSignedMessageHash(messageHash);
      console.log("2) getEthSignedMessageHash:", getEthSignedMessageHash);
      const signature = await deployer.signMessage(ethers.utils.arrayify(messageHash));
      console.log("3) Sign message hash (signature)", signature)

      const recover = await verifySignature.recoverSigner(getEthSignedMessageHash, signature);
      console.log("recover address: ",recover)
      const result = await verifySignature.verify(signer, to, amount, message, nonce, signature);
      expect(result, 'Signature is not valid').to.be.true
    });
  });

  it("Should let signature replay happen (SignatureMalleability)", async function () {
    const { verifySignature, deployer, otherAccount } = await deploy();
    const signer = deployer.address;
    console.log("signer",signer)
    const to = otherAccount.address;
    const amount = 123;
    const message = 'Hello, world!';
    const nonce = 1;
    const messageHash = await verifySignature.getMessageHash(to, amount, message, nonce);
    console.log("1) getMessageHash:", messageHash);
    const getEthSignedMessageHash = await verifySignature.getEthSignedMessageHash(messageHash);
    console.log("2) getEthSignedMessageHash:", getEthSignedMessageHash);
    const signature = await deployer.signMessage(ethers.utils.arrayify(messageHash));
    console.log("3) Sign message hash (signature)", signature)
    const SignatureMalleability = await verifySignature.getMalleabilitySignature(signature);
    console.log("4) SignatureMalleability message hash (signature)", SignatureMalleability)


    const recover = await verifySignature.recoverSigner(getEthSignedMessageHash, SignatureMalleability);
    console.log("recover address: ",recover)
    const result = await verifySignature.verify(signer, to, amount, message, nonce, signature);
    expect(result, 'Signature is not valid').to.be.true
  });
});