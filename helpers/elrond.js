"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.elrondHelperFactory = void 0;
/**
 * Elrond Implementation for cross chain traits
 * Unsigned Transaction methods should be used for usage with @elrondnetwork/dapp
 * Note that Unsigned Transactions need to be manually handled after they have been added to the block
 * @module
 */
const erdjs_1 = require("@elrondnetwork/erdjs");
const axios_1 = __importDefault(require("axios"));
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const chain_1 = require("./chain");
const js_base64_1 = require("js-base64");
const ESDT_ISSUE_ADDR = new erdjs_1.Address("erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u");
const ESDT_ISSUE_COST = "50000000000000000";
const NFT_TRANSFER_COST = new bignumber_js_1.default(40000000);
const NFT_UNFREEZE_COST = new bignumber_js_1.default(35000000);
function isEsdtNftInfo(maybe) {
    return maybe.creator != undefined && maybe.balance == "1";
}
/**
 * Create an object implementing cross chain utilities for elrond
 *
 * @param node_uri  URI of the elrond node
 * @param minter_address  Address of the minter smart contract
 * @param middleware_uri  REST API of elrond-event-middleware
 * @param esdt  Identifier of the ESDT Wrapper
 * @param esdt_nft  Identifier of the ESDT NFT Wrapper
 */
