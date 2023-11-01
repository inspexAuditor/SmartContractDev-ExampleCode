const { expect } = require("chai");
const { ethers } = require("hardhat");
const { MerkleTree } = require('merkletreejs');
const { StandardMerkleTree } = require('@openzeppelin/merkle-tree');
const fs = require('fs');
// import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
// import fs from "fs";

const { parseEther } = require("ethers/lib/utils");

function getMalleabilitySignature(sig) {
    let { r, s, v } = ethers.utils.splitSignature(sig);
    if (v == 27) v++;
    else if (v == 28) v--;

    const N = ethers.BigNumber.from("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");
    const sBN = ethers.BigNumber.from(s);

    const malsigS = N.sub(sBN).toHexString();

    const malsig = ethers.utils.solidityPack(['bytes32', 'bytes32', 'uint8'], [r, malsigS, v]);

    console.log("getMalleabilitySignature")
    console.log("sig : ", sig)
    console.log("r : ", r)
    console.log("s : ", s)
    console.log("v : ", v)
    console.log("N : ", N)
    console.log("sBN : ", sBN)
    console.log("N - sBN : ", N.sub(sBN))
    console.log("malsigS : ", malsigS)
    console.log("malsig : ", malsig)

    return malsig;
}


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
        expiry: (await ethers.provider.getBlock("latest")).timestamp + 86400,
        nonce: 42,
    };

    // Mint USDT tokens for the buyer and seller
    await uSDT.connect(deployer).mint(buyer.address, ethers.utils.parseEther("10"));
    await uSDT.connect(deployer).mint(seller.address, ethers.utils.parseEther("10"));


    return { marketplace2, iNXNFT, uSDT, offer, deployer, seller, buyer, otherAccount, chainId, NFTprice, whitelistPrice };
}

describe("Verify Signature", function () {

    it("should return the correct message hash with getMessageHashEncodePacked() function", async function () {
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
        const messageHash = await marketplace2.getMessageHashEncodePacked(offer);
        // console.log(expectedHash)

        // Ensure that the expected and actual message hash values match
        expect(ethers.utils.hexlify(messageHash)).to.equal(ethers.utils.hexlify(expectedHash));
    });

    it("should return the correct message hash with getMessageHashEncode() function", async function () {
        const { marketplace2, iNXNFT, uSDT, offer, deployer, chainId } = await deploy();

        const abiEncoded = ethers.utils.defaultAbiCoder.encode(
            ["bool", "address", "uint256", "address", "uint256", "uint256", "address", "uint256"],
            [
                offer.isSell,
                offer.nftAddress,
                offer.tokenId,
                offer.tokenAddress,
                offer.price,
                offer.expiry,
                marketplace2.address, // Use the contract's address
                chainId // Get the chain ID
            ]
        );

        const expectedHash = ethers.utils.keccak256(abiEncoded);

        // Call the getMessageHash function
        const messageHash = await marketplace2.getMessageHashEncode(offer);
        // console.log(abiEncoded)
        // Ensure that the expected and actual message hash values match
        expect(ethers.utils.hexlify(messageHash)).to.equal(ethers.utils.hexlify(expectedHash));
    });

    it("Should let signature replay happen (SignatureMalleability)", async function () {
        const { marketplace2, iNXNFT, uSDT, offer, deployer, seller, buyer, chainId, NFTprice } = await deploy();
        const signer = seller.address;
        console.log("signer", signer)

        const abiEncoded = ethers.utils.defaultAbiCoder.encode(
            ["bool", "address", "uint256", "address", "uint256", "uint256", "address", "uint256"],
            [
                offer.isSell,
                offer.nftAddress,
                offer.tokenId,
                offer.tokenAddress,
                offer.price,
                offer.expiry,
                marketplace2.address, // Use the contract's address
                chainId // Get the chain ID
            ]
        );

        const messageHash = ethers.utils.keccak256(abiEncoded);
        const messageHash2 = await marketplace2.getMessageHashEncode(offer);

        console.log("1) getMessageHash:", messageHash);
        const getEthSignedMessageHash = await marketplace2.getEthSignedMessageHash(messageHash);
        // const getEthSignedMessageHash2 = await marketplace2.toEthSignedMessageHash2(messageHash);
        console.log("2) getEthSignedMessageHash:", getEthSignedMessageHash);
        // console.log("2) getEthSignedMessageHash:", getEthSignedMessageHash2);
        const signature = await seller.signMessage(ethers.utils.arrayify(messageHash));

        console.log("3) Sign message hash (signature)", signature)
        const SignatureMalleability = await getMalleabilitySignature(signature);
        console.log("4) SignatureMalleability message hash (signature)", SignatureMalleability)
        const recoverSigner = await marketplace2.recoverSigner(messageHash2, SignatureMalleability);


        console.log("recoverSigner", recoverSigner)


        const result = await marketplace2.verify(signer, messageHash, SignatureMalleability);
        expect(result, 'Signature is not valid').to.be.true
    });

    it("EIP 712", async function () {
        const { marketplace2, iNXNFT, uSDT, offer, deployer, seller, chainId } = await deploy();

        const domain = {
            name: 'Ether Mail',
            version: '1',
            chainId: 1,
            verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC'
        };

        const types = {
            Person: [
                { name: 'name', type: 'string' },
                { name: 'wallet', type: 'address' }
            ],
            Mail: [
                { name: 'from', type: 'Person' },
                { name: 'to', type: 'Person' },
                { name: 'contents', type: 'string' }
            ]
        };

        const value = {
            from: {
                name: 'Cow',
                wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826'
            },
            to: {
                name: 'Bob',
                wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB'
            },
            contents: 'Hello, Bob!'
        };


        // สร้างข้อมูลที่ต้องการเซ็น
        const dataToSign = { domain, types, value };

        // เซ็นข้อมูล
        const signature = await seller._signTypedData(domain, types, value);



        const recoveredAddress = ethers.utils.verifyTypedData(domain, types, value, signature);

        console.log("712 recoveredAddress", recoveredAddress); // นี่ควรจะตรงกับที่อยู่ของ signer


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
        const messageHash = await marketplace2.getMessageHashEncodePacked(offer);
        // console.log(expectedHash)

        // Ensure that the expected and actual message hash values match
        // expect(ethers.utils.hexlify(messageHash)).to.equal(ethers.utils.hexlify(expectedHash));
    });

});


