const { StandardMerkleTree } = require('@openzeppelin/merkle-tree');
const fs = require('fs');

const Whitelist = [
    ['0x70997970C51812dc3A010C7d01b50e0d17dc79C8', 1],
    ['0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', 1]
];

const tree = StandardMerkleTree.of(Whitelist, ["address", "uint256"]);
const newData = JSON.stringify(tree.dump());
console.log(newData)

const merkleRootUint8Array = tree.tree[0];
const merkleRootHex = Buffer.from(merkleRootUint8Array).toString('hex');
console.log(merkleRootHex);

const filePath = 'test/WorkShop/tree2.json';

fs.writeFileSync(filePath, newData);
