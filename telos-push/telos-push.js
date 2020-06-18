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
        //node.parentname = 'heztcmzsguge';
        node.parentname = 'heztcmzsgugf';

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

            // Compare account's ABI to the one found in the repo
            try {
                const accountAbi = await rpc.get_abi(node.parentname);

                if ("abi" in accountAbi) { // Contract exists

                    // Read the ABI file found inside the repository
                    const repoAbi = JSON.parse(fs.readFileSync('telos-push/contract_code/noderedtelos.abi', 'utf8'));

                    // Check if ABI's properties are different from the repository's ABI
                    if (!_.isEqual(accountAbi.abi.actions, repoAbi.actions) ||
                        !_.isEqual(accountAbi.abi.tables, repoAbi.tables) ||
                        !_.isEqual(accountAbi.abi.structs, repoAbi.structs)
                    ) {
                        // Contract is not one we recognize.
                        console.log("A contract with a different ABI already exists on the account.");
                        console.log("Please input a different account name.");
                        return;
                    } else { /* The contract has the right ABI */}

                } else { // There is no contract applied yet

                    // Check if we have enough RAM to apply a contract on the account
                    if (accountInfo.ram_quota - accountInfo.ram_usage < 200000) {
                        if (trans.buy_ram(account, account, 220000, api) !== 0) { // Contract deployment requires about 195KB RAM
                            console.log("TLOS balance too low for contract deployment");
                            return;
                        } else { /* RAM purchase successful */ }
                    } else { /* Have enough RAM to deploy the contract */ }

                    // Convert ABI and WASM into hex strings
                    const wasmFilePath = 'telos-push/contract_code/noderedtelos.wasm';
                    const wasmHexString = fs.readFileSync(wasmFilePath).toString('hex');
                    const abiFilePath = 'telos-push/contract_code/noderedtelos.abi';
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

                    trans.deploy_contract(account, wasmHexString, serializedAbiHexString, api);

                }
            } catch (e) {
                if (e instanceof RpcError) // Should specify error due to 'unknown key'
                {
                    console.log("Unexpected RPC error when checking account's contract.");
                    return;
                }
            }

            console.log("Node looks good.");

            node.on('input', function(msg){
                helper.parse_injection(node,msg,api);
            });

            /*
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
            */
        })(); // End of async
    }                       // end TelosTransactNode definition
    RED.nodes.registerType("telos-push",TelosPushNode);
};
