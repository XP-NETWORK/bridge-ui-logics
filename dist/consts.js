"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHAIN_INFO = exports.RPCURI = void 0;
const elrond_1 = require("./helpers/elrond");
const tron_1 = require("./helpers/tron");
const web3_1 = require("./helpers/web3");
const domain_1 = require("crypto-exchange-rate/dist/model/domain");
const HECO = "https://http-testnet.hecochain.com";
const BSC = "https://data-seed-prebsc-1-s1.binance.org:8545";
const AVALANCE = "https://api.avax-test.network/ext/bc/C/rpc";
const POLYGON = "https://matic-testnet-archive-rpc.bwarelabs.com";
const FANTOM = "https://rpc.testnet.fantom.network/";
const TRON = "https://api.shasta.trongrid.io/";
const CELO = "https://alfajores-forno.celo-testnet.org";
const HARMONY = "https://api.s0.b.hmny.io";
// All the supported testnet uri's are here.
exports.RPCURI = {
    HECO,
    BSC,
    AVALANCE,
    POLYGON,
    FANTOM,
    TRON,
    CELO,
    HARMONY,
};
exports.CHAIN_INFO = {
    2: {
        name: "Elrond",
        nonce: 2,
        decimals: 1e18,
        constructor: (p) => elrond_1.elrondHelperFactory(p),
        blockExplorerUrl: "https://devnet-explorer.elrond.com/transactions/",
        currency: domain_1.SupportedCurrency.EGLD,
    },
    3: {
        name: "Heco",
        nonce: 3,
        chainId: 256,
        decimals: 1e18,
        blockExplorerUrl: "https://testnet.hecoinfo.com/tx",
        constructor: (p) => web3_1.web3HelperFactory(p),
        currency: domain_1.SupportedCurrency.HT,
    },
    4: {
        name: "BSC",
        nonce: 4,
        chainId: 97,
        decimals: 1e18,
        blockExplorerUrl: "https://testnet.bscscan.com/tx",
        constructor: (p) => web3_1.web3HelperFactory(p),
        currency: domain_1.SupportedCurrency.BNB,
    },
    6: {
        name: "Avalanche",
        nonce: 6,
        chainId: 43113,
        decimals: 1e18,
        blockExplorerUrl: "https://cchain.explorer.avax-test.network/tx",
        constructor: (p) => web3_1.web3HelperFactory(p),
        currency: domain_1.SupportedCurrency.AVAX,
    },
    7: {
        name: "Polygon",
        nonce: 0x7,
        chainId: 80001,
        decimals: 1e18,
        blockExplorerUrl: "https://mumbai.polygonscan.com/tx",
        constructor: (p) => web3_1.web3HelperFactory(p),
        currency: domain_1.SupportedCurrency.MATIC,
    },
    8: {
        name: "Fantom",
        nonce: 0x8,
        decimals: 1e18,
        chainId: 4002,
        blockExplorerUrl: "https://explorer.testnet.fantom.network/transactions",
        constructor: (p) => web3_1.web3HelperFactory(p),
        currency: domain_1.SupportedCurrency.FTM,
    },
    9: {
        name: "Tron",
        nonce: 0x9,
        decimals: 1e6,
        blockExplorerUrl: "https://shasta.tronscan.org/#/transaction",
        constructor: (p) => tron_1.tronHelperFactory(p),
        currency: domain_1.SupportedCurrency.TRX,
    },
    11: {
        name: "Celo",
        nonce: 0xb,
        decimals: 1e18,
        chainId: 44787,
        blockExplorerUrl: "https://alfajores-blockscout.celo-testnet.org/tx",
        constructor: (p) => web3_1.web3HelperFactory(p),
        currency: domain_1.SupportedCurrency.CELO,
    },
    12: {
        name: "Harmony",
        nonce: 0xc,
        decimals: 1e18,
        chainId: 1666700000,
        blockExplorerUrl: "https://explorer.pops.one/tx",
        constructor: (p) => web3_1.web3HelperFactory(p),
        currency: domain_1.SupportedCurrency.CELO,
    },
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc3RzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2NvbnN0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSw2Q0FBcUU7QUFDckUseUNBQStEO0FBQy9ELHlDQUErRDtBQUMvRCxtRUFBMkU7QUFFM0UsTUFBTSxJQUFJLEdBQUcsb0NBQW9DLENBQUM7QUFFbEQsTUFBTSxHQUFHLEdBQUcsZ0RBQWdELENBQUM7QUFFN0QsTUFBTSxRQUFRLEdBQUcsNENBQTRDLENBQUM7QUFFOUQsTUFBTSxPQUFPLEdBQUcsaURBQWlELENBQUM7QUFFbEUsTUFBTSxNQUFNLEdBQUcscUNBQXFDLENBQUM7QUFFckQsTUFBTSxJQUFJLEdBQUcsaUNBQWlDLENBQUM7QUFFL0MsTUFBTSxJQUFJLEdBQUcsMENBQTBDLENBQUM7QUFFeEQsTUFBTSxPQUFPLEdBQUcsMEJBQTBCLENBQUM7QUFFM0MsNENBQTRDO0FBQy9CLFFBQUEsTUFBTSxHQUFHO0lBQ3BCLElBQUk7SUFDSixHQUFHO0lBQ0gsUUFBUTtJQUNSLE9BQU87SUFDUCxNQUFNO0lBQ04sSUFBSTtJQUNKLElBQUk7SUFDSixPQUFPO0NBQ1IsQ0FBQztBQWtCVyxRQUFBLFVBQVUsR0FBYztJQUNuQyxDQUFDLEVBQUU7UUFDRCxJQUFJLEVBQUUsUUFBUTtRQUNkLEtBQUssRUFBRSxDQUFDO1FBQ1IsUUFBUSxFQUFFLElBQUk7UUFDZCxXQUFXLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLDRCQUFtQixDQUFDLENBQWlCLENBQUM7UUFDMUQsZ0JBQWdCLEVBQUUsa0RBQWtEO1FBQ3BFLFFBQVEsRUFBRSwwQkFBaUIsQ0FBQyxJQUFJO0tBQ2pDO0lBQ0QsQ0FBQyxFQUFFO1FBQ0QsSUFBSSxFQUFFLE1BQU07UUFDWixLQUFLLEVBQUUsQ0FBQztRQUNSLE9BQU8sRUFBRSxHQUFHO1FBQ1osUUFBUSxFQUFFLElBQUk7UUFDZCxnQkFBZ0IsRUFBRSxpQ0FBaUM7UUFDbkQsV0FBVyxF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