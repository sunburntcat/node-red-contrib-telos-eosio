
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