let mysql = require('mysql');
const auth = require('./auth.json');

var connection = mysql.createConnection({
    host: auth.host,
    user: auth.user,
    password: auth.password,
    database: auth.database
});
    
connection.connect(function(err) {
    if (err) {
        return console.error('error: ' + err.message);
    }

    console.log('Connected to the MySQL server.');
});

function insertMessage(interaction) {
    const sender = interaction.member
    const id = interaction.id
    var mode ='';

    const data = interaction.data;

    if(data.options.length == 3) {
        mode = data.options[2].value;
    } else {
        mode = 'anon';
    }
    const user_id = sender.user.username + '#' + sender.user.discriminator;

    var insert_vals = {
        id: id,
        content: data.options[1].value,
        user: user_id,
        mode: mode
    }
    var query = connection.query('INSERT INTO messages SET ?', insert_vals, function (error, results, fields) {
        if (error) throw error;
    // Neat!
    });
    console.log(query.sql); // INSERT INTO posts SET `id` = 1, `title` = 'Hello MySQL'

}

function postedMessage(interaction_id, msg_id) {
    var insert_vals = {
        interaction: interaction_id,
        message: msg_id
    }

    var query = connection.query('INSERT INTO posted SET ?', insert_vals, function(error, results, fields) {
        if(error) throw error;
    });
}

function getInteraction(msg_id) {
    var interaction = '';
    var query = connection.query('SELECT interaction FROM posted WHERE message = "' + msg_id + '"', function(error, result, fields) {
        if(error) throw error;
        Object.keys(result).forEach(function(key) {
            var row = result[key];
            //console.log(row.interaction)
            interaction = row.interaction;
          });
    });

    return interaction;
}

module.exports = connection;
module.exports.insertMessage = insertMessage;
module.exports.postedMessage = postedMessage;
module.exports.getInteraction = getInteraction;