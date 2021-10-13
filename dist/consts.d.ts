import { CrossChainHelper } from "./factory/crossChainHelper";
import { ElrondParams } from "./helpers/elrond";
import { TronParams } from "./helpers/tron";
import { Web3Params } from "./helpers/web3";
import { SupportedCurrency } from "crypto-exchange-rate/dist/model/domain";
export declare const RPCURI: {
    HECO: string;
    BSC: string;
    AVALANCE: string;
    POLYGON: string;
    FANTOM: string;
    TRON: string;
    CELO: string;
    HARMONY: string;
};
interface ChainData {
    name: string;
    nonce: number;
    decimals: number;
    constructor: (params: Web3Params | TronParams | ElrondParams) => Promise<CrossChainHelper>;
    blockExplorerUrl: string;
    chainId?: number;
    currency: SupportedCurrency;
}
interface ChainInfo {
    [nonce: number]: ChainData;
}
export declare const CHAIN_INFO: ChainInfo;
export {};
