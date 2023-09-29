const { ethers, waffle } = require("hardhat");
const { expect } = require("chai");
const { BigNumber, utils } = require("ethers");

describe("Random Future Block hash", function () {

    async function deploy() {
        /// Get accounts
        let [deployer, otherAccount, player1, player2, player3] = await ethers.getSigners();

        /// Deploy testing contracts
        const LotteryGame = await ethers.getContractFactory("LotteryGame");
        const lotteryGame = await LotteryGame.connect(deployer).deploy();

        return { lotteryGame, deployer, otherAccount, player1, player2, player3 };
    }

    it("Should be random with hash of next 10 Blocks and transfer reward to the winner", async function () {
        // Deploy the Game contract
        const { lotteryGame, deployer, player1, player2, player3 } = await deploy();

        console.log(`balance before deployer : ${ethers.utils.formatEther(await ethers.provider.getBalance(deployer.getAddress()))} ethers`)
        console.log(`balance before player1 : ${ethers.utils.formatEther(await ethers.provider.getBalance(player1.getAddress()))} ethers`)
        console.log(`balance before player2 : ${ethers.utils.formatEther(await ethers.provider.getBalance(player2.getAddress()))} ethers`)
        console.log(`balance before player3 : ${ethers.utils.formatEther(await ethers.provider.getBalance(player3.getAddress()))} ethers`)

        const play1 = await lotteryGame.connect(player1).play({ value: utils.parseEther("1") });
        const play2 = await lotteryGame.connect(player2).play({ value: utils.parseEther("1") });
        const play3 = await lotteryGame.connect(player3).play({ value: utils.parseEther("1") });

        let currentBlock = await ethers.provider.getBlockNumber();
        console.log(`currentBlock: ${currentBlock}`);
        await ethers.provider.send("hardhat_mine", ["0xa"]);
        currentBlock = await ethers.provider.getBlockNumber();
        console.log(`currentBlock: ${currentBlock}`);
        await ethers.provider.send("hardhat_mine", ["0xa"]);

        const draw = await lotteryGame.connect(deployer).draw();
        const random = await lotteryGame.connect(deployer).randomNumber();
        console.log(random)
        console.log(`balance after deployer : ${ethers.utils.formatEther(await ethers.provider.getBalance(deployer.getAddress()))} ethers`)
        console.log(`balance after player1 : ${ethers.utils.formatEther(await ethers.provider.getBalance(player1.getAddress()))} ethers`)
        console.log(`balance after player2 : ${ethers.utils.formatEther(await ethers.provider.getBalance(player2.getAddress()))} ethers`)
        console.log(`balance after player3 : ${ethers.utils.formatEther(await ethers.provider.getBalance(player3.getAddress()))} ethers`)

        const balanceLotteryGame = await lotteryGame.getBalance();
        expect(balanceLotteryGame).to.equal(BigNumber.from("0"));
    });
});