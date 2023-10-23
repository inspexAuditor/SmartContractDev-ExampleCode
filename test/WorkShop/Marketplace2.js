const { expect } = require("chai");
const { ethers } = require("hardhat");
const { parseEther } = require("ethers/lib/utils");




function splitSignature(sig) {
    console.log(sig.length)
    console.log(sig.slice(130, 132))

    // if (sig.length !== 65) {
    //   throw new Error("Invalid signature length", sig.length);
    // }

    const r = '0x' + sig.slice(2, 66);
    const s = '0x' + sig.slice(66, 130);
    const v = parseInt(sig.slice(130, 132), 16);

    return { r, s, v };
}

function getMalleabilitySignature(sig) {
    let { r, s, v } = ethers.utils.splitSignature(sig);

    if (v == 27) v++;
    else if (v == 28) v--;

    const N = ethers.BigNumber.from("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");
    const sBN = ethers.BigNumber.from(s);
    const malsigS = N.sub(sBN).toHexString();

    const malsig = ethers.utils.solidityPack(['bytes32', 'bytes32', 'uint8'], [r, malsigS, v]);
    return malsig;
}


async function deploy() {
    /// Get accounts
    let [deployer, seller, buyer, otherAccount] = await ethers.getSigners();

    // Get the chain ID from the Ethereum network provider
    const network = await ethers.provider.getNetwork();
    const chainId = network.chainId;

    const merkleRoot = "0x123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0";
    const price = ethers.utils.parseEther("0.1");
    const whitelistPrice = ethers.utils.parseEther("0.05");
    const maxSupply = 100;
    const whitelistMaxPurchase = 5;

    /// Deploy testing contracts
    const USDT = await ethers.getContractFactory("USDT");
    const uSDT = await USDT.connect(deployer).deploy();

    const NFTSaleWithMerkleWhitelist = await ethers.getContractFactory("NFTSaleWithMerkleWhitelist");
    const nFTSaleWithMerkleWhitelist = await NFTSaleWithMerkleWhitelist.connect(deployer).deploy(
        uSDT.address,
        price,
        whitelistPrice,
        maxSupply,
        whitelistMaxPurchase,
        merkleRoot);

    const Marketplace2 = await ethers.getContractFactory("Marketplace2");
    const marketplace2 = await Marketplace2.connect(deployer).deploy();

    // Define an example Offer struct
    const offer = {
        isSell: true,
        nftAddress: nFTSaleWithMerkleWhitelist.address,
        tokenId: 1,
        tokenAddress: uSDT.address,
        price: 1000,
        expiry: 16777216,
        nonce: 42,
    };


    return { marketplace2, nFTSaleWithMerkleWhitelist, uSDT, offer, deployer, seller, buyer, otherAccount, chainId };
}


describe("Ownable", function () {

    it('should not allow external access to internalFunction', async () => {
        const { marketplace2, otherAccount } = await deploy();
        try {
            await marketplace2._transferOwnership(otherAccount.address);
            expect.fail("Expected to throw");
        } catch (error) {
            expect(error.message).to.include('marketplace2._transferOwnership is not a function');
        }
    });

    // Preventing Unauthorized Ownership Transfer:
    it("Unauthorized ownership transfer should revert", async () => {
        const { marketplace2, deployer, otherAccount } = await deploy();

        // Attempt to transfer ownership from otherAccount and expect it to revert
        await expect(marketplace2.connect(otherAccount).transferOwnership(deployer.address)).to.be.revertedWith('Ownable: caller is not the owner');
    });

    // Transfer Ownership:
    it("Owner should be able to transfer ownership to another account", async () => {
        const { marketplace2, deployer, otherAccount } = await deploy();

        // Transfer ownership to otherAccount
        await marketplace2.connect(deployer).transferOwnership(otherAccount.address);

        // Verify that the new owner is now otherAccount
        const newOwner = await marketplace2.owner();
        expect(newOwner).to.equal(otherAccount.address);
    });

    // Renouncing Ownership
    it("Owner should be able to renounce ownership", async () => {
        const { marketplace2, deployer } = await deploy();

        // Renounce ownership
        await marketplace2.connect(deployer).renounceOwnership();

        // Verify that the owner is now the zero address
        const newOwner = await marketplace2.owner();
        expect(newOwner).to.equal("0x0000000000000000000000000000000000000000");
    });

    // Preventing Zero-Address Ownership Transfer:
    it("Ownership transfer to zero address should revert", async () => {
        const { marketplace2, deployer } = await deploy();

        // Attempt to transfer ownership to the zero address and expect it to revert
        await expect(marketplace2.connect(deployer).transferOwnership("0x0000000000000000000000000000000000000000")).to.be.revertedWith('Ownable: new owner is the zero address');
    });

    // Verify Owner Modifier:
    it("Function with onlyOwner modifier should only be callable by the owner", async () => {
        const { marketplace2, deployer, otherAccount } = await deploy();

        // Attempt to call a function with onlyOwner modifier from otherAccount and expect it to revert
        await expect(marketplace2.connect(otherAccount).transferOwnership(otherAccount.address)).to.be.revertedWith('Ownable: caller is not the owner');
    });
});

