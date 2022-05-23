
// Pushes transaction to the blockchain
async function push_trx(trx, tapos, api) {

    try {

        const result = await api.transact(trx, tapos);

        if (!result.processed.error_code) { // If endpoint didn't give error
            console.log("Trx: " + result.transaction_id);
            return 0;
        } else {
            console.log("API Endpoint gave the following eosio-based error:");
            console.log(result);
        }
    } catch(e) {
        throw(e);
    }

}

module.exports = {


    create_new_account: async function (parent, name, api) {
        // New account data is complicated so we will build it first
        const newAcctData = {};
        newAcctData.creator = parent;
        newAcctData.name = name;
        newAcctData.owner = {};
        newAcctData.owner.threshold = 1;
        newAcctData.owner.keys = [];
        newAcctData.owner.waits = [];
        newAcctData.owner.accounts = [{}];
        newAcctData.owner.accounts[0].weight = 1;
        newAcctData.owner.accounts[0].permission = {};
        newAcctData.owner.accounts[0].permission.actor = name;
        newAcctData.owner.accounts[0].permission.permission = "active";
        newAcctData.active = newAcctData.owner; // Active permission looks just like owner

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
        buyRamAction.data.bytes = 8192;

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
        delegateBwAction.data.stake_net_quantity = "1.0000 TLOS";
        delegateBwAction.data.stake_cpu_quantity = "1.0000 TLOS";
        delegateBwAction.data.transfer = false;

        const trx = {};
        trx.actions = [newAcctAction, buyRamAction, delegateBwAction];

        const tapos = {};
        tapos.blocksBehind = 3;
        tapos.expireSeconds = 30;

        msg = "Creating new eosio account for " + name + " with 8192 bytes of RAM, " +
            "1 TLOS for CPU, and 1 TLOS for NET...";
        console.log(msg);
        return push_trx(trx, tapos, api);

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

        const tapos = {};
        tapos.blocksBehind = 3;
        tapos.expireSeconds = 30;

        console.log("Buying "+amountBytes+" of RAM.");
        return push_trx(trx, tapos, api);

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

        const tapos = {};
        tapos.blocksBehind = 3;
        tapos.expireSeconds = 30;


        console.log("Delegating 5 more TLOS to CPU and NET each.");
        return push_trx(trx, tapos, api);
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

        const tapos = {};
        tapos.blocksBehind = 3;
        tapos.expireSeconds = 30;

        console.log("Deploying eosio contract tables to the account.");
        return push_trx(trx, tapos, api);

    },

    push_presigned_trx: async function(trx, signature, api) {
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
                    "serializedTransaction": trx,
                    "signatures": [signature],
                    "serializedContextFreeData": ''
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

    },

    payload_to_blockchain: async function(account, actionName, permission, payload, rpc, api) {


        /* NOTE THE FOLLOWING CODE IS TEMPORARY FOR
              GETTING THE NECESSARY LAUNCH ID
         */
        /*
        let json = await rpc.get_table_rows({
            json: true,                 // Get the response as json
            code: account,           // Contract that we target
            scope: account,          // Account that owns the data
            table: 'launches',          // Table name
            reverse: true,
            limit: 100,                   // Here we limit to 1 to get only the single row with primary key equal to 'testacc'
        });

        if (json.rows.length>0) {
            let maximum = 0;
            let i;
            for (i = 0; i < json.rows.length ; i++) {
                let time = json.rows[i].unix_time;
                if (time > maximum) {
                    payload.launch_id = json.rows[i].launch_id;
                    maximum = time;
                }
            }
            //return json.rows[0].launch_number;
        } else {
            payload.launch_id = "";
        }
        */


        ///////////////////////////////////////////////

        // Create actions payload
        var trx = {};
        trx.actions = [{}];
        trx.actions[0].account = account;
        trx.actions[0].name = actionName;
        trx.actions[0].authorization = [{
            "actor": account ,
            "permission": permission
        }];

        // Simply set the data to the incoming payload
        trx.actions[0].data = payload;

        const tapos = {};
        tapos.blocksBehind = 3;
        tapos.expireSeconds = 30;

        try {
            console.log("Attempting to write data...");
            await push_trx(trx, tapos, api);
        } catch(e) {
            throw(e);
        }

    },

    approve_msig: async function(proposer_name, proposal_name) {

    }

};
