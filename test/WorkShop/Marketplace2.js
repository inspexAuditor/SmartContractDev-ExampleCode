const { expect } = require("chai");
const { ethers } = require("hardhat");
const { MerkleTree } = require('merkletreejs');
const { StandardMerkleTree } = require('@openzeppelin/merkle-tree');
const fs = require('fs');
// import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
// import fs from "fs";

const { parseEther } = require("ethers/lib/utils");

async function deploy() {
    /// Get accounts
    let [deployer, seller, buyer, otherAccount] = await ethers.getSigners();

    // Get the chain ID from the Ethereum network provider
    const network = await ethers.provider.getNetwork();
    const chainId = network.chainId;

    const merkleRoot = "0x3ef66d9922138427d5f0c22c88ff88e64263aa77d1fe0186c3b1a1ff7854fa9a";
    const NFTprice = ethers.utils.parseEther("2");
    const whitelistPrice = ethers.utils.parseEther("1");
    const maxSupply = 100;
    const whitelistMaxPurchase = 1;

    /// Deploy testing contracts
    const USDT = await ethers.getContractFactory("USDT");
    const uSDT = await USDT.connect(deployer).deploy();

    const INXNFT = await ethers.getContractFactory("INXNFT");
    const iNXNFT = await INXNFT.connect(deployer).deploy(
        uSDT.address,
        NFTprice,
        whitelistPrice,
        maxSupply,
        whitelistMaxPurchase,
        merkleRoot);

    const Marketplace2 = await ethers.getContractFactory("Marketplace2");
    const marketplace2 = await Marketplace2.connect(deployer).deploy();

    // Define an example Offer struct
    const offer = {
        isSell: true,
        nftAddress: iNXNFT.address,
        tokenId: 1,
        tokenAddress: uSDT.address,
        price: ethers.utils.parseEther("4"),
        expiry: 16777216,
        nonce: 42,
    };

    // Mint USDT tokens for the buyer and seller
    await uSDT.connect(deployer).mint(buyer.address, ethers.utils.parseEther("10"));
    await uSDT.connect(deployer).mint(seller.address, ethers.utils.parseEther("10"));


    return { marketplace2, iNXNFT, uSDT, offer, deployer, seller, buyer, otherAccount, chainId, NFTprice, whitelistPrice };
}

describe("Verify Signature", function () {

    it("should return the correct message hash", async function () {
        const { marketplace2, iNXNFT, uSDT, offer, deployer, chainId } = await deploy();

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
        const { marketplace2, iNXNFT, uSDT, offer, deployer, seller, buyer, chainId, NFTprice } = await deploy();
        // Mint an NFT token for the seller
        await iNXNFT.connect(deployer).mintReserve(1);
        await iNXNFT.connect(deployer).transferFrom(deployer.address, seller.address, 1);

        // Seller purchase an NFT
        await uSDT.connect(seller).approve(iNXNFT.address, NFTprice);
        await iNXNFT.connect(deployer).startPublicSale();
        await iNXNFT.connect(seller).purchaseNFT(1);
        await iNXNFT.connect(seller).approve(marketplace2.address, 2);

        // The seller approve NFT to the marketplace2
        await iNXNFT.connect(seller).approve(marketplace2.address, 1);

        // Mint USDT tokens for the buyer
        await uSDT.connect(deployer).mint(buyer.address, offer.price);
        // The buyer approve USDT token to the marketplace2
        await uSDT.connect(buyer).approve(marketplace2.address, offer.price);

        // Calculate the message hash that will be signed
        const hash = ethers.utils.solidityKeccak256(
            ["bool", "address", "uint256", "address", "uint256", "uint256", "address", "uint256"],
            [
                offer.isSell,                   // Whether it's a sell or buy offer
                offer.nftAddress,               // Address of the NFT contract
                offer.tokenId,                  // Token ID of the NFT
                offer.tokenAddress,             // Address of the token used for payment
                offer.price,                    // Price of the NFT
                offer.expiry,                   // Expiry time of the offer
                marketplace2.address,           // Address of the marketplace contract
                chainId                         // Chain ID of the blockchain
            ]
        );

        // const messageHash = await marketplace2.getMessageHash(offer);

        // Sign the message hash with the seller's private key
        const sellerSignature = await seller.signMessage(ethers.utils.arrayify(hash));

        // Call the acceptOffer function from the buyer's account
        await marketplace2.connect(buyer).acceptOffer(offer, sellerSignature);

        // Check the state changes after the transaction
        const sellerERC20Balance = await uSDT.balanceOf(seller.address);
        const buyerERC721Owner = await iNXNFT.ownerOf(offer.tokenId);

        // Assert the expected state changes
        expect(sellerERC20Balance).to.equal(ethers.utils.parseEther("12"));
        expect(buyerERC721Owner).to.equal(buyer.address);
    });

    it("should allow whitelisted user to purchase NFTs", async function () {
        const { marketplace2, iNXNFT, uSDT, offer, deployer, seller, buyer, chainId, NFTprice, whitelistPrice } = await deploy();

        const values = [
            [seller.address, 1],
            [buyer.address, 1]
        ];
        const tree = StandardMerkleTree.of(values, ["address", "uint256"]);
        console.log('Merkle Root:', tree.root);

        const newData = JSON.stringify(tree.dump());
        const filePath = 'test/WorkShop/tree.json';

        fs.writeFileSync(filePath, newData);

        const tree2 = StandardMerkleTree.load(JSON.parse(fs.readFileSync(filePath, "utf8")));
        for (const [i, v] of tree2.entries()) {
            if (v[0] === seller.address) {
                const proof = tree2.getProof(i);
                console.log('Value:', v);
                console.log('Proof:', proof);
            }
        }
        await iNXNFT.connect(deployer).addToWhitelist([seller.address, buyer.address], [1, 1]);
        await uSDT.connect(seller).approve(iNXNFT.address, whitelistPrice);
        await iNXNFT.connect(seller).purchaseNFTWhitelist(1, ["0x457aa17fe0228467c8ff03c94ef937caf43d83d6102043300dc6a2e9a13a7006"]);
        console.log("merkleRoot>>>", await iNXNFT.connect(seller).merkleRoot())
    });

});
