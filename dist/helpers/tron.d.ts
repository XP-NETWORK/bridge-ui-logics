import { BigNumber } from "bignumber.js";
import { BalanceCheck, BatchWrappedBalanceCheck, DecodeRawNft, DecodeWrappedNft, EstimateTxFees, MintNft, TransferForeign, TransferNftForeign, UnfreezeForeign, UnfreezeForeignNft, WrappedBalanceCheck } from "./chain";
import { TronWeb } from "tronweb";
import { EthNftInfo, MintArgs } from "./web3";
export declare type MinterRes = {
    minter: string;
    xpnft: string;
    xpnet: string;
    whitelist: string[];
};
export declare type BaseTronHelper = BalanceCheck<string, BigNumber> & MintNft<string, MintArgs, void> & {
    /**
     *
     * Deploy an ERC721 user minter smart contract
     *
     * @argument deployer  deployer of this smart contract
     * @returns Address of the deployed smart contract
     */
    deployErc721(deployer: string): Promise<string>;
    /**
     * Deploy Minter Smart Contract
     *
     * @argument deployer  deployer of the smart contract
     * @argument validators  address of validators of the smart contract
     * @argument threshold  threshold for executing an action
     * @argument whitelist  optional whitelisted nfts contract (deploys one if empty/undefined)
     */
    deployMinter(deployer: string, validators: string[], threshold: number, whitelist: string[] | undefined): Promise<MinterRes>;
};
export declare type TronHelper = BaseTronHelper & WrappedBalanceCheck<string, BigNumber> & BatchWrappedBalanceCheck<string, BigNumber> & TransferForeign<string, string, string, string, string> & TransferNftForeign<string, string, string, EthNftInfo, string, string> & UnfreezeForeign<string, string, string, string, string> & UnfreezeForeignNft<string, string, string, BigNumber, string, string> & DecodeWrappedNft<string> & DecodeRawNft & EstimateTxFees<string, EthNftInfo, Uint8Array, BigNumber> & {
    nftUri(info: EthNftInfo): Promise<string>;
};
export declare function baseTronHelperFactory(provider: TronWeb): Promise<BaseTronHelper>;
export declare function tronHelperFactory(provider: TronWeb, middleware_uri: string, erc1155_addr: string, minter_addr: string): Promise<TronHelper>;
