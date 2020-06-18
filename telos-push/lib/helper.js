
var _ = require('lodash');

const trans = require('./transaction_modules.js');

module.exports = {

    parse_injection: function (node, msg, api) {

        const acctName = node.parentName;
        const tableIndex = node.id;

        if (node.inputtype === 'action'){
            // We first build and push transaction to our endpoint

            (async () => {
                try {


                    /*
                    if (!result.processed.error_code) { // If endpoint didn't give error
                        console.log("Trx: "+result.transaction_id)
                    } else {
                        console.log(result);
                    }
                    */
                } catch (e) {
                    console.log(e);// Print any errors
                } // end try/catch
            })(); // end asynch
        } else if (node.inputtype === 'trx') {
            // Suggestion for eosiot on-device signatures...
            //   https://github.com/EOSIO/eosjs/blob/master/src/eosjs-api.ts
            //     Function at Line 257 allows us to use the following function:
            //        api.pushSignedTransaction
            //let pushTransactionArgs: PushTransactionArgs  = {
            let pushTransactionArgs = {
                transaction: msg.payload.transaction, // Should be uint8array
                signatures: [msg.payload.signature]   // Should be string beginning with SIG_K
            };
            (async () => {
                try {
                    const result = await api.pushSignedTransaction( pushTransactionArgs );
                    if (!result.processed.error_code) { // If endpoint didn't give error
                        console.log("Trx: "+result.transaction_id)
                    } else {
                        console.log(result);
                    }
                } catch (e) {
                    console.log(e);// Print any errors
                }       // end try/catch
            })();       // end asynch
        }               // end if (inputtype)
        node.send(msg); // continue sending message through to outputs if necessary

    },



};

