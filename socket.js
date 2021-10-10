"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.txnSocketHelper = void 0;
const socket_io_client_1 = require("socket.io-client");
function txResBuf() {
    const inner = {};
    const requireChain = (chain_id) => {
        if (inner[chain_id] === undefined) {
            inner[chain_id] = {};
        }
    };
    return {
        getResolver(chain_id, action_id) {
            var _a;
            requireChain(chain_id);
            return (_a = inner[chain_id][action_id]) === null || _a === void 0 ? void 0 : _a.resolve;
        },
        setResolver(chain_id, action_id, resolver) {
            requireChain(chain_id);
            inner[chain_id][action_id] = { resolve: resolver };
        },
        getEventRes(chain_id, action_id) {
            var _a;
            requireChain(chain_id);
            return (_a = inner[chain_id][action_id]) === null || _a === void 0 ? void 0 : _a.event_res;
        },
        setEventRes(chain_id, action_id, res) {
            requireChain(chain_id);
            inner[chain_id][action_id] = { event_res: res };
        },
        unsetAction(chain_id, action_id) {
            requireChain(chain_id);
            inner[chain_id][action_id] = undefined;
        },
    };
}
/**
 * Create a [[TxnSocketHelper]]
 *
 * @param uri  URI of the Migration-Validator socket api
 * @param options  socket.io options
 */
function txnSocketHelper(uri, options) {
    const socket = (0, socket_io_client_1.io)(uri, options);
    const buf = txResBuf();
    function add_event(chain, id, hash) {
        const resolve = buf.getResolver(chain, id);
        if (resolve === undefined) {
            buf.setEventRes(chain, id, hash);
            return;
        }
        resolve(hash);
    }
    socket.on("tx_executed_event", (chain, action_id, hash) => {
        add_event(chain, action_id, hash);
    });
    return {
        async waitTxHash(chain, action_id) {
            const hash = buf.getEventRes(chain, action_id);
            if (hash !== undefined) {
                buf.unsetAction(chain, action_id);
                return hash;
            }
            const hashP = new Promise((r) => {
                buf.setResolver(chain, action_id, r);
            });
            return await hashP;
        },
    };
}
exports.txnSocketHelper = txnSocketHelper;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic29ja2V0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3NvY2tldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSx1REFBcUU7QUEyQ3JFLFNBQVMsUUFBUTtJQUNmLE1BQU0sS0FBSyxHQUFrQixFQUFFLENBQUM7SUFFaEMsTUFBTSxZQUFZLEdBQUcsQ0FBQyxRQUFnQixFQUFFLEVBQUU7UUFDeEMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssU0FBUyxFQUFFO1lBQ2pDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLENBQUM7U0FDdEI7SUFDSCxDQUFDLENBQUM7SUFFRixPQUFPO1FBQ0wsV0FBVyxDQUNULFFBQWdCLEVBQ2hCLFNBQWlCOztZQUVqQixZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7WUFFdkIsT0FBTyxNQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsMENBQUUsT0FBTyxDQUFDO1FBQzdDLENBQUM7UUFDRCxXQUFXLENBQ1QsUUFBZ0IsRUFDaEIsU0FBaUIsRUFDakIsUUFBZ0M7WUFFaEMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBRXZCLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsQ0FBQztRQUNyRCxDQUFDO1FBQ0QsV0FBVyxDQUFDLFFBQWdCLEVBQUUsU0FBaUI7O1lBQzdDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUV2QixPQUFPLE1BQUEsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQywwQ0FBRSxTQUFTLENBQUM7UUFDL0MsQ0FBQztRQUNELFdBQVcsQ0FBQyxRQUFnQixFQUFFLFNBQWlCLEVBQUUsR0FBVztZQUMxRCxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7WUFFdkIsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDO1FBQ2xELENBQUM7UUFDRCxXQUFXLENBQUMsUUFBZ0IsRUFBRSxTQUFpQjtZQUM3QyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7WUFFdkIsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLFNBQVMsQ0FBQztRQUN6QyxDQUFDO0tBQ0YsQ0FBQztBQUNKLENBQUM7QUFFRDs7Ozs7R0FLRztBQUNILFNBQWdCLGVBQWUsQ0FDN0IsR0FBVyxFQUNYLE9BQWlEO0lBRWpELE1BQU0sTUFBTSxHQUFHLElBQUEscUJBQUUsRUFBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDaEMsTUFBTSxHQUFHLEdBQWEsUUFBUSxFQUFFLENBQUM7SUFFakMsU0FBUyxTQUFTLENBQUMsS0FBYSxFQUFFLEVBQVUsRUFBRSxJQUFZO1FBQ3hELE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzNDLElBQUksT0FBTyxLQUFLLFNBQVMsRUFBRTtZQUN6QixHQUFHLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDakMsT0FBTztTQUNSO1FBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2hCLENBQUM7SUFFRCxNQUFNLENBQUMsRUFBRSxDQUNQLG1CQUFtQixFQUNuQixDQUFDLEtBQWEsRUFBRSxTQUFpQixFQUFFLElBQVksRUFBRSxFQUFFO1FBQ2pELFNBQVMsQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3BDLENBQUMsQ0FDRixDQUFDO0lBRUYsT0FBTztRQUNMLEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBYSxFQUFFLFNBQWlCO1lBQy9DLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQy9DLElBQUksSUFBSSxLQUFLLFNBQVMsRUFBRTtnQkFDdEIsR0FBRyxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQ2xDLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCxNQUFNLEtBQUssR0FBb0IsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDL0MsR0FBRyxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3ZDLENBQUMsQ0FBQyxDQUFDO1lBRUgsT0FBTyxNQUFNLEtBQUssQ0FBQztRQUNyQixDQUFDO0tBQ0YsQ0FBQztBQUNKLENBQUM7QUF0Q0QsMENBc0NDIn0=