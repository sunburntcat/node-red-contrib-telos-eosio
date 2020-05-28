const { Api, JsonRpc, RpcError } = require('eosjs');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');      // development only
const fetch = require('node-fetch');                                    // node only; not needed in browsers
const { TextEncoder, TextDecoder } = require('util');                   // node only; native TextEncoder/Decoder

var fs = require('fs');

module.exports = function(RED) {
    function TelosTransferNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;

        //node.blockchain = config.blockchain; // Don't need. Chain ID should be enough
        node.chainid = config.chainid;
        if (config.endpoint == "other") {
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

        // Do a test of the blockchain
        /*
        (async () => {
            const resultJson = await rpc.get_block(1); //get the first block
            result = JSON.stringify(resultJson, null, 2);


            setTimeout(function(){ console.log("Here's your json: \n" + result); }, 2000);
        })();
        */

        node.on('input', function(msg) {
            msg.payload = msg.payload.toLowerCase();
            node.send(msg);
        });
    }
    RED.nodes.registerType("telos-transfer",TelosTransferNode);
};
