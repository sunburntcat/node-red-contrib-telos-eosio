const { Api, JsonRpc, RpcError } = require('eosjs');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');      // development only

const fetch = require('node-fetch');                                    // node only; not needed in browsers
const { TextEncoder, TextDecoder } = require('util');                   // node only; native TextEncoder/Decoder

const fs = require('fs');

module.exports = function(RED) {
    function TelosPushNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;

        //node.blockchain = config.blockchain; // Don't need. Chain ID should be enough
        node.chainid = config.chainid;
        if (config.endpoint === "other") {
            node.endpoint = config.customendpoint;
        } else {
            node.endpoint = config.endpoint;
        }
        node.privkey = fs.readFileSync(config.privkey, 'utf8').trim();
        node.inputtype = config.inputtype;

        // The following is for debugging. NEEDS TO BE REMOVED
        console.log("Chain ID: " + node.chainid);
        console.log("Endpoint: " + node.endpoint);
        console.log("Private key: " + node.privkey);

        // Initialize eojs API
        const signatureProvider = new JsSignatureProvider([node.privkey]);
        const rpc = new JsonRpc(node.endpoint, { fetch });
        const api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });

        // Test that chain ID is correct
        (async () => {
            try {
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
                // We first build and push transaction to our endpoit

                (async () => {
                    try {
                        //1) determine the account name from current node information
                        //     Rule: First 12 characters, but for every digit, we do MOD(digit,5)+1 so all numbers are 1 to 5
                        //2) If account doesn't exist,
                        //     Create account with RAM and delegated CPU/NET
                        //        https://developers.eos.io/manuals/eosjs/v21.0/how-to-guides/how-to-create-an-account
                        //3) If eosio table on the contract doesn't exist,
                        //     Create new eosio table
                        //4) Loop over each payload object variable
                        //     Check that each variable is present on the eosio table. Remember that columns can't be
                        //        added to eosio table without deleting all data on the table first
                        //     Append the data as a new row in the table

                        if (!result.processed.error_code) { // If endpoint didn't give error
                            console.log("Trx: "+result.transaction_id)
                        } else {
                            console.log(result);
                        }
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
