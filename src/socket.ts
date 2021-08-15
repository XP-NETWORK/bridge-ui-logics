import { io, ManagerOptions, SocketOptions } from "socket.io-client";


type Awaiters = {
    [index: string]: (hash: string) => void;
};

export type TxnSocketHelper = {
    waitTxHashPolkadot(id: string): Promise<string>;
    waitTxHashElrond(id: string): Promise<string>;
}

export function txnSocketHelper(uri: string, options?: Partial<SocketOptions & ManagerOptions>): TxnSocketHelper {
    const socket = io(uri, options);

    const polkadot_awaiters: Awaiters = {};
    const elrond_awaiters: Awaiters = {};
    const polkadot_event_buf = new Map<string, string>();
    const elrond_event_buf = new Map<string, string>();

    function add_event(chain: number, id: string, hash: string) {
        let resolver;
        switch (chain) {
            case 0x1: {
                resolver = polkadot_awaiters['id'];
                if (resolver === undefined) {
                    polkadot_event_buf.set(id, hash);
                    return;
                }
                break;
            }
            case 0x2: {
                resolver = elrond_awaiters['id'];
                if (resolver === undefined) {
                    elrond_event_buf.set(id, hash);
                    return;
                }
                break;
            }
            default: throw Error(`Unhandled chain ${chain}`);
        }

        resolver(hash);
    }

    socket.on(
        "transfer_nft_event",
        (chain: number, action_id: string, hash: string) => {
            add_event(chain, action_id, hash);
    });

    socket.on(
        "unfreeze_nft_event",
        (chain: number, action_id: string, hash: string) => {
            add_event(chain, action_id, hash);
        }
    );


    return {
        async waitTxHashPolkadot(id: string): Promise<string> {
            const hash = polkadot_event_buf.get(id);
            if (hash !== undefined) {
                polkadot_event_buf.delete(id);
                return hash;
            }

            const hashP: Promise<string> = new Promise(r => {
                polkadot_awaiters['id'] = r;
            });

            return await hashP;
        },
        async waitTxHashElrond(id: string): Promise<string> {
            const hash = elrond_event_buf.get(id);
            if (hash !== undefined) {
                elrond_event_buf.delete(id);
                return hash;
            }

            const hashP: Promise<string> = new Promise(r => {
                elrond_awaiters['id'] = r;
            });

            return await hashP;
        }
    }
}