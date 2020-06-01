
module.exports = {

    generate_rand_name: function () {

        var result = '';
        var characters = 'abcdefghijklmnopqrstuvwxyz.12345';
        for (var i = 0; i < 12; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }

};

