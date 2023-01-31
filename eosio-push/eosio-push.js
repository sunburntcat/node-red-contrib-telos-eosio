const { Api, JsonRpc, RpcError } = require('eosjs');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');      // development only

const fetch = require('node-fetch');                                    // node only; not needed in browsers
const { TextEncoder, TextDecoder } = require('util');                   // node only; native TextEncoder/Decoder

const fs = require('fs');
var _ = require('lodash');

const trans = require('./lib/transaction_modules.js');

module.exports = function(RED) {
    function EosioPushNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        //node.blockchain = config.blockchain; // Don't need. Chain ID should be enough
        node.chainid = config.chainid;
        if (config.endpoint === "other") {
            node.endpoint = config.customendpoint;
        } else {
            node.endpoint = config.endpoint;
        }

        // Store private key as local variable
        try {
            // Read file delimited by newline characters
            var data = fs.readFileSync(config.privkeyfile, 'utf8');
            var privkeys = data.trim().split(/\r?\n/);

            // Convert first priv key to public if needed
            ///node.pubkey = ecc.privateToPublic(privkeys[0]);
        } catch (e) {
           throw e;
        }

        node.inputtype = config.inputtype;
        node.contract = config.contract;
        node.actionname = config.actionname;

        // Initialize eojs API
        const signatureProvider = new JsSignatureProvider(privkeys);
        const rpc = new JsonRpc(node.endpoint, {fetch});
        const api = new Api({
            rpc,
            signatureProvider,
            textDecoder: new TextDecoder(),
            textEncoder: new TextEncoder()
        });

        (async () => {
            // First check that endpoint is working
            try {
                await rpc.get_info();
                console.log("Blockchain RPC connection successful.")
            } catch (e) {
                if (e instanceof RpcError)
                {
                    console.log("Blockchain endpoint not available.");
                    return;
                }
            }

            // Next check that account exists
            if (node.contract !== "") {  // If contract is given in config

                let accountAbi;
                try {
                    //accountAbi = await rpc.get_abi(node.contract);
                } catch (e) {
                    console.log("Contract not found on current blockchain.");
                    console.log(e);
                    return;
                }

            } // end check for contract in config

            console.log("Node looks good. Connecting node to injection.");
            node.on('input', async function (msg) {

                // Handle pre-signed transaction
                if (node.inputtype === 'trx') {

                    let trx = msg.payload.packed_trx;
                    let sigs = msg.payload.signatures;

                    await trans.push_presigned_trx(trx, sigs, api);
                    node.send(msg); // continue sending message through to outputs
                }
                else {

                    let contractName;
                    let actionName;
                    let authorization = {};

                    if (node.actionname === "") {  // If left blank in the settings
                        actionName = msg.action;
                    } else {
                        actionName = node.actionname;
                    }

                    if (node.contract === "") {  // If left blank in the settings
                        contractName = msg.contract;
                    } else {
                        contractName = node.contract;
                    }

                    if ( msg.hasOwnProperty('authorization') ) {  // If left blank in the settings
                        authorization = msg.authorization;
                    } else {
                        authorization.actor = contractName;
                        if (config.permission === "")
                            authorization.permission = "active";
                        else
                            authorization.permission = config.permission;
                    }

                    try {
                        await trans.payload_to_blockchain(contractName,
                                                        actionName,
                                                        authorization,
                                                        msg.payload,
                                                        rpc,
                                                        api);
                        node.send(msg); // continue sending message through to outputs
                    } catch (e) {
                        console.log("API Error while trying to send transaction.");
                        console.log(e.message); // Print any errors

                        let message = e.message;
                        let tmp = message.indexOf(':');
                        this.error(message.substr(tmp+1),msg); // Forward any errors to user
                    }
                } // end check for inputtype (trx vs regular payload)

            });
        })(); // End of async


    }   // end EosioPushNode definition

    RED.nodes.registerType("eosio-push",EosioPushNode);

};

