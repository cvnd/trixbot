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

function insertMessages(interaction, msg_id) {
    const sender = interaction.member
    const id = interaction.id
    var mode ='';

    const data = interaction.data;

    if(data.options.length == 2) {
        mode = data.options[1].value;
    } else {
        mode = 'anon';
    }
    // const user_id = sender.user.username + '#' + sender.user.discriminator;

    const user = sender.user.id;
    var insert_vals = {
        id: id,
        content: data.options[0].value,
        user: user,
        mode: mode,
        message_id: msg_id
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

function insertReplies(interaction, msg, author) {
    var insert_vals = {
        interaction: interaction,
        message: msg,
        author_id: author
    }

    var query = connection.query('INSERT INTO replies SET ?', insert_vals, function(error, results, fields) {
        if(error) throw error;
    });
}
async function getAuthor(int_id) {
    // var query = connection.query('SELECT user FROM messages WHERE id = "' + int_id + '"', function(error, result, fields) {
    //     if(error) throw error;
    //     Object.keys(result).forEach(function(key) {
    //         var userid = result[key].interaction;
    //         client.users.fetch(userid).then(user=>user.send('message'));
    //         // const msg = '```Mail Code: '+ code +'```';
    //         // feed.send(msg);
    //         // interaction.push(row.interaction);
    //         //console.log(row.interaction)
    //         //interaction = row.interaction;
    //       });

    //});
    const query = 'SELECT user FROM messages WHERE id = "' + int_id + '"';
    let result = await queryDB(query);
    //console.log(result[0].interaction);
    return result[0].user;

}
function queryDB(query) {
    return new Promise(data => {
        connection.query(query, function (error, result) { // change db->connection for your code
            if (error) {
                //console.log(error);
                throw error;
            }
            try {
                //console.log(result);
                data(result);

            } catch (error) {
                data({});
                throw error;
            }

        });
    });

}

async function getInteraction(msg_id) {
    var query = 'SELECT interaction FROM replies WHERE message = "' + msg_id + '"';
    let result = await queryDB(query);
    //console.log(result[0].interaction);
    return result[0].interaction;
}

module.exports = connection;
module.exports.insertMessages = insertMessages;
module.exports.insertReplies = insertReplies;
module.exports.getInteraction = getInteraction;
module.exports.getAuthor = getAuthor;