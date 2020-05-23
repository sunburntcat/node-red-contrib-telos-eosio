const { Api, JsonRpc, RpcError } = require('eosjs');

module.exports = function(RED) {
    function TelosTransferNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        node.on('input', function(msg) {
            msg.payload = msg.payload.toLowerCase();
            node.send(msg);
        });
    }
    RED.nodes.registerType("telos-transfer",TelosTransferNode);
};
