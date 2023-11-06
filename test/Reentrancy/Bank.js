const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { parseEther } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

describe("Attack Bank Contract", function () {

    async function deploy() {
        /// Get accounts
        let [deployer, user, attacker] = await ethers.getSigners();

        /// Deploy Bank contracts
        const Bank = await ethers.getContractFactory("Bank");
        const bank = await Bank.connect(deployer).deploy();

        const BankReentrancyGuard = await ethers.getContractFactory("BankReentrancyGuard");
        const bankReentrancyGuard = await BankReentrancyGuard.connect(deployer).deploy();

        const BankCheckEffectInteraction = await ethers.getContractFactory("BankCheckEffectInteraction");
        const bankCheckEffectInteraction = await BankCheckEffectInteraction.connect(deployer).deploy();

        /// Deploy Attack contracts
        const Attack = await ethers.getContractFactory("Attack");
        const attack = await Attack.connect(attacker).deploy(bank.address);

        return { bank, bankReentrancyGuard, bankCheckEffectInteraction, attack, user, attacker, deployer };
    }

    it("Should empty the balance of the good contract", async function () {
        const { bank, attack, user, attacker } = await deploy();

        // User deposits 10 ETH into Bank
        let tx = await bank.connect(user).addBalance({
            value: parseEther("10"),
        });
        await tx.wait();

        // Check that at this point the Bank's balance is 10 ETH
        let balanceETH = await ethers.provider.getBalance(bank.address);
        expect(balanceETH).to.equal(parseEther("10"));

        // Attacker calls the `attack` function on Attack
        // and sends 1 ETH
        tx = await attack.connect(attacker).attack({
            value: parseEther("1"),
        });
        await tx.wait();

        // Balance of the Bank's address is now zero
        balanceETH = await ethers.provider.getBalance(bank.address);
        expect(balanceETH).to.equal(BigNumber.from("0"));

        // Balance of Attack is now 11 ETH (10 ETH stolen + 1 ETH from attacker)
        balanceETH = await ethers.provider.getBalance(attack.address);
        expect(balanceETH).to.equal(parseEther("11"));
    });


    it("Reentrancy Guard", async function () {
        const { bankReentrancyGuard, attack, user, attacker } = await deploy();
        let tx = await bankReentrancyGuard.connect(user).addBalance({
            value: parseEther("10"),
        });
        await tx.wait();
        let balanceETH = await ethers.provider.getBalance(bankReentrancyGuard.address);
        expect(balanceETH).to.equal(parseEther("10"));
        tx = await attack.connect(attacker).attackReentrancyGuard({
            value: parseEther("1"),
        });
        await tx.wait();
        balanceETH = await ethers.provider.getBalance(bankReentrancyGuard.address);
        expect(balanceETH).to.equal(parseEther("10"));
        balanceETH = await ethers.provider.getBalance(attack.address);
        expect(balanceETH).to.equal(parseEther("1"));
    });

    it("Check Effect Interaction", async function () {
        const { bankCheckEffectInteraction, attack, user, attacker } = await deploy();
        let tx = await bankCheckEffectInteraction.connect(user).addBalance({
            value: parseEther("10"),
        });
        await tx.wait();
        let balanceETH = await ethers.provider.getBalance(bankCheckEffectInteraction.address);
        expect(balanceETH).to.equal(parseEther("10"));
        tx = await attack.connect(attacker).attackCheckEffectInteraction({
            value: parseEther("1"),
        });
        await tx.wait();
        balanceETH = await ethers.provider.getBalance(bankCheckEffectInteraction.address);
        expect(balanceETH).to.equal(parseEther("10"));
        balanceETH = await ethers.provider.getBalance(attack.address);
        expect(balanceETH).to.equal(parseEther("1"));
    });
});