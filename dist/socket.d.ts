import { ManagerOptions, SocketOptions } from "socket.io-client";
/**
 * Tracker for cross chain transaction
 */
export declare type TxnSocketHelper = {
    /**
     *
     * @param chain  Nonce of the target chain
     * @param action_id  Identifier for tracking a cross chain transaction
     * @returns  transaction hash on the foreign chain
     */
    waitTxHash(chain: number, action_id: string): Promise<string>;
};
/**
 * Create a [[TxnSocketHelper]]
 *
 * @param uri  URI of the Migration-Validator socket api
 * @param options  socket.io options
 */
export declare function txnSocketHelper(uri: string, options?: Partial<SocketOptions & ManagerOptions>): TxnSocketHelper;
