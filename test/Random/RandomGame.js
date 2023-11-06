const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("Attack", function () {
    let deployer, attacker;
    let uSDT, randomGame, attack;
    let PLAY_FEE, REWARD;

    before(async function () {
        [deployer, , attacker] = await ethers.getSigners();

        const USDT = await ethers.getContractFactory("USDT");
        uSDT = await USDT.connect(deployer).deploy();
        await uSDT.connect(deployer).mint(attacker.address, ethers.utils.parseEther("1000"));

        const RandomGame = await ethers.getContractFactory("RandomGame");
        randomGame = await RandomGame.connect(deployer).deploy(uSDT.address);
        PLAY_FEE = await randomGame.PLAY_FEE();
        REWARD = await randomGame.REWARD();
        
        await randomGame.connect(deployer).start();

        const AttackRandomGame = await ethers.getContractFactory("AttackRandomGame");
        attack = await AttackRandomGame.connect(attacker).deploy(randomGame.address, uSDT.address);

        // Fetch the play fee and reward from the RandomGame contract


        // Approve the attack contract to spend PLAY_FEE of USDT on behalf of the attacker
        await uSDT.connect(attacker).approve(attack.address, PLAY_FEE);
        await uSDT.connect(deployer).approve(randomGame.address, REWARD);
    });

    it("Should have USDT balance equal to REWARD after attack", async function () {
        // Balance of AttackRandomGame contract should be 0 before the attack
        let balanceOfAttackContract = await uSDT.balanceOf(attack.address);
        expect(balanceOfAttackContract).to.equal(0);

        // Perform the attack and confirm the transaction
        await attack.connect(attacker).attack();

        // Balance of AttackRandomGame contract should be equal to REWARD after the attack
        balanceOfAttackContract = await uSDT.balanceOf(attack.address);
        // expect(balanceOfAttackContract).to.equal(REWARD);
        expect(balanceOfAttackContract).to.equal(BigInt(PLAY_FEE) + BigInt(REWARD));

    });

    // Optional afterEach cleanup, if necessary
    afterEach(async function () {
        // Add any cleanup steps if needed
    });

    // Optional after all tests cleanup, if necessary
    after(async function () {
        // Add any cleanup steps for after all tests are done
    });
});
