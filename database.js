let mysql = require('mysql');
const config = require('./config.json');
var connection = mysql.createConnection({
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database
});
    
connection.connect(function(err) {
    if (err) {
        return console.error('error: ' + err.message);
    }

    //
    console.log('Connected to the MySQL server.');
});

async function checkTableExists(tbl_name) {
    let stmt = "SELECT table_name FROM information_schema.tables WHERE table_schema = '" + config.database + "' AND table_name = '" + tbl_name + "';"
    var exists = await queryDB(stmt);
    if(typeof exists[0] == 'undefined') {
        console.log('Table does not exist.');
        return false;
    }
    return true;

}
async function insertInteraction(interaction, msg_id) {
    console.log("Inserting into guild interaction table...");
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
    });

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

async function insertReply(interaction_id, msg_id, author_id, guild_id) {
    var insert_vals = {
        interaction_id: interaction_id,
        message_id: msg_id,
        author_id: author_id
    }

    const tbl_name = guild_id + '_replies';
    const exists = await checkTableExists(tbl_name);
    if(!exists) {
        createRepliesTable(guild_id);
    }
    var query = connection.query('INSERT INTO ' + tbl_name + ' SET ?', insert_vals, function(error, results, fields) {
        if(error) throw error;
    });
}
async function getAuthorByInteraction(interaction_id, guild_id) {
    const query = 'SELECT author_id FROM ' + guild_id + '_interactions WHERE id = "' + interaction_id + '"';
    let result = await queryDB(query);
    return result[0].author_id;

}
function queryDB(query) {
    return new Promise(data => {
        connection.query(query, function (error, result) { // change db->connection for your code
            if (error) {
                throw error;
            }
            try {
                data(result);

            } catch (error) {
                data({});
                throw error;
            }

        });
    });

}

async function getInteractionByMsg(msg_id, guild_id) {

    var query = 'SELECT id FROM '+ guild_id +'_interactions WHERE message_id = "' + msg_id + '"';
    let result = await queryDB(query);

    if(typeof result[0] == 'undefined') {
        query = 'SELECT interaction_id FROM '+ guild_id +'_replies WHERE message_id = "' + msg_id + '"';
        result = await queryDB(query);

        if(typeof result[0] == 'undefined') {
            console.log('Attempted to reply to message not logged. Ignoring.');
            return 0;    
        }
        return result[0].interaction_id;
    }
    return result[0].id;
}

async function getMode(interaction_id, guild_id) {
    var query = 'SELECT mode FROM '+ guild_id +'_interactions WHERE id = "' + interaction_id + '"';
    let result = await queryDB(query);
    return result[0].mode;
}

async function getAuthorByMsg(msg_id, guild_id) {
    var query = 'SELECT author_id FROM '+ guild_id +'_replies WHERE message_id = "' + msg_id + '"';
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
        'interaction_id varchar(32) not null,'+ 
        'message_id varchar(32) not null,'+
        //'content longtext not null,'+
        'author_id varchar(32) not null,' +
        'date datetime not null default now()'+
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
    if(typeof result[0] == 'undefined') {
        return 0;
    }
    return result[0];  
}


module.exports = connection;
module.exports.insertInteraction = insertInteraction;
module.exports.insertReply = insertReply;
module.exports.getInteractionByMsg = getInteractionByMsg;
module.exports.getAuthorByInteraction = getAuthorByInteraction;
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