const elrondHelperFactory = async (node_uri, minter_address, esdt_swap_address, esdt, esdt_nft, esdt_swap) => {
    const provider = new erdjs_1.ProxyProvider(node_uri);
    await erdjs_1.NetworkConfig.getDefault().sync(provider);
    const mintContract = new erdjs_1.Address(minter_address);
    const swapContract = new erdjs_1.Address(esdt_swap_address);
    const providerRest = axios_1.default.create({
        baseURL: node_uri,
    });
    const esdtHex = Buffer.from(esdt, "utf-8");
    const esdtNftHex = Buffer.from(esdt_nft, "utf-8");
    const esdtSwaphex = Buffer.from(esdt_swap, "utf-8");
    const decoder = new TextDecoder();
    const networkConfig = await provider.getNetworkConfig();
    const gasPrice = networkConfig.MinGasPrice.valueOf();
    const syncAccount = async (signer) => {
        const account = new erdjs_1.Account(signer.getAddress());
        await account.sync(provider);
        return account;
    };
    const signAndSend = async (signer, tx) => {
        const acc = await syncAccount(signer);
        tx.setNonce(acc.nonce);
        await signer.sign(tx);
        try {
            await tx.send(provider);
        }
        catch (e) {
            if (e.message.includes("lowerNonceInTx")) {
                throw (0, chain_1.ConcurrentSendError)();
            }
            else {
                throw e;
            }
        }
        return tx;
    };
    const transactionResult = async (tx_hash) => {
        const uri = `/transaction/${tx_hash.toString()}?withResults=true`;
        let tries = 0;
        while (tries < 10) {
            tries += 1;
            let err;
            // TODO: type safety
            const res = await providerRest.get(uri).catch((e) => (err = e));
            if (err) {
                await new Promise((r) => setTimeout(r, 3000));
                continue;
            }
            const data = res.data;
            if (data["code"] != "successful") {
                throw Error("failed to execute txn");
            }
            const tx_info = data["data"]["transaction"];
            if (tx_info["status"] == "pending") {
                await new Promise((r) => setTimeout(r, 5000));
                continue;
            }
            if (tx_info["status"] != "success") {
                throw Error("failed to execute txn");
            }
            return tx_info;
        }
        throw Error(`failed to query transaction exceeded 10 retries ${tx_hash}`);
    };
    const doEgldSwap = (sender, value) => {
        const utx = new erdjs_1.Transaction({
            receiver: swapContract,
            gasLimit: new erdjs_1.GasLimit(50000000),
            value: new erdjs_1.Balance(erdjs_1.Egld.getToken(), erdjs_1.Egld.getNonce(), new bignumber_js_1.default(value.toString())),
            data: erdjs_1.TransactionPayload.contractCall()
                .setFunction(new erdjs_1.ContractFunction("wrapEgld"))
                .build()
        });
        return signAndSend(sender, utx);
    };
    const unsignedTransferTxn = (chain_nonce, to, value) => {
        return new erdjs_1.Transaction({
            receiver: mintContract,
            gasLimit: new erdjs_1.GasLimit(50000000),
            value: new erdjs_1.Balance(erdjs_1.Egld.getToken(), erdjs_1.Egld.getNonce(), new bignumber_js_1.default(value.toString())),
            data: erdjs_1.TransactionPayload.contractCall()
                .setFunction(new erdjs_1.ContractFunction("freezeSend"))
                .addArg(new erdjs_1.U64Value(new bignumber_js_1.default(chain_nonce)))
                .addArg(new erdjs_1.BytesValue(Buffer.from(to, "ascii")))
                .build(),
        });
    };
    const unsignedMintNftTxn = (owner, { identifier, quantity, name, royalties, hash, attrs, uris }) => {
        let baseArgs = erdjs_1.TransactionPayload.contractCall()
            .setFunction(new erdjs_1.ContractFunction("ESDTNFTCreate"))
            .addArg(new erdjs_1.TokenIdentifierValue(Buffer.from(identifier, "utf-8")))
            .addArg(new erdjs_1.BigUIntValue(new bignumber_js_1.default(quantity !== null && quantity !== void 0 ? quantity : 1)))
            .addArg(new erdjs_1.BytesValue(Buffer.from(name, "utf-8")))
            .addArg(new erdjs_1.U64Value(new bignumber_js_1.default(royalties !== null && royalties !== void 0 ? royalties : 0)))
            .addArg(new erdjs_1.BytesValue(hash ? Buffer.from(hash, "utf-8") : Buffer.alloc(0)))
            .addArg(new erdjs_1.BytesValue(attrs ? Buffer.from(attrs, "utf-8") : Buffer.alloc(0)));
        for (const uri of uris) {
            baseArgs = baseArgs.addArg(new erdjs_1.BytesValue(Buffer.from(uri, "utf-8")));
        }
        return new erdjs_1.Transaction({
            receiver: owner,
            gasLimit: new erdjs_1.GasLimit(70000000),
            data: baseArgs.build(),
        });
    };
    const unsignedTransferNftTxn = (chain_nonce, address, to, { token, nonce }, tx_fees) => {
        return new erdjs_1.Transaction({
            receiver: address,
            gasLimit: new erdjs_1.GasLimit(70000000),
            data: erdjs_1.TransactionPayload.contractCall()
                .setFunction(new erdjs_1.ContractFunction("MultiESDTNFTTransfer"))
                .addArg(new erdjs_1.AddressValue(mintContract))
                .addArg(new erdjs_1.BigUIntValue(new bignumber_js_1.default(2)))
                .addArg(new erdjs_1.TokenIdentifierValue(Buffer.from(token, "utf-8")))
                .addArg(new erdjs_1.U64Value(new bignumber_js_1.default(nonce)))
                .addArg(new erdjs_1.BigUIntValue(new bignumber_js_1.default(1)))
                .addArg(new erdjs_1.TokenIdentifierValue(esdtSwaphex))
                .addArg(new erdjs_1.U64Value(new bignumber_js_1.default(0x0)))
                .addArg(new erdjs_1.BigUIntValue(tx_fees))
                .addArg(new erdjs_1.BytesValue(Buffer.from("freezeSendNft", "ascii")))
                .addArg(new erdjs_1.U64Value(new bignumber_js_1.default(chain_nonce)))
                .addArg(new erdjs_1.BytesValue(Buffer.from(to, "ascii")))
                .build(),
        });
    };
    const unsignedUnfreezeNftTxn = (address, to, id, tx_fees) => {
        return new erdjs_1.Transaction({
            receiver: address,
            gasLimit: new erdjs_1.GasLimit(70000000),
            data: erdjs_1.TransactionPayload.contractCall()
                .setFunction(new erdjs_1.ContractFunction("MultiESDTNFTTransfer"))
                .addArg(new erdjs_1.AddressValue(mintContract))
                .addArg(new erdjs_1.BigUIntValue(new bignumber_js_1.default(2)))
                .addArg(new erdjs_1.TokenIdentifierValue(esdtNftHex))
                .addArg(new erdjs_1.U64Value(new bignumber_js_1.default(id)))
                .addArg(new erdjs_1.BigUIntValue(new bignumber_js_1.default(1)))
                .addArg(new erdjs_1.TokenIdentifierValue(esdtSwaphex))
                .addArg(new erdjs_1.U64Value(new bignumber_js_1.default(0x0)))
                .addArg(new erdjs_1.BigUIntValue(tx_fees))
                .addArg(new erdjs_1.BytesValue(Buffer.from("withdrawNft", "ascii")))
                .addArg(new erdjs_1.BytesValue(Buffer.from(to, "ascii")))
                .build(),
        });
    };
    const unsignedUnfreezeTxn = (chain_nonce, address, to, value) => {
        return new erdjs_1.Transaction({
            receiver: address,
            gasLimit: new erdjs_1.GasLimit(50000000),
            data: erdjs_1.TransactionPayload.contractCall()
                .setFunction(new erdjs_1.ContractFunction("ESDTNFTTransfer"))
                .addArg(new erdjs_1.TokenIdentifierValue(esdtHex))
                .addArg(new erdjs_1.U64Value(new bignumber_js_1.default(chain_nonce)))
                .addArg(new erdjs_1.BigUIntValue(new bignumber_js_1.default(value)))
                .addArg(new erdjs_1.AddressValue(mintContract))
                .addArg(new erdjs_1.BytesValue(Buffer.from("withdraw", "ascii")))
                .addArg(new erdjs_1.BytesValue(Buffer.from(to, "ascii")))
                .build(),
        });
    };
    const listEsdt = async (owner) => {
        const raw = await providerRest(`/address/${owner}/esdt`);
        const dat = raw.data.data.esdts;
        return dat;
    };
    async function listNft(owner) {
        const ents = Object.entries(await listEsdt(owner));
        const fmapCb = ([tok, info]) => {
            var _a;
            if (!isEsdtNftInfo(info)) {
                return [];
            }
            let sp = tok.split("-");
            let nonce = (_a = sp.pop()) !== null && _a !== void 0 ? _a : "";
            return [[`${sp.join("-")}-${parseInt(nonce, 16).toString()}`, info]];
        };
        return new Map(ents.flatMap(fmapCb));
    }
    const unsignedIssueESDTNft = (name, ticker, canFreeze, canWipe, canTransferNFTCreateRole) => {
        let baseArgs = erdjs_1.TransactionPayload.contractCall()
            .setFunction(new erdjs_1.ContractFunction("issueNonFungible"))
            .addArg(new erdjs_1.TokenIdentifierValue(Buffer.from(name, "utf-8")))
            .addArg(new erdjs_1.TokenIdentifierValue(Buffer.from(ticker, "utf-8")));
        if (canFreeze !== undefined) {
            baseArgs = baseArgs
                .addArg(new erdjs_1.BytesValue(Buffer.from("canFreeze", "ascii")))
                .addArg(new erdjs_1.BytesValue(Buffer.from(canFreeze ? "true" : "false", "ascii")));
        }
        if (canWipe !== undefined) {
            baseArgs = baseArgs
                .addArg(new erdjs_1.BytesValue(Buffer.from("canWipe", "ascii")))
                .addArg(new erdjs_1.BytesValue(Buffer.from(canWipe ? "true" : "false", "ascii")));
        }
        if (canTransferNFTCreateRole !== undefined) {
            baseArgs = baseArgs
                .addArg(new erdjs_1.BytesValue(Buffer.from("canTransferNFTCreateRole", "ascii")))
                .addArg(new erdjs_1.BytesValue(Buffer.from(canTransferNFTCreateRole ? "true" : "false", "ascii")));
        }
        return new erdjs_1.Transaction({
            receiver: ESDT_ISSUE_ADDR,
            value: new erdjs_1.Balance(erdjs_1.Egld.getToken(), erdjs_1.Egld.getNonce(), new bignumber_js_1.default(ESDT_ISSUE_COST.toString())),
            gasLimit: new erdjs_1.GasLimit(60000000),
            data: baseArgs.build(),
        });
    };
    const unsignedSetESDTRoles = (token, target, roles) => {
        let baseArgs = erdjs_1.TransactionPayload.contractCall()
            .setFunction(new erdjs_1.ContractFunction("setSpecialRole"))
            .addArg(new erdjs_1.TokenIdentifierValue(Buffer.from(token)))
            .addArg(new erdjs_1.AddressValue(target));
        for (const role of roles) {
            baseArgs = baseArgs.addArg(new erdjs_1.BytesValue(Buffer.from(role, "utf-8")));
        }
        return new erdjs_1.Transaction({
            receiver: ESDT_ISSUE_ADDR,
            gasLimit: new erdjs_1.GasLimit(70000000),
            data: baseArgs.build(),
        });
    };
    async function getLockedNft({ token, nonce, }) {
        const nfts = await listNft(minter_address);
        return nfts.get(`${token}-${nonce.toString()}`);
    }
    const rawNftDecoder = (nftDat) => {
        /// TokenLen(4 by), TokenIdent(TokenLen by), Nonce(8 by)
        /// BinaryCodec is broken for browsers. Decode manually :|
        if (nftDat.length < 12) {
            throw Error("not a wrapped nft");
        }
        const tokenLen = new Uint32Array(nftDat.slice(0, 4).reverse())[0];
        if (nftDat.length !== 12 + tokenLen) {
            throw Error("not a wrapped nft");
        }
        const token = decoder.decode(nftDat.slice(4, 4 + tokenLen));
        // TODO: Consider LO
        // tfw js can't convert be bytes to u64
        const nonce = new Uint32Array(nftDat.slice(4 + tokenLen, 12 + tokenLen).reverse())[0];
        return { token, nonce };
    };
    async function extractId(tx) {
        let err;
        await tx.awaitExecuted(provider).catch((e) => (err = e));
        if (err) {
            await new Promise((r) => setTimeout(r, 3000));
            return extractId(tx);
        }
        const txr = await transactionResult(tx.getHash());
        const id = filterEventId(txr["smartContractResults"]);
        return [tx, id];
    }
    function estimateGas(base_fees, cnt) {
        return base_fees.times((cnt + 1) * gasPrice); // assume execution takes about twice as much gas fees
    }
    return {
        async balance(address) {
            const wallet = new erdjs_1.Account(new erdjs_1.Address(address));
            await wallet.sync(provider);
            return wallet.balance.valueOf();
        },
        async balanceWrappedBatch(address, chain_nonces) {
            const esdts = Object.values(await listEsdt(address.toString()));
            const res = new Map(chain_nonces.map((v) => [v, new bignumber_js_1.default(0)]));
            for (const esdt of esdts) {
                esdt.nonce &&
                    esdt.tokenIdentifier.startsWith(esdt.tokenIdentifier) &&
                    res.set(esdt.nonce, new bignumber_js_1.default(esdt.balance));
            }
            return res;
        },
        async transferNativeToForeign(sender, chain_nonce, to, value, txFees) {
            const txu = unsignedTransferTxn(chain_nonce, to, new bignumber_js_1.default(value.toString()).plus(txFees.toString()));
            const tx = await signAndSend(sender, txu);
            return await extractId(tx);
        },
        async unfreezeWrapped(sender, chain_nonce, to, value, txFees) {
            await doEgldSwap(sender, txFees);
            const txu = unsignedUnfreezeTxn(chain_nonce, sender.getAddress(), to, value);
            const tx = await signAndSend(sender, txu);
            return await extractId(tx);
        },
        async transferNftToForeign(sender, chain_nonce, to, info, txFees) {
            await doEgldSwap(sender, txFees);
            const txu = unsignedTransferNftTxn(chain_nonce, sender.getAddress(), to, info, new bignumber_js_1.default(txFees.toString()));
            const tx = await signAndSend(sender, txu);
            return await extractId(tx);
        },
        async unfreezeWrappedNft(sender, to, nonce, txFees) {
            await doEgldSwap(sender, txFees);
            const txu = unsignedUnfreezeNftTxn(sender.getAddress(), to, nonce, new bignumber_js_1.default(txFees.toString()));
            const tx = await signAndSend(sender, txu);
            return await extractId(tx);
        },
        unsignedIssueESDTNft,
        async issueESDTNft(sender, name, ticker, canFreeze = false, canWipe = false, canTransferNFTCreateRole = false) {
            const txu = unsignedIssueESDTNft(name, ticker, canFreeze, canWipe, canTransferNFTCreateRole);
            const tx = await signAndSend(sender, txu);
            const res = await transactionResult(tx.getHash());
            const tickerh = res["smartContractResults"][0].data.split("@")[2];
            return Buffer.from(tickerh, "hex").toString("utf-8");
        },
        async mintNft(owner, args) {
            const txu = unsignedMintNftTxn(owner.getAddress(), args);
            await signAndSend(owner, txu);
        },
        listNft,
        getLockedNft,
        async setESDTRole(manager, token, target, roles) {
            const txu = unsignedSetESDTRoles(token, target, roles);
            await signAndSend(manager, txu);
        },
        decodeWrappedNft(raw_data) {
            if (!raw_data.attributes) {
                throw Error("can't decode chain nonce");
            }
            return {
                // TODO: CONSIDER ALL BE BYTES
                chain_nonce: js_base64_1.Base64.toUint8Array(raw_data.attributes)[0],
                data: js_base64_1.Base64.toUint8Array(raw_data.uris[0]),
            };
        },
        async decodeUrlFromRaw(data) {
            const nft_info = rawNftDecoder(data);
            const locked = await getLockedNft(nft_info);
            if (locked === undefined) {
                throw Error("Not a wrapped nft");
            }
            return js_base64_1.Base64.atob(locked.uris[0]);
        },
        async estimateValidateTransferNft(validators) {
            return estimateGas(NFT_TRANSFER_COST, validators.length); // TODO: properly estimate NFT_TRANSFER_COST
        },
        async estimateValidateUnfreezeNft(validators) {
            return estimateGas(NFT_UNFREEZE_COST, validators.length); // TODO: properly estimate NFT_UNFREEZE_COST
        }
    };
};
exports.elrondHelperFactory = elrondHelperFactory;
function filterEventId(results) {
    for (const res of results) {
        if (res["nonce"] === 0) {
            continue;
        }
        const data = res.data.split("@");
        if (data[0] != "" || data[1] != "6f6b" || data.length != 3) {
            continue;
        }
        try {
            return parseInt(data[2], 16);
        }
        catch (NumberFormatException) {
            continue;
        }
    }
    throw Error(`invalid result: ${results.toString()}`);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWxyb25kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2hlbHBlcnMvZWxyb25kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBOzs7OztHQUtHO0FBQ0gsZ0RBa0I4QjtBQUM5QixrREFBMEI7QUFDMUIsZ0VBQXFDO0FBQ3JDLG1DQWNpQjtBQUNqQix5Q0FBbUM7QUFJbkMsTUFBTSxlQUFlLEdBQUcsSUFBSSxlQUFPLENBQ2pDLGdFQUFnRSxDQUNqRSxDQUFDO0FBQ0YsTUFBTSxlQUFlLEdBQUcsbUJBQW1CLENBQUM7QUFFNUMsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLHNCQUFTLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDbEQsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLHNCQUFTLENBQUMsUUFBUSxDQUFDLENBQUM7QUFzQ2xELFNBQVMsYUFBYSxDQUFDLEtBQXVCO0lBQzVDLE9BQU8sS0FBSyxDQUFDLE9BQU8sSUFBSSxTQUFTLElBQUksS0FBSyxDQUFDLE9BQU8sSUFBSSxHQUFHLENBQUM7QUFDNUQsQ0FBQztBQTZIRDs7Ozs7Ozs7R0FRRztBQUNJLE1BQU0sbUJBQW1CLEdBT0gsS0FBSyxFQUNoQyxRQUFnQixFQUNoQixjQUFzQixFQUN0QixpQkFBeUIsRUFDekIsSUFBWSxFQUNaLFFBQWdCLEVBQ2hCLFNBQWlCLEVBQ2pCLEVBQUU7SUFDRixNQUFNLFFBQVEsR0FBRyxJQUFJLHFCQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDN0MsTUFBTSxxQkFBYSxDQUFDLFVBQVUsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNoRCxNQUFNLFlBQVksR0FBRyxJQUFJLGVBQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUNqRCxNQUFNLFlBQVksR0FBRyxJQUFJLGVBQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BELE1BQU0sWUFBWSxHQUFHLGVBQUssQ0FBQyxNQUFNLENBQUM7UUFDaEMsT0FBTyxF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