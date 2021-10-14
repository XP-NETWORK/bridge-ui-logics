"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tronHelperFactory = exports.baseTronHelperFactory = void 0;
const bignumber_js_1 = require("bignumber.js");
const axios_1 = __importDefault(require("axios"));
// @ts-expect-error no types cope
const tronstation_1 = __importDefault(require("tronstation"));
const bignumber_1 = require("@ethersproject/bignumber/lib/bignumber");
const js_base64_1 = require("js-base64");
const validator_1 = require("validator");
const xpnet_web3_contracts_1 = require("xpnet-web3-contracts");
async function baseTronHelperFactory(provider) {
    const setSigner = (signer) => {
        return provider.setPrivateKey(signer);
    };
    const deployErc721_i = async (deployer) => {
        setSigner(deployer);
        const contract = await provider.contract().new({
            abi: xpnet_web3_contracts_1.UserNftMinter__factory.abi,
            bytecode: xpnet_web3_contracts_1.UserNftMinter__factory.bytecode,
            feeLimit: 3000000000,
        });
        return contract;
    };
    const deployErc1155_i = async (owner) => {
        setSigner(owner);
        const contract = await provider.contract().new({
            abi: xpnet_web3_contracts_1.XPNet__factory.abi,
            bytecode: xpnet_web3_contracts_1.XPNet__factory.abi,
            feeLimit: 3000000000
        });
        return contract;
    };
    const deployXpNft = async (deployer) => {
        setSigner(deployer);
        const contract = await provider.contract().new({
            abi: xpnet_web3_contracts_1.XPNft__factory.abi,
            bytecode: xpnet_web3_contracts_1.XPNft__factory.abi,
            feeLimit: 3000000000
        });
        return contract;
    };
    return {
        async mintNft(owner, options) {
            setSigner(owner);
            const erc = await provider.contract(xpnet_web3_contracts_1.UserNftMinter__factory.abi, options.contract);
            await erc.mint(options.uri).send();
        },
        async balance(address) {
            const balance = await provider.trx.getBalance(address);
            return new bignumber_js_1.BigNumber(balance);
        },
        deployErc721: async (owner) => await deployErc721_i(owner).then((c) => c.address),
        async deployMinter(deployer, validators, threshold, whitelist = []) {
            if (whitelist.length == 0) {
                const unft = await deployErc721_i(deployer);
                whitelist.push(unft.address);
            }
            const nft_token = await deployXpNft(deployer);
            const token = await deployErc1155_i(deployer);
            const minter = await provider.contract().new({
                abi: xpnet_web3_contracts_1.Minter__factory.abi,
                bytecode: xpnet_web3_contracts_1.Minter__factory.bytecode,
                feeLimit: 3000000000,
                parameters: [validators, whitelist, threshold, nft_token.address, token.address]
            });
            await nft_token.transferOwnership(minter.address).send();
            await token.transferOwnership(minter.address).send();
            return {
                minter: minter.address,
                xpnft: nft_token.address,
                xpnet: token.address,
                whitelist
            };
        }
    };
}
exports.baseTronHelperFactory = baseTronHelperFactory;
async function tronHelperFactory(provider, middleware_uri, erc1155_addr, minter_addr, minter_abi) {
    const station = new tronstation_1.default(provider);
    const base = await baseTronHelperFactory(provider);
    const erc1155 = await provider.contract(xpnet_web3_contracts_1.XPNet__factory.abi, erc1155_addr);
    const minter = await provider.contract(minter_abi, minter_addr);
    const event_middleware = axios_1.default.create({
        baseURL: middleware_uri,
        headers: {
            "Content-Type": "application/json",
        },
    });
    const setSigner = (signer) => {
        return provider.setPrivateKey(signer);
    };
    async function extractTxn(hash) {
        await event_middleware.post("/tx/tron", { tx_hash: hash });
        await new Promise((r) => setTimeout(r, 6000));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const getEv = async (retries = 0) => {
            const res = await provider.getEventByTransactionID(hash);
            if (res.length !== 0) {
                return res;
            }
            if (retries > 15) {
                throw Error("Couldn't fetch transaction after more than 15 retries!");
            }
            await new Promise((r) => setTimeout(r, 3000));
            return getEv(retries + 1);
        };
        const evs = await getEv();
        const ev = evs.find((e) => (e === null || e === void 0 ? void 0 : e.contract) == minter_addr);
        const action_id = ev.result["action_id"].toString();
        return [hash, action_id];
    }
    const nftUri = async (info) => {
        if (info.contract_type == "ERC721") {
            const erc = await provider.contract(xpnet_web3_contracts_1.UserNftMinter__factory.abi, info.contract);
            return await erc.tokenURI(info.token).call();
        }
        else {
            const erc = await provider.contract(xpnet_web3_contracts_1.XPNet__factory.abi, info.contract);
            return await erc.uri(info.token).call();
        }
    };
    function contractTypeFromNftKind(kind) {
        return kind === validator_1.NftEthNative.NftKind.ERC721 ? "ERC721" : "ERC1155";
    }
    const randomAction = () => (Math.floor(Math.random() * 999 + (Number.MAX_SAFE_INTEGER - 1000)))
        .toString();
    async function estimateGas(addrs, func_sig, params) {
        let energy = 0;
        let bandwidth = 0;
        const nrgSun = await station.energy.burnedEnergy2Trx(1, { unit: 'sun' });
        const bandSun = 10;
        for (const [i, addr] of addrs.entries()) {
            const res = await provider.transactionBuilder.triggerConstantContract(minter.address, func_sig, {}, params, provider.address.toHex(addr));
            let nrg = res["energy_used"];
            if (i == addrs.length - 1 && addrs.length != 1)
                nrg *= 2;
            energy += nrg;
            const tx_raw = res["transaction"]["raw_data_hex"];
            bandwidth += tx_raw.length;
        }
        // Fee = energy * (sun per energy) + bandwidth * (sun per bandwidth)
        // bandwidth = raw tx byte length
        const fee = new bignumber_js_1.BigNumber(energy).times(nrgSun).plus(bandwidth * bandSun);
        return fee;
    }
    return Object.assign(Object.assign({}, base), { async decodeUrlFromRaw(data) {
            const packed = validator_1.NftEthNative.deserializeBinary(data);
            const nft_info = {
                contract_type: contractTypeFromNftKind(packed.getNftKind()),
                contract: packed.getContractAddr(),
                token: bignumber_1.BigNumber.from(packed.getId()),
            };
            return await nftUri(nft_info);
        },
        decodeWrappedNft(raw_data) {
            const u8D = js_base64_1.Base64.toUint8Array(raw_data);
            const packed = validator_1.NftPacked.deserializeBinary(u8D);
            return {
                chain_nonce: packed.getChainNonce(),
                data: packed.getData_asU8(),
            };
        }, nftUri: nftUri, async transferNativeToForeign(sender, chain_nonce, to, value, txFees) {
            setSigner(sender);
            const val = bignumber_1.BigNumber.from(value.toString());
            const totalVal = val.add(bignumber_1.BigNumber.from(txFees.toString()));
            let res = await minter
                .freeze(chain_nonce, to, val)
                .send({ callValue: totalVal });
            return await extractTxn(res);
        },
        async unfreezeWrapped(sender, chain_nonce, to, value, txFees) {
            setSigner(sender);
            const res = await minter
                .withdraw(chain_nonce, to, value)
                .send({ callValue: bignumber_1.BigNumber.from(txFees.toString()) });
            return await extractTxn(res);
        },
        async unfreezeWrappedNft(sender, to, id, txFees) {
            setSigner(sender);
            const res = await minter
                .withdrawNft(to, id.toString())
                .send({ callValue: bignumber_1.BigNumber.from(txFees.toString()) });
            return await extractTxn(res);
        },
        async transferNftToForeign(sender, chain_nonce, to, id, txFees) {
            setSigner(sender);
            const erc = await provider.contract(xpnet_web3_contracts_1.UserNftMinter__factory.abi, id.contract);
            await erc.approve(minter.address, id.token).send();
            const txr = await minter
                .freezeErc721(id.contract, id.token, chain_nonce, to)
                .send({ callValue: bignumber_1.BigNumber.from(txFees.toString()) });
            return await extractTxn(txr);
        },
        async balanceWrappedBatch(address, chain_nonces) {
            const res = new Map();
            const balance = await erc1155
                .balanceOfBatch(Array(chain_nonces.length).fill(address), chain_nonces)
                .call();
            balance.map((e, i) => {
                res.set(chain_nonces[i], new bignumber_js_1.BigNumber(e.toString()));
            });
            return res;
        },
        async balanceWrapped(address, chain_nonce) {
            const bal = await erc1155.balanceOf(address, chain_nonce).call();
            return new bignumber_js_1.BigNumber(bal.toString());
        },
        async estimateValidateTransferNft(validators, to, nft) {
            // Protobuf is not deterministic, though perhaps we can approximate this statically
            const tokdat = new validator_1.NftEthNative();
            tokdat.setId(nft.token.toString());
            tokdat.setNftKind(1);
            tokdat.setContractAddr(nft.contract);
            const encoded = new validator_1.NftPacked();
            encoded.setChainNonce(0x1351);
            encoded.setData(tokdat.serializeBinary());
            return await estimateGas(validators, "validateTransferNft(uint128,address,string)", [
                { type: "uint128", value: randomAction() },
                { type: "address", value: to },
                { type: "string", value: Buffer.from(encoded.serializeBinary()).toString("base64") }
            ]);
        },
        async estimateValidateUnfreezeNft(validators, to, nft_data) {
            const nft_dat = validator_1.NftEthNative.deserializeBinary(nft_data);
            return await estimateGas(validators, "validateUnfreezeNft(uint128,address,uint256,address)", [
                { type: "uint128", value: randomAction() },
                { type: "address", value: to },
                { type: "uint256", value: nft_dat.getId().toString() },
                { type: "address", value: nft_dat.getContractAddr() }
            ]);
        } });
}
exports.tronHelperFactory = tronHelperFactory;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9oZWxwZXJzL3Ryb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsK0NBQXlDO0FBZ0J6QyxrREFBMEI7QUFHMUIsaUNBQWlDO0FBQ2pDLDhEQUFzQztBQUV0QyxzRUFBNEU7QUFDNUUseUNBQW1DO0FBQ25DLHlDQUFvRDtBQUNwRCwrREFBK0c7QUFxRHhHLEtBQUssVUFBVSxxQkFBcUIsQ0FDekMsUUFBaUI7SUFFakIsTUFBTSxTQUFTLEdBQUcsQ0FBQyxNQUFjLEVBQUUsRUFBRTtRQUNuQyxPQUFPLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDeEMsQ0FBQyxDQUFDO0lBRUYsTUFBTSxjQUFjLEdBQUcsS0FBSyxFQUFFLFFBQWdCLEVBQUUsRUFBRTtRQUNoRCxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFcEIsTUFBTSxRQUFRLEdBQUcsTUFBTSxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsR0FBRyxDQUFDO1lBQzdDLEdBQUcsRUFBRSw2Q0FBc0IsQ0FBQyxHQUFHO1lBQy9CLFFBQVEsRUFBRSw2Q0FBc0IsQ0FBQyxRQUFRO1lBQ3pDLFFBQVEsRUFBRSxVQUFVO1NBQ3JCLENBQUMsQ0FBQztRQUVILE9BQU8sUUFBUSxDQUFDO0lBQ2xCLENBQUMsQ0FBQztJQUVGLE1BQU0sZUFBZSxHQUFHLEtBQUssRUFBRSxLQUFhLEVBQUUsRUFBRTtRQUM5QyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFakIsTUFBTSxRQUFRLEdBQUcsTUFBTSxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsR0FBRyxDQUFDO1lBQzdDLEdBQUcsRUFBRSxxQ0FBYyxDQUFDLEdBQUc7WUFDdkIsUUFBUSxFQUFFLHFDQUFjLENBQUMsR0FBRztZQUM1QixRQUFRLEVBQUUsVUFBVTtTQUNyQixDQUFDLENBQUM7UUFFSCxPQUFPLFFBQVEsQ0FBQztJQUNsQixD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