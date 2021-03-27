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

    //
    console.log('Connected to the MySQL server.');
});

function checkTable() {

}
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
    //console.log(query.sql); // INSERT INTO posts SET `id` = 1, `title` = 'Hello MySQL'

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
// .guilds(guild_id)
async function getInteraction(msg_id) {
    //console.log(msg_id);
    var query = 'SELECT interaction FROM replies WHERE message = "' + msg_id + '"';
    let result = await queryDB(query);
    //console.log(result[0]);
    //console.log(typeof result[0]);
    if(typeof result[0] == 'undefined') {
        console.log('Attempted to reply to message not logged. Ignoring.');
        return 0;
    }
    return result[0].interaction;
}

async function getMode(interaction) {
    var query = 'SELECT mode FROM messages WHERE id = "' + interaction + '"';
    let result = await queryDB(query);
    return result[0].mode;
}

async function getAuthorByMsg(msg_id) {
    var query = 'SELECT author_id FROM replies WHERE message = "' + msg_id + '"';
    let result = await queryDB(query);
    return result[0].author_id;
}


function createMessageTable(guild_id) {
    var table =
    'CREATE TABLE ' + guild_id + '_interactions (' +
        'id varchar(32) not null primary key,'+ 
        'message_id varchar(32) not null,'+
        'content longtext not null,'+
        'author_id varchar(32) not null,' +
        'date datetime not null default now(),'+
        'mode not null default "anon"'+
    ')';

    var query = connection.query(table, function(error, results, fields) {
        if(error) throw error;
    });
}

function createRepliesTable(guild_id) {
    var table =
    'CREATE TABLE ' + guild_id + '_replies (' +
        'interaction_id varchar(32) not null primary key,'+ 
        'message_id varchar(32) not null,'+
        //'content longtext not null,'+
        'author_id varchar(32) not null,' +
        'date datetime not null default now(),'+
    ')';

    var query = connection.query(table, function(error, results, fields) {
        if(error) throw error;
    });
}

async function checkGuild(guild_id) {
    //console.log(msg_id);
    var query = 'SELECT guild FROM guild_settings WHERE guild_id = "' + guild_id + '"';
    let result = await queryDB(query);
    //console.log(result[0]);
    //console.log(typeof result[0]);
    if(typeof result[0] == 'undefined') {
        // console.log('Guild not stored in database.');
        return false;
    }
    return true;
}

async function getGuildSettings(guild_id) {
    var query = 'SELECT patreon_tier, inbox_channel, commands_channel, default_mode FROM guild_settings WHERE guild_id = "' + guild_id + '"';
    let result = await queryDB(query);
    //console.log(result[0]);
    //console.log(typeof result[0]);
    if(typeof result[0] == 'undefined') {
        // console.log('Guild not stored in database.');
        return 0;
    }
    return result[0];  
}
module.exports = connection;
module.exports.insertMessages = insertMessages;
module.exports.insertReplies = insertReplies;
module.exports.getInteraction = getInteraction;
module.exports.getAuthor = getAuthor;
module.exports.getMode = getMode;
module.exports.createMessageTable = createMessageTable;
module.exports.createRepliesTable = createRepliesTable;
module.exports.checkGuild = checkGuild;
module.exports.getAuthorByMsg = getAuthorByMsg;
module.exports.getGuildSettings = getGuildSettings;