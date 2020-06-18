const { Api, JsonRpc, RpcError, Serialize } = require('eosjs');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');      // development only
const ecc = require('eosjs-ecc');

const fetch = require('node-fetch');                                    // node only; not needed in browsers
const { TextEncoder, TextDecoder } = require('util');                   // node only; native TextEncoder/Decoder

const fs = require('fs');

const helper = require('./lib/helper.js'); // Import functions

module.exports = function(RED) {
    function TelosPushNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;

        //if (1){ // REMOVE. Replace with check to see if user provided name
        //    node.name = helper.generate_rand_name();
        //}

        //node.blockchain = config.blockchain; // Don't need. Chain ID should be enough
        node.chainid = config.chainid;
        if (config.endpoint === "other") {
            node.endpoint = config.customendpoint;
        } else {
            node.endpoint = config.endpoint;
        }
        node.privkey = fs.readFileSync(config.privkey, 'utf8').trim();
        node.pubkey = ecc.privateToPublic(node.privkey);

        node.inputtype = config.inputtype;
        //node.parentname = 'noderedtelos';
        node.parentname = 'heztcmzsguge';
        //node.parentname = 'heztcmzsgugf';

        // Initialize eojs API
        const signatureProvider = new JsSignatureProvider([node.privkey]);
        const rpc = new JsonRpc(node.endpoint, { fetch });
        const api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });

        (async () => {
            // Test that chain ID is correct
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
                    return;
                }
            } catch (e) {
                console.log(e); // Print any timeout errors
            }

            // Check that account exists and fits private key
            try {
                // Get account info
                const accountInfo = await rpc.get_account(node.parentname);

                // Loop through the various permissions
                for (var i=0; i < accountInfo.permissions.length; i++){
                    if (accountInfo.permissions[i].perm_name === 'active')
                    {
                        const authKeys = accountInfo.permissions[i].required_auth.keys;
                        if (authKeys.length > 1 || authKeys[0].key !== node.pubkey) {
                           console.log("The account key you provided doesn't match the 'active' permission");
                           return;
                        }
                    }
                }
            } catch (e) {
                if (e.json.error.details[0].message.includes("unknown key"))
                {
                    console.log("The provided account name "+node.parentname+" doesn't seem to exist.");
                    return;
                }

            }

            // Get account details and prepare for data injections
            switch (await helper.prepare_account(node.parentname, fs, api, rpc, ecc, RpcError, Serialize)) {
                case 2:
                    console.log("Sorry, your Telos account already has a smart contract deployed to it.");
                    console.log("Please create and/or enter a new account.");
                    return;
                case 1:
                    console.log("Sorry, there was an issue converting Telos to RAM.");
                    console.log("Ensure your account balance is adequate.");
                    return;
                case 0:
                    console.log("Account suitable for data write.");
                    node.on('input', function(msg) {
                        helper.parse_injection(node,msg,api);
                    });
                    return;
            }
        })();
    }                       // end TelosTransactNode definition
    RED.nodes.registerType("telos-push",TelosPushNode);
};
