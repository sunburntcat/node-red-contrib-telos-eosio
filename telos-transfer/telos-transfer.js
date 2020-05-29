const { Api, JsonRpc, RpcError } = require('eosjs');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');      // development only
const fetch = require('node-fetch');                                    // node only; not needed in browsers
const { TextEncoder, TextDecoder } = require('util');                   // node only; native TextEncoder/Decoder

const fs = require('fs');

module.exports = function(RED) {
    function TelosTransferNode(config) {
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
            (async () => {
                try {
                    const result = await api.transact({
                        actions: [{
                            account: 'eosio.token',
                            name: 'transfer',
                            authorization: [{
                                actor: msg.payload.from,
                                permission: 'active',
                            }],
                            data: msg.payload
                        }]
                    }, {
                        blocksBehind: 3,
                        expireSeconds: 30
                    }); // end api.transact
                    if (!result.processed.error_code) { // If endpoint didn't give error
                        console.log("Trx: "+result.transaction_id)
                    } else {
                        console.log(result);
                    }
                } catch (e) {
                    console.log(e);// Print any errors
                }           // end try/catch
            })();           // end asynch
        });                 // end node.on(input)
    }                       // end TelosTransferNode definition
    RED.nodes.registerType("telos-transfer",TelosTransferNode);
};
