

function openMetaMask() {
    if (typeof window.ethereum !== 'undefined') {
        console.log('MetaMask is installed!');
        window.ethereum.request({ method: 'eth_requestAccounts' });
    } else {
        console.log('MetaMask is not installed.');
    }
}

const domain = {
    name: 'MyApp',
    version: '1.0',
    chainId: 56,
    verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC'
};

const types = {
    Offer: [
        { name: 'isSell', type: 'bool' },
        { name: 'nftAddress', type: 'address' },
        { name: 'tokenId', type: 'uint256' },
        { name: 'tokenAddress', type: 'address' },
        { name: 'price', type: 'uint256' },
        { name: 'expiry', type: 'uint256' },
        { name: 'nonce', type: 'uint256' }
    ]
};


const value = {
    isSell: true,
    nftAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", 
    tokenId: 1,
    tokenAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    price: 40000000,
    expiry: 86400,
    nonce: 42,
};

document.getElementById('signButton').addEventListener('click', async () => {
    try {
        if (window.ethereum) {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            const signer = provider.getSigner();

            const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(value));

            const signature = await signer.signMessage(ethers.utils.arrayify(hash));

            console.log('Signed hash:', signature);
        } else {
            console.error('MetaMask is not installed!');
        }
    } catch (error) {
        console.error(error);
    }
});

document.getElementById('signButtonERC712').addEventListener('click', async () => {
    try {
        if (window.ethereum) {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const account = accounts[0];

            const data = JSON.stringify({
                types: types,
                domain: domain,
                primaryType: 'Offer',
                message: value
            });

            const signature = await window.ethereum.request({
                method: 'eth_signTypedData_v4',
                params: [account, data]
            });

            console.log('Signed message:', signature);
        } else {
            console.error('MetaMask is not installed!');
        }
    } catch (error) {
        console.error(error);
    }
});




