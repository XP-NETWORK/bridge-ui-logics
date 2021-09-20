/**
 * Web3 Implementation for cross chain traits
 * @module
 */
import BigNumber from 'bignumber.js'
import {
  TransferForeign,
  UnfreezeForeign,
  UnfreezeForeignNft,
  BalanceCheck,
  TransferNftForeign,
  WrappedBalanceCheck,
  BatchWrappedBalanceCheck,
  DecodeWrappedNft,
  WrappedNft,
  DecodeRawNft,
  MintNft,
} from './chain'
import { Contract, Signer, BigNumber as EthBN, ContractFactory } from 'ethers'
import {
  TransactionReceipt,
  TransactionResponse,
  Provider,
} from '@ethersproject/providers'
import { Interface } from 'ethers/lib/utils'
import { abi as ERC721_abi } from '../fakeERC721.json'
import { abi as ERC1155_abi } from '../fakeERC1155.json'
import * as ERC1155_contract from '../XPNet.json'
import { NftEthNative, NftPacked } from 'validator/dist/encoding'
import { Base64 } from 'js-base64'
type EasyBalance = string | number | EthBN
/**
 * Information required to perform NFT transfers in this chain
 */
export type EthNftInfo = {
  contract_type: 'ERC721' | 'ERC1155'
  contract: string
  token: EthBN
}

/**
 * Arguments required for minting a new nft
 *
 * contract: address of the sc
 * token: token ID of the newly minted nft
 * owner: Owner of the newly minted nft
 * uri: uri of the nft
 */
export type MintArgs = {
  contract: string
  token: EasyBalance
  owner: string
  uri: string
}

/**
 * Base util traits
 */
export type BaseWeb3Helper = BalanceCheck<string, BigNumber> &
  /**
   * Mint an nft in the given ERC1155 smart contract
   *
   * @argument signer  owner of the smart contract
   * @argument args  See [[MintArgs]]
   */
  MintNft<Signer, MintArgs, void> & {
    /**
     *
     * Deploy an ERC1155 smart contract
     *
     * @argument owner  Owner of this smart contract
     * @returns Address of the deployed smart contract
     */
    deployErc1155(owner: Signer): Promise<string>
  }

/**
 * Traits implemented by this module
 */
export type Web3Helper = BaseWeb3Helper &
  WrappedBalanceCheck<string, BigNumber> &
  BatchWrappedBalanceCheck<string, BigNumber> &
  TransferForeign<Signer, string, EasyBalance, TransactionReceipt, string> &
  TransferNftForeign<Signer, string, EthNftInfo, TransactionReceipt, string> &
  UnfreezeForeign<Signer, string, EasyBalance, TransactionReceipt, string> &
  UnfreezeForeignNft<Signer, string, BigNumber, TransactionReceipt, string> &
  DecodeWrappedNft<string> &
  DecodeRawNft & {
    /**
     * Get the uri of an nft given nft info
     */
    nftUri(info: EthNftInfo): Promise<string>
  }

function contractTypeFromNftKind(kind: 0 | 1): 'ERC721' | 'ERC1155' {
  return kind === NftEthNative.NftKind.ERC721 ? 'ERC721' : 'ERC1155'
}

/**
 * Create an object implementing minimal utilities for a web3 chain
 *
 * @param provider An ethers.js provider object
 */
export async function baseWeb3HelperFactory(
  provider: Provider
): Promise<BaseWeb3Helper> {
  const w3 = provider
  const erc1155_abi = new Interface(ERC1155_abi)

  return {
    async balance(address: string): Promise<BigNumber> {
      const bal = await w3.getBalance(address)

      // ethers BigNumber is not compatible with our bignumber
      return new BigNumber(bal.toString())
    },
    async deployErc1155(owner: Signer): Promise<string> {
      const factory = ContractFactory.fromSolidity(ERC1155_contract, owner)
      const contract = await factory.deploy()

      return contract.address
    },
    async mintNft(
      contract_owner: Signer,
      { contract, token, owner, uri }: MintArgs
    ): Promise<void> {
      const erc1155 = new Contract(contract, erc1155_abi, contract_owner)
      await erc1155.mint(owner, EthBN.from(token.toString()), 1)
      await erc1155.setURI(token, uri)
    },
  }
}

/**
 * Create an object implementing cross chain utilities for a web3 chain
 *
 * @param provider  An ethers.js provider object
 * @param minter_addr  Address of the minter smart contract
 * @param minter_abi  ABI of the minter smart contract
 */
