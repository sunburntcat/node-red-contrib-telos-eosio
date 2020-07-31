
// Pushes transaction to the blockchain
async function push_trx(trx, api) {

    const tapos = {};
    tapos.blocksBehind = 3;
    tapos.expireSeconds = 30;

    try {
        const result = await api.transact(trx, tapos);
        if (!result.processed.error_code) { // If endpoint didn't give error
            console.log("Trx: " + result.transaction_id);
            return 0;
        } else {
            console.log("API Endpoint gave the following eosio-based error:");
            console.log(result);
            return 1;
        }
    } catch (e) {
        console.log("API Error while trying to send transaction.");
        console.log(e); // Print any errors
        console.log("Additional details shown below:");
        console.log(e.json.error.details);
        return 1;
    }

}

async function push_presigned_trx(trx, signature) {
    /*
     NOTE:
     trx is uint8array
     signature is a string beginning with SIG_K

     Suggestion for eosiot on-device signatures...
       https://github.com/EOSIO/eosjs/blob/master/src/eosjs-api.ts
         Function at Line 257 allows us to use the following function:
            api.pushSignedTransaction
    */
    try {
        const result = await api.pushSignedTransaction(
            {
                "transaction": trx,
                "signatures": [signature]
            } );
        if (!result.processed.error_code) { // If endpoint didn't give error
            console.log("Trx: " + result.transaction_id);
            return 0;
        } else {
            console.log("API Endpoint gave the following eosio-based error:");
            console.log(result);
            return 1;
        }
    } catch (e) {
        console.log("API Error while trying to send transaction.");
        console.log(e);
        console.log("Additional details shown below:");
        console.log(e.json.error.details);
        return 1;
    }

}