describe("acceptOffer", function () {


    it("should allow a buyer to accept an offer 1", async function () {
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
        await uSDT.connect(seller).approve(marketplace2.address, offer.price);

        // Calculate the message hash that will be signed

        // Define an example Offer struct
        const abiEncoded = ethers.utils.defaultAbiCoder.encode(
            ["address", "uint256", "address", "uint256"],
            [
                offer.nftAddress,               // Address of the NFT contract (iNXNFT.address)
                offer.tokenId,                  // Token ID of the NFT (1)
                offer.tokenAddress,             // Address of the token used for payment (uSDT.address)
                offer.price,                    // Price of the NFT (ethers.utils.parseEther("4"))
            ]
        );
        const hash = ethers.utils.keccak256(abiEncoded);
        const sellerSignature = await seller.signMessage(ethers.utils.arrayify(hash));
        console.log("sellerSignature : ", sellerSignature)
        // Call the acceptOffer function from the buyer's account
        // await marketplace2.connect(buyer).acceptOffer1(offer, sellerSignature);
        // await marketplace2.connect(seller).acceptOffer1(offer, sellerSignature);

        // // Check the state changes after the transaction
        // const sellerERC20Balance = await uSDT.balanceOf(seller.address);
        // const buyerERC721Owner = await iNXNFT.ownerOf(offer.tokenId);

        // // Assert the expected state changes
        // expect(sellerERC20Balance).to.equal(ethers.utils.parseEther("12"));
        // expect(buyerERC721Owner).to.equal(buyer.address);
    });


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


        const abiEncoded = ethers.utils.defaultAbiCoder.encode(
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

        const hash = ethers.utils.keccak256(abiEncoded);

        // const messageHash = await marketplace2.getMessageHashEncode(offer);
        // const messageHashEncodePack = await marketplace2.getMessageHashEncodePacked(offer);
        // console.log(hash)
        // console.log(messageHash)
        // console.log(messageHashEncodePack)
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

        const Whitelist = [
            ['0x70997970C51812dc3A010C7d01b50e0d17dc79C8', 1],
            ['0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', 1]
        ];

        console.log("buyer.address >> ",buyer.address)
        console.log("buyer.address >> ",await iNXNFT.connect(seller).hashLeaf())
        const tree = StandardMerkleTree.of(Whitelist, ["address", "uint256"]);
        const newData = JSON.stringify(tree.dump());
        const filePath = 'test/WorkShop/tree.json';

        fs.writeFileSync(filePath, newData);

        const treeProof = StandardMerkleTree.load(JSON.parse(fs.readFileSync(filePath, "utf8")));
        for (const [i, v] of treeProof.entries()) {
            if (v[0] === seller.address) {
                const proof = treeProof.getProof(i);
                console.log('Value:', v);
                console.log('Proof:', proof);
            }
        }
        await uSDT.connect(seller).approve(iNXNFT.address, whitelistPrice);
        await iNXNFT.connect(seller).purchaseNFTWhitelist(
            1,
            ["0x457aa17fe0228467c8ff03c94ef937caf43d83d6102043300dc6a2e9a13a7006"]
        );
        // console.log("merkleRoot>>>", await iNXNFT.connect(seller).merkleRoot())

    });



});
