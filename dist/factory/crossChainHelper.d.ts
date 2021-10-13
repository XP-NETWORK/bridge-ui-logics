import { ElrondHelper, ElrondParams } from "../helpers/elrond";
import { TronHelper, TronParams } from "../helpers/tron";
import { Web3Helper, Web3Params } from "../helpers/web3";
export declare type CrossChainHelper = ElrondHelper | Web3Helper | TronHelper;
declare type ChainFactory = {
    inner(chainNonce: number): Promise<CrossChainHelper>;
};
export interface ChainParams {
    elrondParams: ElrondParams;
    hecoParams: Web3Params;
    bscParams: Web3Params;
    ropstenParams: Web3Params;
    avalancheParams: Web3Params;
    polygonParams: Web3Params;
    fantomParams: Web3Params;
    tronParams: TronParams;
    celoParams: Web3Params;
    harmonyParams: Web3Params;
}
export declare function chainFactory(chainParams: ChainParams): ChainFactory;
export {};
