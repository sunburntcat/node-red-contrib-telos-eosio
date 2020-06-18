
var _ = require('lodash');

const trans = require('./transaction_modules.js');

module.exports = {

    prepare_account: async function (account, fs, api, rpc, ecc, RpcError, Serialize) {
        /*
        Returns the following status:
            0) Account is ready
                account name exists, has correct ABI deployed
            1) Account exists, but doens't have enough TLOS balance to buy RAM and deploy contract
            2) Account has a different contract already applied

            NOTE: CPU/NET resources will not be handled here. Instead they are checked every telos-push inject.
         */

        try { // First check if account exists
            const accountInfo = await rpc.get_account(account);
            const accountAbi = await rpc.get_abi(account);

            if ("abi" in accountAbi) { // Account already has contract applied.

                // Read the ABI file found inside the repository
                const repoAbi = JSON.parse(fs.readFileSync('telos-push/contract_code/noderedtelos.abi', 'utf8'));

                // Check if ABI's properties are different from the repository's ABI
                if (!_.isEqual(accountAbi.abi.actions, repoAbi.actions) ||
                    !_.isEqual(accountAbi.abi.tables, repoAbi.tables) ||
                    !_.isEqual(accountAbi.abi.structs, repoAbi.structs)
                ) {
                    // Contract is not one we recognize.
                    return 2;
                } else {
                    return 0; // Account has correct ABI contract
                }
            } else { // There is no contract applied yet


                // Check if we have enough RAM to apply a contract on the account
                if (accountInfo.ram_quota - accountInfo.ram_usage < 200000) {
                    console.log("Converting Telos to RAM for smart contract deployment.");
                    if (trans.buy_ram(account, account, 220000, api) !== 0) { // Contract deployment requires about 195KB RAM
                        return 1; // Account doesn't have enough TLOS/RAM for contract deployment
                    } else {
                        console.log("RAM Quota looks good for contract deployment.");
                    }
                } else {
                    console.log("RAM Quota looks good for contract deployment.");
                }

                // Convert ABI and WASM into hex strings
                const wasmFilePath = 'telos-push/contract_code/noderedtelos.wasm';
                const abiFilePath = 'telos-push/contract_code/noderedtelos.abi';

                const wasmHexString = fs.readFileSync(wasmFilePath).toString('hex');

                const buffer = new Serialize.SerialBuffer({
                    textEncoder: api.textEncoder,
                    textDecoder: api.textDecoder,
                });

                let abiJSON = JSON.parse(fs.readFileSync(abiFilePath, 'utf8'));
                const abiDefinitions = api.abiTypes.get('abi_def');

                abiJSON = abiDefinitions.fields.reduce(
                    (acc, { name: fieldName }) =>
                        Object.assign(acc, { [fieldName]: acc[fieldName] || [] }),
                    abiJSON
                );
                abiDefinitions.serialize(buffer, abiJSON);
                const serializedAbiHexString = Buffer.from(buffer.asUint8Array()).toString('hex');

                // Create actions payload
                var trx = {};
                trx.actions = [{},{}];
                trx.actions[0].account = "eosio";
                trx.actions[0].name = "setcode";
                trx.actions[0].authorization = [{
                    "actor": account ,
                    "permission": "active"
                }];
                trx.actions[0].data = {
                    "account": account,
                    "vmtype": "0",
                    "vmversion": "0",
                    "code": wasmHexString
                };
                trx.actions[1].account = "eosio";
                trx.actions[1].name = "setabi";
                trx.actions[1].authorization = [{
                    "actor": account ,
                    "permission": "active"
                }];
                trx.actions[1].data = {
                    "account": account,
                    "abi": serializedAbiHexString
                };

                const tapos = {};
                tapos.blocksBehind = 3;
                tapos.expireSeconds = 30;

                try {
                    msg = "Deploying eosio contract tables to your account";
                    console.log(msg);

                    // Push the whole transaction to the blockchain
                    const result = await api.transact(trx, tapos);
                    if (!result.processed.error_code) { // If endpoint didn't give error
                        console.log("Trx: "+result.transaction_id);
                        return 0;
                    } else {
                        console.log(result);
                    }
                } catch (e) {
                    console.log(e); // Print any endpoint connection errors
                }

            }
        } catch (e) {
            if (e instanceof RpcError) // Should specify error due to 'unknown key'
            {
                return 3; // Account doesn't exist
            }
        }

        //`console.log(accountInfo.permissions[0].required_auth);

    },

    parse_injection: function (node, msg, api) {

        const acctName = node.parentName;
        const tableIndex = node.id;

        if (node.inputtype === 'action'){
            // We first build and push transaction to our endpoint

            (async () => {
                try {


                    /*
                    if (!result.processed.error_code) { // If endpoint didn't give error
                        console.log("Trx: "+result.transaction_id)
                    } else {
                        console.log(result);
                    }
                    */
                } catch (e) {
                    console.log(e);// Print any errors
                } // end try/catch
            })(); // end asynch
        } else if (node.inputtype === 'trx') {
            // Suggestion for eosiot on-device signatures...
            //   https://github.com/EOSIO/eosjs/blob/master/src/eosjs-api.ts
            //     Function at Line 257 allows us to use the following function:
            //        api.pushSignedTransaction
            //let pushTransactionArgs: PushTransactionArgs  = {
            let pushTransactionArgs = {
                transaction: msg.payload.transaction, // Should be uint8array
                signatures: [msg.payload.signature]   // Should be string beginning with SIG_K
            };
            (async () => {
                try {
                    const result = await api.pushSignedTransaction( pushTransactionArgs );
                    if (!result.processed.error_code) { // If endpoint didn't give error
                        console.log("Trx: "+result.transaction_id)
                    } else {
                        console.log(result);
                    }
                } catch (e) {
                    console.log(e);// Print any errors
                }       // end try/catch
            })();       // end asynch
        }               // end if (inputtype)
        node.send(msg); // continue sending message through to outputs if necessary

    },



};