module.exports = {


    create_new_account: async function (parent, name, api) {

        let num_bytes = 300000;

        // New account data is complicated so we will build it first
        const newAcctData = {};
        newAcctData.creator = parent;
        newAcctData.name = name;
        newAcctData.owner = {};
        newAcctData.owner.threshold = 1;
        newAcctData.owner.keys = [{
            'key':'EOS5a6L2rHrNoZUwfhvQvuUa6syAZqifcTcj8nG9cEhi6uqSRH31f',
            'weight':1  }];
        newAcctData.owner.waits = [];
        newAcctData.owner.accounts = [];
        newAcctData.owner.accounts = [{}];
        newAcctData.owner.accounts[0].weight = 1;
        newAcctData.owner.accounts[0].permission = {};
        newAcctData.owner.accounts[0].permission.actor = name;
        newAcctData.owner.accounts[0].permission.permission = "eosio.code";
        newAcctData.active= newAcctData.owner;

        //Build the new account action
        const newAcctAction = {};
        newAcctAction.account = "eosio";
        newAcctAction.name = "newaccount";
        newAcctAction.authorization = [{}];
        newAcctAction.authorization[0].actor = parent;
        newAcctAction.authorization[0].permission = "active";
        newAcctAction.data = newAcctData;

        // Buy a some RAM for the account
        const buyRamAction = {};
        buyRamAction.account = "eosio";
        buyRamAction.name = "buyrambytes";
        buyRamAction.authorization = [{}];
        buyRamAction.authorization[0].actor = parent;
        buyRamAction.authorization[0].permission = "active";
        buyRamAction.data = {};
        buyRamAction.data.payer = parent;
        buyRamAction.data.receiver = name;
        buyRamAction.data.bytes = num_bytes;

        // Delegate CPU and NET to the account
        const delegateBwAction = {};
        delegateBwAction.account = "eosio";
        delegateBwAction.name = "delegatebw";
        delegateBwAction.authorization = [{}];
        delegateBwAction.authorization[0].actor = parent;
        delegateBwAction.authorization[0].permission = "active";
        delegateBwAction.data = {};
        delegateBwAction.data.from = "noderedtelos";
        delegateBwAction.data.receiver = name;
        delegateBwAction.data.stake_net_quantity = "5.0000 TLOS";
        delegateBwAction.data.stake_cpu_quantity = "5.0000 TLOS";
        delegateBwAction.data.transfer = false;

        const trx = {};
        trx.actions = [newAcctAction, buyRamAction, delegateBwAction];

        msg = "Creating new eosio account for " + name + " with "+ num_bytes + " bytes of RAM, " +
            "5 TLOS for CPU, and 5 TLOS for NET...";
        console.log(msg);
        return push_trx(trx, api);

    },

    buy_ram: async function (payer, name, amountBytes, api) {

        // Buy a some RAM for the account
        const buyRamAction = {};
        buyRamAction.account = "eosio";
        buyRamAction.name = "buyrambytes";
        buyRamAction.authorization = [{}];
        buyRamAction.authorization[0].actor = payer;
        buyRamAction.authorization[0].permission = "active";
        buyRamAction.data = {};
        buyRamAction.data.payer = payer;
        buyRamAction.data.receiver = name;
        buyRamAction.data.bytes = amountBytes;

        const trx = {};
        trx.actions = [buyRamAction];

        console.log("Buying "+amountBytes+" of RAM.");
        return push_trx(trx, api);

    },

    delegate_more_cpu_net: async function (delegator, name, api) {

        // Delegate CPU and NET to the account
        const delegateBwAction = {};
        delegateBwAction.account = "eosio";
        delegateBwAction.name = "delegatebw";
        delegateBwAction.authorization = [{}];
        delegateBwAction.authorization[0].actor = delegator;
        delegateBwAction.authorization[0].permission = "active";
        delegateBwAction.data = {};
        delegateBwAction.data.from = delegator;
        delegateBwAction.data.receiver = name;
        delegateBwAction.data.stake_net_quantity = "5.0000 TLOS";
        delegateBwAction.data.stake_cpu_quantity = "5.0000 TLOS";
        delegateBwAction.data.transfer = false;

        const trx = {};
        trx.actions = [delegateBwAction];

        console.log("Delegating 5 more TLOS to CPU and NET each.");
        return push_trx(trx, api);
    },

    deploy_contract: async function(account, wasmHex, abiHex, api) {

        // Create actions payload
        var trx = {};
        trx.actions = [{},{}];
        trx.actions[0].account = "eosio";
        trx.actions[0].name = "setcode";
        trx.actions[0].authorization = [{
            "actor": account ,
            "permission": "active"
        }];
        trx.actions[0].data = {
            "account": account,
            "vmtype": "0",
            "vmversion": "0",
            "code": wasmHex
        };
        trx.actions[1].account = "eosio";
        trx.actions[1].name = "setabi";
        trx.actions[1].authorization = [{
            "actor": account ,
            "permission": "active"
        }];
        trx.actions[1].data = {
            "account": account,
            "abi": abiHex
        };

        console.log("Deploying eosio contract tables to the account.");
        return push_trx(trx, api);

    },

    payload_to_blockchain: async function(account, actionName, payload, api) {

        // Create actions payload
        var trx = {};
        trx.actions = [{},{}];
        trx.actions[0].account = account;
        trx.actions[0].name = actionName;
        trx.actions[0].authorization = [{
            "actor": account ,
            "permission": "active"
        }];

        // Simply set the
        trx.actions[0].data = payload;

        /* For old noderedtelos contract
        for (let [key, value] of Object.entries(payload)) {
            jsonString += ', "field'+counter+'": "'+key+'"';
            counter++;
        }
        for (counter; counter<11; counter++) {
            jsonString += ', "field'+counter+'": "'+missing+'"';
        }
        jsonString += '}';
        trx.actions[0].data = JSON.parse(jsonString);

         */



        console.log("Writing data...");
        return push_trx(trx, api);

    },

    exectute_msig: async function(account, proposer_name, proposal_name, api) {

        var trx = {};

        trx.actions = [{}]; // {msig approve}

        // Approve own proposal
        trx.actions[0].account = 'eosio.msig';
        trx.actions[0].name = 'exec';
        trx.actions[0].authorization = [{'actor': account, 'permission': 'active'}];
        trx.actions[0].data = {'proposer':proposer_name,
            'proposal_name': proposal_name,
            'executer': account};

        console.log("Executing msig...");
        return push_trx(trx, api);

    }

};