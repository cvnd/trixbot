// require the discord.js module
const Discord = require('./node_modules/discord.js');
const auth = require('./auth.json');
const DB = require('./database.js');
const commands = require('./commands.json');
var config = require('./config.json');
const { WebhookClient, MessageAttachment } = require('discord.js');

const client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });

client.once('ready', () => {

    console.log('Ready!');

    // Register all commands
    commands.forEach(element => {
        registerCommand(element);
    });

    client.ws.on('INTERACTION_CREATE', async interaction => {


        const command = interaction.data.name.toLowerCase();
        
        if (command === 'mail'){ 
            const guild_id = interaction.guild_id;
            const args = interaction.data.options;
            const sender = interaction.member;
    
            var guild_settings = await fetchSettings(guild_id);


            checkSettings(guild_settings);
    
            if(!guild_settings.set) {
                client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 3,
                        data: {
                            content: "This bot is not configured for your server. Use `!trix help` to view how to get started.",
                            flags: 64
                            }        
                    }        
                })
                return;
            }


            if(guild_settings.commands_channel != interaction.channel_id) {
                client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 3,
                        data: {
                            content: "Commands are disabled for this channel. Please use !trix help to get the proper channel, or contact your server admins.",
                            flags: 64
                            }        
                    }        
                })
                return;
            }
            // Create embed
            const mail = createMail(args, sender, interaction.id);

            client.guilds.cache.get(guild_id).channels.cache.get(guild_settings.inbox_channel).send({embed: mail}).then(resp=>DB.insertInteraction(interaction, resp.id));    
            //DB.insertGlobalInteraction(interaction.id, guild_id);
            client.api.interactions(interaction.id, interaction.token).callback.post({
                data: {
                    type: 3,
                    data: {
                        content: "Your message has been sent successfully.",
                        flags: 64
                        }        
                }        
            })

        
            if(args.length == 2 && args[1].value == 'public') {
                mail.setFooter('This message is public. Your username will be visible to the recipients.');
            } else {
                mail.setFooter('This message was sent anonymously. Your username will not be visible.');
            }
            client.users.fetch(sender.user.id).then(user=>user.send('The following message has been sent to the officers: ', {embed: mail}));

        
        }
    });
    
    client.on('message', async function(message){

     
        const sender = message.author;
        const pfp = 'https://cdn.discordapp.com/avatars/'+ sender.id +'/'+ sender.avatar +'.png';
        var userhandle = sender.username + '#' +  sender.discriminator;
        //console.log(message.channel);
        // If message is a direct reply
        let user = client.users.fetch(message.author.id);
        if(message.reference !== null && message.author.bot !== true) {

            // Get ID of message it's replying to (replied_message)
            message.channel.messages.fetch(message.reference.messageID)
            .then(async(replied_message) => {

                // If message is direct reply to bot post.
                if(replied_message.author.id === '789932059224702976') {

                    var guild_id = '';
                    if(message.channel.type === 'dm') {
                        //let original_interaction = await
                        var footer = replied_message.embeds[0].footer.text; 
                        footer = footer.match(/(Sent from )(.+)$/g)[0];
                        console.log(footer);
                        const guild_name = footer.substring(10, footer.length);
                        var guild = client.guilds.cache.find(guild => guild.name === guild_name);
                        //console.log(guild);
                        console.log("triggering message is a DM");
                        guild_id = guild.id;
                    } else {
                        guild_id = message.guild.id;
                            
                    }
                    var guild_settings = await fetchSettings(guild_id);
                    checkSettings(guild_settings);    
                    //var guild_settings = await fetchSettings(guild_id);

                    // Get original interaction from table
                    console.log("replied_message.id: " + replied_message.id);
                    DB.getInteractionByMsg(replied_message.id, guild_id).then(interaction_id=>{

                        // If no interaction exists, return
                        if(interaction_id === 0) {
                            return;
                        }

                        // Reply embed
                        var reply = new Discord.MessageEmbed()
                            .setColor('#ffffff')
                            .setAuthor(userhandle, pfp)
                            .setTitle('RE: Submission #' + truncateInteractionID(interaction_id))
                            .setDescription(message.content)
                            .setTimestamp()
                            .setFooter(config.mail_footer);


                        // Get author of original interaction
                        DB.getAuthorByInteraction(interaction_id, guild_id).then(author=>{

                            // If DM to bot, put response in inbox channel
                            if (replied_message.channel.type == "dm") {

                                reply.setColor(config.member_color);

                                DB.getMode(interaction_id, guild_id).then(mode=>{

                                    // If initial interaction was set to anonymous, change author to hide user.
                                    if(mode == 'anon') {
                                        userhandle = 'User#' + truncateAuthorID(sender.id);
                                        reply.setAuthor(userhandle, config.anon_avatar);
                                    }

                                    // Get author of message being replied to and send to inbox channel
                                    DB.getAuthorByMsg(replied_message, guild_id).then(replied_author_id=>{
                                        //console.log(message);
                                        guild.channels.cache.get(guild_settings.inbox_channel).send("<@" + replied_author_id + ">", {embed: reply}).then(resp=>DB.insertReply(interaction_id, resp.id, sender.id, guild_id));    
                                    });
                                });
                                //message.author.send("You are DMing me now!");
                                // return;

                            // Else if reply to sender from inbox channel, forward message to DM.
                            } else {
                                reply.setColor(config.admin_color);
                                reply.setFooter(config.mail_footer + " Sent from " + message.guild.name);
                                client.users.fetch(author).then(user=>user.send(
                                    'Your anonymous message has been responded to.',
                                    {embed: reply}
                                ).then(resp=>DB.insertReply(interaction_id, resp.id, sender.id, guild_id)));
                            }
                        });

                    });
                }
            })
            .catch(console.error);
          
        }

        if(message.content.length > 5 && message.content.substring(0, 5) === '!trix') {
            const guild_id = message.guild.id;
            var guild_settings = await fetchSettings(guild_id);    

            const command = message.content.split(/\s+/)[1];
            if(command == 'help'){
                const help = new Discord.MessageEmbed()
                .setColor('#efefef')
                .setDescription('All command parameters should be entered within double quotes.')
                .addFields({
                    name:'Command List',
                    value:  '`!trix inbox "channel-name"` to set inbox channel \n'+
                            '`!trix commands "channel-name"` to set commands channel \n' +
                            '`!trix settings` to show defined settings'
                })
                .setTimestamp()
                .setFooter('Thank you for installing Trix! If you find any bugs, please send it to cloe.nd@2073 along with any screenshots.'); 
                message.channel.send({embed: help});
                //console.log("pewpew");

            } else if (command == 'inbox') {
                var param = [];
                try{
                    param = message.content.match(/"([^"]*)"/g)[0];
                    var channel_name = param.substring(1, param.length - 1);
                } catch(err) {
                    console.log("Error in parsing " + message.content + ": ");
                    console.log(err);
                    message.channel.send("Unable to execute command. Double-check your format and try again?");
                    return;
                }
    
                // Get channel by name
                let channel = message.guild.channels.cache.find(chnl => chnl.name.toLowerCase() === channel_name);

                if(typeof channel.id === undefined) {
                    message.channel.send("This channel does not exist. Check your spelling and try again?");
                } else if(!message.guild.me.permissionsIn(channel).has(['SEND_MESSAGES', 'VIEW_CHANNEL', 'EMBED_LINKS'])){
                    // No permissions to view, post, and embed in the channel specified
                    message.channel.send("I do not have permission to post in that channel. Please update my permissions and try again.");
                } else {
                    // If permissions are sufficient and channel exists, update settings
                    message.channel.send("Inbox channel has now been changed to #" + channel_name);
                    DB.updateInboxChannel(guild_id, channel.id);
                }
            } else if (command == 'commands') {
    
                var param = [];
                try{
                    param = message.content.match(/"([^"]*)"/g)[0];
                    param = param.substring(1, param.length - 1);
                } catch(err) {
                    console.log("Error in parsing " + message.content + ": ");
                    console.log(err);
                    message.channel.send("Unable to execute command. Double-check your format and try again?");
                    return
                }
                let channel = message.guild.channels.cache.find(channel => channel.name.toLowerCase() === param);
                if(typeof channel.id === undefined) {
                    message.channel.send("This channel does not exist. Check your spelling and try again?");
                } 
            
                DB.updateCommandsChannel(guild_id, channel.id);
            } else if(command == 'settings'){
                var body = '';

                console.log(guild_settings);
                for(var key in guild_settings) {
                    if(key !== 'set') {
                        var title = key[0].toUpperCase() + key.substring(1);
                        body += '\n' + title.replace("_", " ") + ': '
                        if (typeof guild_settings[key] === undefined || guild_settings[key] === '' || guild_settings[key] === null){
                            body += "Not set"
                        } else if(key == 'inbox_channel' || key == 'commands_channel') {
                            let channel = message.guild.channels.cache.get(guild_settings[key]);
                            body += channel.name;
                        } else {
                            body +=  guild_settings[key];
                        }
                    }

                }

                const embed = new Discord.MessageEmbed()
                            .setTitle('Current settings')
                            .setDescription(body)
                            .setColor('#efefef')
                            .setFooter('To see all commands, use `!trix help`');
                
                message.channel.send(embed);
            }else {
                message.channel.send("Sorry, this command is not recognized. Please use `!trix help` to view usable commands.");
            }

            checkSettings(guild_settings);
        } 
    });
    
});