describe("Verify Signature", function () {

    it("should return the correct message hash", async function () {
        const { marketplace2, nFTSaleWithMerkleWhitelist, uSDT, offer, deployer } = await deploy();
        // Get the chain ID from the Ethereum network provider
        const network = await ethers.provider.getNetwork();
        const chainId = network.chainId;

        const expectedHash = ethers.utils.solidityKeccak256(
            ["bool", "address", "uint256", "address", "uint256", "uint256", "address", "uint256"],
            [
                offer.isSell,
                offer.nftAddress,
                offer.tokenId,
                offer.tokenAddress,
                offer.price,
                offer.expiry,
                marketplace2.address, // Use the contract's address
                chainId, // Get the chain ID
            ]
        );

        // Call the getMessageHash function
        const messageHash = await marketplace2.getMessageHash(offer);

        // Ensure that the expected and actual message hash values match
        expect(ethers.utils.hexlify(messageHash)).to.equal(ethers.utils.hexlify(expectedHash));
    });

});


describe("acceptOffer", function () {

    it("should allow a buyer to accept an offer", async function () {
        const { marketplace2, nFTSaleWithMerkleWhitelist, uSDT, offer, deployer, seller, buyer } = await deploy();
        // Get the chain ID from the Ethereum network provider
        const network = await ethers.provider.getNetwork();
        const chainId = network.chainId;

        const expectedHash = ethers.utils.solidityKeccak256(
            ["bool", "address", "uint256", "address", "uint256", "uint256", "address", "uint256"],
            [
                offer.isSell,
                offer.nftAddress,
                offer.tokenId,
                offer.tokenAddress,
                offer.price,
                offer.expiry,
                marketplace2.address, // Use the contract's address
                chainId, // Get the chain ID
            ]
        );

        // mint NFT token for seller
        await nFTSaleWithMerkleWhitelist.connect(deployer).mintReserve(2);
        await nFTSaleWithMerkleWhitelist.connect(deployer).transferFrom(deployer.address, seller.address, 1);
        await nFTSaleWithMerkleWhitelist.connect(seller).approve(marketplace2.address, 1);

        // mint USDT for buyer
        await uSDT.connect(deployer).mint(buyer.address, 1000000000000);
        await uSDT.connect(buyer).approve(marketplace2.address, offer.price);

        // Calculate the message hash
        const messageHash = await marketplace2.getMessageHash(offer);

        // Sign the message hash with the seller's private key
        const messageHashBinary2 = ethers.utils.arrayify(expectedHash)

        const sellerSignature = await seller.signMessage(messageHashBinary2);
        // Call the acceptOffer function from the buyer's account
        await marketplace2.connect(buyer).acceptOffer(offer, sellerSignature);

        // // Check the state changes (balances, ownership, etc.)
        // const buyerERC20Balance = await erc20.balanceOf(buyer.address);
        const sellerERC20Balance = await uSDT.balanceOf(seller.address);
        // const buyerERC721Owner = await erc721.ownerOf(offer.tokenId);

        // // Assert the expected state changes
        // expect(buyerERC20Balance).to.equal(offer.price);
        expect(sellerERC20Balance).to.equal(offer.price);
        // expect(buyerERC721Owner).to.equal(buyer.address);
    });

    it("should verify a signature", async function () {
        const { marketplace2, nFTSaleWithMerkleWhitelist, uSDT, deployer, seller, offer } = await deploy();
        const network = await ethers.provider.getNetwork();
        const chainId = network.chainId;

        const messageHash = ethers.utils.solidityKeccak256(["address", "address"], [seller.address, seller.address])
        const messageHashBinary = ethers.utils.arrayify(messageHash)
        const signature = await seller.signMessage(messageHashBinary);


        const messageHash2 = ethers.utils.solidityKeccak256(
            ["bool", "address", "uint256", "address", "uint256", "uint256", "address", "uint256"],
            [
                offer.isSell,
                offer.nftAddress,
                offer.tokenId,
                offer.tokenAddress,
                offer.price,
                offer.expiry,
                marketplace2.address, // Use the contract's address
                chainId, // Get the chain ID
            ]
        );
        const messageHashBinary2 = ethers.utils.arrayify(messageHash2)
        const signature2 = await seller.signMessage(messageHashBinary2);
    });

});
