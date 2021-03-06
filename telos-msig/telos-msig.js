const { Api, JsonRpc, RpcError, Serialize } = require('eosjs');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');      // development only
const ecc = require('eosjs-ecc');

const fetch = require('node-fetch');                                    // node only; not needed in browsers
const { TextEncoder, TextDecoder } = require('util');                   // node only; native TextEncoder/Decoder

const fs = require('fs');
var _ = require('lodash');

const trans = require('./lib/transaction_modules.js');

module.exports = function(RED) {

    function TelosMsigNode(config) {
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
        node.pubkey = ecc.privateToPublic(node.privkey);


        node.inputtype = config.inputtype;
        node.subaccount = config.name;

        // Initialize eojs API
        const signatureProvider = new JsSignatureProvider([node.privkey]);
        const rpc = new JsonRpc(node.endpoint, { fetch });
        const api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });

        let connect = true;

        (async () => {

            // Test that chain ID is correct
            try {
                // UNCOMMENT FOLLOWING 2 LINES
                const info = await rpc.get_info(); //get information from http endpoint
            } catch (e) {
                if (e instanceof RpcError) // Should specify error due to 'unknown key'
                {
                    console.log("Unexpected RPC error when checking account's contract.");
                    connect = false;
                }
            }

            if (connect){
                console.log("Node looks good. Connecting node to injection.");
                // Function that runs every time data is injected
                node.on('input', function(msg){

                    const tapos = {};
                    tapos.blocksBehind = 3;
                    tapos.expireSeconds = 30;

                    // Add location transaction

                    var trx = {};
                    trx.actions = [{}]; // {msig approve}

                    // Approve own proposal
                    trx.actions[0].account = 'eosio.msig';
                    trx.actions[0].name = 'approve';
                    trx.actions[0].authorization = [{'actor': 'noderedtelos', 'permission': 'active'}];
                    trx.actions[0].data = {'proposer':'weatherapppp',
                        'proposal_name': node.subaccount,
                        'level': {'actor': 'noderedtelos', 'permission': 'active'}};

                    (async () => {
                        try {
                            // Approve the msig
                            console.log("Approving msig...");
                            await api.transact(trx, tapos);

                            // Execute the msig
                            await trans.exectute_msig('noderedtelos', 'weatherapppp', node.subaccount, api);

                            // Add separate transaction for iotsetlaunch
                            trx.actions[0].account = node.subaccount;
                            trx.actions[0].name = 'iotsetlaunch';
                            trx.actions[0].authorization = [{'actor': 'noderedtelos', 'permission': 'active'}];
                            trx.actions[0].data = {};
                            trx.actions[0].data.lat = 0.0;
                            trx.actions[0].data.lon = 0.0;
                            //trx.actions[0].data.pressure = msg.payload.p;
                            trx.actions[0].data.pressure = 995.0;
                            trx.actions[0].data.surf_pressure_hpa = 996.0;
                            trx.actions[0].data.reward_amount = 1000; // 1000 TLOS
                            console.log("Adding launch data...");
                            await api.transact(trx, tapos);

                        } catch (e) {
                            console.log(e);
                        }
                    })();


                    node.send(msg); // continue sending message through to outputs if necessary
                });
            }

        })(); // End of async

    }                       // end TelosTransactNode definition

    RED.nodes.registerType("telos-msig",TelosMsigNode);
};