function checkChannelPermissions(channel, purpose) {
    var permissions = []
    if(purpose === 'commands') {
        permissions = ['']
    }
}

function createMail(args, sender, id) {
    var user_id = '';
    var pfp ='';

    // If the mode value is set and is set to public
    if(args.length == 2 && args[1].value == 'public') {
        user_id += sender.user.username + '#' + sender.user.discriminator; 
        pfp = 'https://cdn.discordapp.com/avatars/'+ sender.user.id +'/'+ sender.user.avatar +'.png';
        //console.log(pfp);
    } else {
        //var len = sender.user.id.length;
        user_id += 'User#' + truncateAuthorID(sender.user.id);
        pfp = config.anon_avatar;
    }

    return new Discord.MessageEmbed()
                .setColor(config.member_color)
                .setTitle("Submission #" + truncateInteractionID(id))
                .setAuthor(user_id, pfp)
                .setDescription( args[0].value + '\n')
                // .addFields(
                //     { name: tag, value: args[1].value + '\n' },
                // )
                .setTimestamp()
                .setFooter(config.mail_footer);

}

function truncateInteractionID(id) {
    return id.substring(id.length - 5, id.length);
}

function truncateAuthorID(id) {
    return id.substring(id.length - 4, id.length)
}

async function fetchSettings(guild_id) {
    // Check if guild exists in table
    var exists = await DB.checkGuildExists(guild_id);
    //console.log(exists);

    if(exists) {

        var settings = await DB.getGuildSettings(guild_id);
    } else {
        DB.createGuildSettings(guild_id);
        DB.createRepliesTable(guild_id);
        DB.createInteractionsTable(guild_id);
        var settings = await DB.getGuildSettings(guild_id);
    }
    return settings;
}


function isSet(vals) {
    var set = true;
    for(var key in vals) {
        //console.log(vals[key]);
        if(typeof vals[key] == 'undefined' || vals[key] == '') {
            set = false;
        }
    }
    return set;
}

function checkSettings(vals) {
    var set = true
    for(var key in vals) {
        console.log(vals[key]);
        if(typeof vals[key] === undefined || vals[key] === '') {
            //console.log(vals[key]);
            set = false;
        }
    }
    vals.set = set;
    console.log(vals);
}

function failedInteraction(msg) {
    client.api.interactions(interaction.id, interaction.token).callback.post({
        data: {
            type: 3,
            data: {
                content: msg,
                flags: 64
                }        
        }        
    })
    return;
}

function registerCommand(json) {
    client.api.applications(client.user.id).commands.post({data: json});
}
// Log our bot in using the token from https://discord.com/developers/applications
client.login(auth.token);
