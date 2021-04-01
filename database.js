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

async function checkTableExists(tbl_name) {
    let stmt = "SELECT table_name FROM information_schema.tables WHERE table_schema = '" + auth.database + "' AND table_name = '" + tbl_name + "';"
    var exists = await queryDB(stmt);
    if(typeof exists[0] == 'undefined') {
        console.log('Table does not exist.');
        return false;
    }
    return true;

}
async function insertInteractions(interaction, msg_id) {
    const sender = interaction.member
    const id = interaction.id
    const guild_id = interaction.guild_id;
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
        author_id: user,
        mode: mode,
        message_id: msg_id
    }

    const table = guild_id + '_interactions';
    var exists = await checkTableExists(table);
    console.log(exists);
    if(!exists) {
        createInteractionsTable(guild_id);
    }
    var query = connection.query('INSERT INTO ' + guild_id + '_interactions SET ?', insert_vals, function (error, results, fields) {
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
async function getInteractionByMsg(msg_id, guild_id) {
    //console.log(msg_id);
    var query = 'SELECT interaction FROM '+ guild_id +'_interactions WHERE message = "' + msg_id + '"';
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


function createInteractionsTable(guild_id) {
    var table =
    "CREATE TABLE " + guild_id + "_interactions (" +
        "id VARCHAR(32) NOT NULL PRIMARY KEY, "+ 
        "message_id VARCHAR(32) NOT NULL, "+
        "content LONGTEXT NOT NULL, "+
        "author_id VARCHAR(32) NOT NULL, "+
        "date DATETIME NOT NULL DEFAULT NOW(), "+
        "mode VARCHAR(6) NOT NULL DEFAULT 'anon'"+
    ")";

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

function createGuildSettings(guild_id) {
    console.log("Creating guild setting...");
    var stmt = 'INSERT INTO guild_settings (guild_id) VALUES (' + guild_id + ')';

    var query = connection.query(stmt, function(error, results, fields) {
        if(error) throw error;
    }); 

}

function updateSettings(guild_id, inbox_channel = null, commands_channel = null, mode = 'anon') {
    var stmt =  'UPDATE guild_settings SET ' +
                'inbox_channel = ' + inbox_channel + ', ' +
                'commands_channel = ' + commands_channel + ', ' +
                'default_mode = ' + mode +
                'WHERE guild_id = ' + guild_id;

    var query = connection.query(stmt, function(error, results, fields){
        if(error) throw error;
    })
}

function updateInboxChannel(guild_id, channel_id) {
    console.log(guild_id);
    var stmt = 'UPDATE guild_settings SET inbox_channel = "' + channel_id + '" WHERE guild_id = ' + guild_id;

    var query = connection.query(stmt, function(error, results, fields){
        if(error) throw error;
    })
}

function updateCommandsChannel(guild_id, channel_id) {
    var stmt = 'UPDATE guild_settings SET commands_channel = "' + channel_id + '" WHERE guild_id = ' + guild_id;

    var query = connection.query(stmt, function(error, results, fields){
        if(error) throw error;
    })
}

async function checkGuildExists(guild_id) {
    //console.log(msg_id);
    var query = 'SELECT guild_id FROM guild_settings WHERE guild_id = "' + guild_id + '"';
    let result = await queryDB(query);
    //console.log(result[0]);
    // return (typeof result[0] == 'undefined');
    // console.log(typeof result[0]);
    if(typeof result[0] == 'undefined') {
        console.log('Guild not stored in database.');
        return false;
    } else {
        return true;
    }
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

function insertInteraction(interaction, guild) {
    var insert_vals = {
        guild_id: guild,
        interaction_id: interaction
    }

    var query = connection.query('INSERT INTO guilds_interactions SET ?', insert_vals, function(error, results, fields) {
        if(error) throw error;
    });
}


module.exports = connection;
module.exports.insertInteractions = insertInteractions;
module.exports.insertReplies = insertReplies;
module.exports.getInteractionByMsg = getInteractionByMsg;
module.exports.getAuthor = getAuthor;
module.exports.getMode = getMode;
module.exports.createInteractionsTable = createInteractionsTable;
module.exports.createRepliesTable = createRepliesTable;
module.exports.checkGuildExists = checkGuildExists;
module.exports.getAuthorByMsg = getAuthorByMsg;
module.exports.getGuildSettings = getGuildSettings;
module.exports.createGuildSettings = createGuildSettings;
module.exports.updateSettings = updateSettings;
module.exports.updateCommandsChannel = updateCommandsChannel;
module.exports.updateInboxChannel = updateInboxChannel;