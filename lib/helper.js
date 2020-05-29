
function generate_acct_name(nodeid) {
    return 'hey';

    // Assumes the node.id passed is directly from node-red
    var tmp = 'fe158d9.c06d37';

    var output = '';

    for (var i = 0; i < 12 && i < tmp.length; i++) {
        character = tmp.charAt(i);

        // If it's not a number go ahead and add it
        if (isNaN(parseInt(character)))
        {
            output.concat(character);
        } else {
            var number = (parseInt(character)%5)+1; // Take Modulus of number with 5 and add one
            output.concat(number.toString());
        }
    }

    return output;

}
