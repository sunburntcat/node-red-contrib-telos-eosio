const { Api, JsonRpc, RpcError } = require('eosjs');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');      // development only
const ecc = require('eosjs-ecc');

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
        node.name = config.name;
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
        //const signatureProvider = new JsSignatureProvider([node.privkey]);
        const signatureProvider = new JsSignatureProvider(privkeys);
        const rpc = new JsonRpc(node.endpoint, {fetch});
        const api = new Api({
            rpc,
            signatureProvider,
            textDecoder: new TextDecoder(),
            textEncoder: new TextEncoder()
        });

        (async () => {
            // Check that account exists

            if (node.contract !== "") {  // If contract is given in config

                try {
                    // Get account info
                    await rpc.get_account(node.contract);
                } catch (e) {
                    //if (e.json.error.details[0].message.includes("unknown key"))
                    if (e instanceof RpcError) {
                        console.log("Node-RED error. Contract " +
                            node.contract + " doesn't exist on " + config.blockchain + ".");
                        return; // Exit without sending message
                    }
                }

                if (node.actionname !== "") { // If action is given in the config
                    let contractName = node.contract;
                    let actionName = node.actionname;

                    let actionArgs = [];

                    let accountAbi = await rpc.get_abi(contractName);

                    // Get a list of all the action's arguments
                    for (var i = 0; i < accountAbi.abi.structs.length; i++) {
                        if (accountAbi.abi.structs[i].name === actionName) {
                            for (var j = 0; j < accountAbi.abi.structs[i].fields.length; j++) {
                                actionArgs.push(accountAbi.abi.structs[i].fields[j].name);
                            }
                            break; // Break out of loop for speed
                        }
                    }

                } // end check for action in config
            } // end check for contract in config

            //checkPermission(rpc, node,"active").then();

            console.log("Node looks good. Connecting node to injection.");
            node.on('input', async function (msg) {
                let contractName, actionName;

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

                try {
                    await trans.payload_to_blockchain(contractName, actionName, msg.payload, rpc, api);
                    node.send(msg); // continue sending message through to outputs
                } catch (e) {
                    console.log("API Error while trying to send transaction.");
                    console.log(e.message); // Print any errors

                    let message = e.message;
                    let tmp = message.indexOf(':');
                    this.error(message.substr(tmp+2),msg); // Forward any errors to user
                }

            });
        })(); // End of async


    }   // end TelosPushNode definition

    // NOT Tested. Function will need a lot of work
    async function checkPermission( rpc, contractName, pubkey, permName )
    {
        let accountInfo;

        accountInfo = await rpc.get_account(contractName);

        // Loop through the various permissions
        for (var i=0; i < accountInfo.permissions.length; i++){
            if (accountInfo.permissions[i].perm_name === permName)
            {
                const authKeys = accountInfo.permissions[i].required_auth.keys;
                if (authKeys.length > 1 || authKeys[0].key !== pubkey) {
                    throw "The account key you provided doesn't match the " + permName + " permission";
                }
            }
        }

    }

    RED.nodes.registerType("eosio-push",EosioPushNode);

};