export async function web3HelperFactory(
  provider: Provider,
  minter_addr: string,
  minter_abi: Interface,
  erc1155_addr: string
): Promise<Web3Helper> {
  const w3 = provider

  const minter = new Contract(minter_addr, minter_abi, w3)

  const erc1155_abi = new Interface(ERC1155_abi)
  const erc1155 = new Contract(erc1155_addr, erc1155_abi, w3)

  function signedMinter(signer: Signer): Contract {
    return minter.connect(signer)
  }

  async function extractTxn(
    txr: TransactionResponse,
    _evName: string
  ): Promise<[TransactionReceipt, string]> {
    const receipt = await txr.wait()
    const log = receipt.logs.find((log) => log.address === minter.address)
    if (log === undefined) {
      throw Error("Couldn't extract action_id")
    }

    const evdat = minter_abi.parseLog(log)
    const action_id: string = evdat.args[0].toString()
    return [receipt, action_id]
  }

  async function nftUri(info: EthNftInfo): Promise<string> {
    if (info.contract_type == 'ERC721') {
      const erc = new Contract(info.contract, ERC721_abi, w3)
      return await erc.tokenURI(info.token)
    } else {
      const erc = new Contract(info.contract, erc1155_abi, w3)
      return await erc.uri(info.token)
    }
  }

  const base = await baseWeb3HelperFactory(provider)

  return {
    ...base,
    async balanceWrapped(
      address: string,
      chain_nonce: number
    ): Promise<BigNumber> {
      const bal = await erc1155.balanceOf(address, chain_nonce)

      return new BigNumber(bal.toString())
    },
    async balanceWrappedBatch(
      address: string,
      chain_nonces: number[]
    ): Promise<Map<number, BigNumber>> {
      const bals: EthBN[] = await erc1155.balanceOfBatch(
        Array(chain_nonces.length).fill(address),
        chain_nonces
      )

      return new Map(
        bals.map((v, i) => [chain_nonces[i], new BigNumber(v.toString())])
      )
    },
    async transferNativeToForeign(
      sender: Signer,
      chain_nonce: number,
      to: string,
      value: EasyBalance
    ): Promise<[TransactionReceipt, string]> {
      const res = await signedMinter(sender).freeze(chain_nonce, to, { value })
      return await extractTxn(res, 'Transfer')
    },
    async transferNftToForeign(
      sender: Signer,
      chain_nonce: number,
      to: string,
      id: EthNftInfo
    ): Promise<[TransactionReceipt, string]> {
      let txr
      let ev
      const calldata = Buffer.concat([
        Buffer.from(new Int32Array([0]).buffer), // 4 bytes padidng
        Buffer.from(new Int32Array([chain_nonce]).buffer).reverse(), // BE, gotta reverse
        Buffer.from(to, 'utf-8'),
      ])

      if (id.contract_type == 'ERC721') {
        ev = 'TransferErc721'
        const erc = new Contract(id.contract, ERC721_abi, w3)
        txr = await erc
          .connect(sender)
          ['safeTransferFrom(address,address,uint256,bytes)'](
            await sender.getAddress(),
            minter_addr,
            id.token,
            calldata
          )
      } else {
        ev = 'TransferErc1155'
        const erc = new Contract(id.contract, erc1155_abi, w3)
        txr = await erc
          .connect(sender)
          .safeTransferFrom(
            await sender.getAddress(),
            minter_addr,
            id.token,
            EthBN.from(1),
            calldata
          )
      }

      return await extractTxn(txr, ev)
    },
    async unfreezeWrapped(
      sender: Signer,
      chain_nonce: number,
      to: string,
      value: EasyBalance
    ): Promise<[TransactionReceipt, string]> {
      const res = await signedMinter(sender).withdraw(chain_nonce, to, value)

      return await extractTxn(res, 'Unfreeze')
    },
    async unfreezeWrappedNft(
      sender: Signer,
      to: string,
      id: BigNumber
    ): Promise<[TransactionReceipt, string]> {
      const res = await signedMinter(sender).withdraw_nft(to, id)

      return await extractTxn(res, 'UnfreezeNft')
    },
    nftUri,
    decodeWrappedNft(raw_data: string): WrappedNft {
      const u8D = Base64.toUint8Array(raw_data)
      const packed = NftPacked.deserializeBinary(u8D)

      return {
        chain_nonce: packed.getChainNonce(),
        data: packed.getData_asU8(),
      }
    },
    async decodeUrlFromRaw(data: Uint8Array): Promise<string> {
      const packed = NftEthNative.deserializeBinary(data)
      const nft_info = {
        contract_type: contractTypeFromNftKind(packed.getNftKind()),
        contract: packed.getContractAddr(),
        token: EthBN.from(packed.getId()),
      }

      return await nftUri(nft_info)
    },
  }
}
