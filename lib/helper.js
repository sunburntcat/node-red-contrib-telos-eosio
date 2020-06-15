
var _ = require('lodash');

module.exports = {

    prepare_account: async function (account, fs, rpc, RpcError) {
        /*
        Returns the following status:
            1) Account is ready
                account name exists, has correct ABI deployed, has enough RAM to post data
            2) Account is ready except incorrect eosio table doesn't have correct variable names
            3) Account is ready except no eosio table
            4) Account exists but doesn't have correct iot permission
            5) Account name doesn't exist

            NOTE: CPU/NET resources will not be handled here. Instead they are checked every telos-push inject.
         */

        try { // First check if account exists
            const accountInfo = await rpc.get_account(account);
            const accountAbi = await rpc.get_abi("mtgsg2agrhcu");

            if ("abi" in accountAbi) { // Account already has contract applied.

                // Read the ABI file found inside the repository
                const repoAbi = JSON.parse(fs.readFileSync('telos-push/contract_code/noderedtelos.abi', 'utf8'));

                // Check if ABI's properties are different from the repository's ABI
                if (!_.isEqual(accountAbi.abi.actions, repoAbi.actions) ||
                    !_.isEqual(accountAbi.abi.tables, repoAbi.tables) ||
                    !_.isEqual(accountAbi.abi.structs, repoAbi.structs)
                ) {
                    // Contract is not one we recognize.
                    return 2;
                }
            } else { // There is no contract applied yet

                // Check if we have enough RAM to apply a contract on the account
                if (accountInfo.ram_quota - accountInfo.ram_usage < 200000) {
                    console.log("Converting Telos to RAM for smart contract deployment.");
                    //if (buy_ram(account, 220000, api) !== 0) { // Contract deployment requires about 195KB RAM
                    if (0) {
                        return 1; // Account doesn't have enough TLOS/RAM for contract deployment
                    }
                }

                // Deploy smart contract there

            }

            return 0; // Passes all the tests.

            //    return 5

            /* // No longer concerned about permissions
            var permissionIndex = -1;

            for (var i=0; i < accountInfo.permissions.length; i++){
                //if (accountInfo.permissions[i].perm_name === 'iot')
                if (accountInfo.permissions[i].perm_name === 'active') // REMOVE AFTER TESTING
                {
                    permissionIndex = i;
                    // Should also check that permission's required_auth.accounts.permission.actor is set to the user's acct
                }
            }
            if (permissionIndex < 0) {
                return 4; // IoT permission wasn't found
            }
            */
        } catch (e) {
            if (e instanceof RpcError) // Should specify error due to 'unknown key'
            {
                return 3; // Account doesn't exist
            }
        }

        //`console.log(accountInfo.permissions[0].required_auth);

    },

    create_new_account: async function (name, api) {


        // New account data is complicated so we will build it first
        const newAcctData = {};
        newAcctData.creator = "noderedtelos";
        newAcctData.name = name;
        newAcctData.owner = {};
            newAcctData.owner.threshold = 1;
            newAcctData.owner.keys = [];
            newAcctData.owner.waits = [];
            newAcctData.owner.accounts = [{}];
                newAcctData.owner.accounts[0].weight = 1;
                newAcctData.owner.accounts[0].permission = {};
                    newAcctData.owner.accounts[0].permission.actor = "noderedtelos";
                    newAcctData.owner.accounts[0].permission.permission = "active";
        newAcctData.active = newAcctData.owner; // Active permission looks just like owner

        //Build the new account action
        const newAcctAction = {};
        newAcctAction.account = "eosio";
        newAcctAction.name = "newaccount";
        newAcctAction.authorization = [{}];
        newAcctAction.authorization[0].actor = "noderedtelos";
        newAcctAction.authorization[0].permission = "active";
        newAcctAction.data = newAcctData;

        // Buy a some RAM for the account
        const buyRamAction = {};
        buyRamAction.account = "eosio";
        buyRamAction.name = "buyrambytes";
        buyRamAction.authorization = [{}];
        buyRamAction.authorization[0].actor = "noderedtelos";
        buyRamAction.authorization[0].permission = "active";
        buyRamAction.data = {};
        buyRamAction.data.payer = "noderedtelos";
        buyRamAction.data.receiver = name;
        buyRamAction.data.bytes = 8192;

        // Delegate CPU and NET to the account
        const delegateBwAction = {};
        delegateBwAction.account = "eosio";
        delegateBwAction.name = "delegatebw";
        delegateBwAction.authorization = [{}];
        delegateBwAction.authorization[0].actor = "noderedtelos";
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

        try {
            msg = "Creating new eosio account for "+name+" with 8192 bytes of RAM, " +
                "1 TLOS for CPU, and 1 TLOS for NET...";
            console.log(msg);

            // Push the whole transaction to the blockchain
            const result = await api.transact(trx, tapos);
            if (!result.processed.error_code) { // If endpoint didn't give error
                console.log("Trx: "+result.transaction_id)
            } else {
                console.log(result);
            }
        } catch (e) {
            console.log(e); // Print any errors
        }

    },

    buy_ram: async function (name, amountBytes, api) {

        // Buy a some RAM for the account
        const buyRamAction = {};
        buyRamAction.account = "eosio";
        buyRamAction.name = "buyrambytes";
        buyRamAction.authorization = [{}];
        buyRamAction.authorization[0].actor = "noderedtelos";
        buyRamAction.authorization[0].permission = "active";
        buyRamAction.data = {};
        buyRamAction.data.payer = "noderedtelos";
        buyRamAction.data.receiver = name;
        buyRamAction.data.bytes = amountBytes;

        const trx = {};
        trx.actions = [buyRamAction];

        const tapos = {};
        tapos.blocksBehind = 3;
        tapos.expireSeconds = 30;

        try {
            msg = "Buying "+amountBytes+" of RAM.";
            console.log(msg);

            // Push the whole transaction to the blockchain
            const result = await api.transact(trx, tapos);
            if (!result.processed.error_code) { // If endpoint didn't give error
                console.log("Trx: "+result.transaction_id)
                return 0;
            } else {
                console.log(result);
                return 1;
            }
        } catch (e) {
            console.log(e); // Print any errors
            return 1;
        }

    },

    delegate_more_cpu_net: async function (name, api) {

        // Delegate CPU and NET to the account
        const delegateBwAction = {};
        delegateBwAction.account = "eosio";
        delegateBwAction.name = "delegatebw";
        delegateBwAction.authorization = [{}];
        delegateBwAction.authorization[0].actor = name;
        delegateBwAction.authorization[0].permission = "active";
        delegateBwAction.data = {};
        delegateBwAction.data.from = name;
        delegateBwAction.data.receiver = name;
        delegateBwAction.data.stake_net_quantity = "5.0000 TLOS";
        delegateBwAction.data.stake_cpu_quantity = "5.0000 TLOS";
        delegateBwAction.data.transfer = false;

        const trx = {};
        trx.actions = [delegateBwAction];

        const tapos = {};
        tapos.blocksBehind = 3;
        tapos.expireSeconds = 30;

        try {
            msg = "Delegating 5 more TLOS to CPU and NET each.";
            console.log(msg);

            // Push the whole transaction to the blockchain
            const result = await api.transact(trx, tapos);
            if (!result.processed.error_code) { // If endpoint didn't give error
                console.log("Trx: "+result.transaction_id)
                return 0;
            } else {
                console.log(result);
                return 1;
            }
        } catch (e) {
            console.log(e); // Print any errors
            return 1;
        }

    },


};

