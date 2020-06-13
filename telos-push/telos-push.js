const { Api, JsonRpc, RpcError } = require('eosjs');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');      // development only

const fetch = require('node-fetch');                                    // node only; not needed in browsers
const { TextEncoder, TextDecoder } = require('util');                   // node only; native TextEncoder/Decoder

const fs = require('fs');

const helper = require('../lib/helper.js'); // Import functions

module.exports = function(RED) {
    function TelosPushNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;

        if (1){ // REMOVE. Replace with check to see if user provided name
            node.name = helper.generate_rand_name();
        }

        //node.blockchain = config.blockchain; // Don't need. Chain ID should be enough
        node.chainid = config.chainid;
        if (config.endpoint === "other") {
            node.endpoint = config.customendpoint;
        } else {
            node.endpoint = config.endpoint;
        }
        node.privkey = fs.readFileSync(config.privkey, 'utf8').trim();
        node.inputtype = config.inputtype;

        // Initialize eojs API
        const signatureProvider = new JsSignatureProvider([node.privkey]);
        const rpc = new JsonRpc(node.endpoint, { fetch });
        const api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });

        // Test that chain ID is correct
        (async () => {
            try {
                // UNCOMMENT FOLLOWING 2 LINES
                const info = await rpc.get_info(); //get information from http endpoint
                if (info.chain_id === node.chainid) { // check that chain id matches endpoint response
                    console.log("Blockchain endpoint connection successfull.");
                } else {
                    console.log("Are you sure you are on the right blockchain?");
                    console.log("The http endpoint you provided doesn't match the chain ID");
                    console.log("Your provided chain ID: " + node.chainid);
                    console.log("RPC response: " + info.chain_id);
                }
            } catch (e) {
                console.log(e); // Print any timeout errors
            }

        })();

        // This function defines what we do with out inputs
        node.on('input', function(msg) {

            if (node.inputtype === 'action'){
                // We first build and push transaction to our endpoint

                (async () => {
                    try {


                        switch (await helper.check_account_status(node.name, rpc, RpcError)) {
                            case 5:
                                console.log("New account name "+node.name+" is free on the blockchain.");
                                helper.create_new_account(node.name, api);
                                // Create new eosio table with given payload inputs
                                //   User can't be expected to compile their own ABI file, as they would have to install the CDT
                                //   Suggest creating static ABI and WASM files using EOS Studio with two tables
                                //      1) Names of the fields (matches payload inputs; possibly char* )
                                //      2) Data for 10 columns (with NaN for missing fields)
                                //   This ABI and WASM file can be deployed to any account using the following reference:
                                //     https://developers.eos.io/manuals/eosjs/v21.0/how-to-guides/how-to-deploy-a-smart-contract
                                break;
                            case 4:
                                console.log("Account doesn't have correct permission.");
                                // NOTE: Likely means user wants to put table on an account they already own
                                // Add new eosio permission to account
                                //    If it doesn't work, have user choose random name or specify different one
                                // Create new eosio table with given payload inputs
                                break;
                            case 3:
                                console.log("Account has no eosio table.");
                                // Create new eosio table with the given payload inputs
                                break;
                            case 2:
                                console.log("Account's eosio table doesn't have the right columns.");
                                // Store off the entire table (onto demux?)
                                // Delete all the data on the table
                                // Create new eosio table with the given payload inputs
                                // Add back the rows that were deleted with NaNs in the new columns
                                break;
                            case 1:
                                console.log("Account is ready to go.");
                                // Append to current eosio table
                        }

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
        });                 // end node.on(input)
    }                       // end TelosTransactNode definition
    RED.nodes.registerType("telos-push",TelosPushNode);
};
