
module.exports = {

    generate_rand_name: function () {

        var result = '';

        // subset of characters allowed in eosio names
        var characters = 'abcdefghijklmnopqrstuvwxyz.12345';

        // Twelve characters per account name
        for (var i = 0; i < 12; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    },

    check_account_status: async function (account, rpc, RpcError) {
        /*
        Returns the following status:
            1) Account is ready
                account name exists, has the right permissions, has eosio table, has correct var names
            2) Account is ready except incorrect eosio table doesn't have correct variable names
            3) Account is ready except no eosio table
            4) Account exists but doesn't have correct iot permission
            5) Account name doesn't exist

            NOTE: CPU/NET resources will not be handled here. Instead they are checked every telos-push inject.
         */

        try {
            const accountInfo = await rpc.get_account(account);
            var permissionIndex = -1;

            for (var i=0; i < accountInfo.permissions.length; i++){
                if (accountInfo.permissions[i].perm_name === 'iot')
                //if (accountInfo.permissions[i].perm_name === 'active') // REMOVE AFTER TESTING
                {
                    permissionIndex = i;
                    // Should also check that permission's required_auth.accounts.permission.actor is set to the user's acct
                }
            }
            if (permissionIndex < 0) {
                return 4; // IoT permission wasn't found
            }
        } catch (e) {
            if (e instanceof RpcError) // Should specify error due to 'unknown key'
            {
                return 5; // Account name doesn't exist
            }
        }


        //`console.log(accountInfo.permissions[0].required_auth);

    }

};

