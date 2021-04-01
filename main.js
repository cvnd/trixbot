// require the discord.js module
const Discord = require('./node_modules/discord.js');
const auth = require('./auth.json');
const DB = require('./database.js');
const commands = require('./commands.json');
var config = require('./config.json');
const { WebhookClient, MessageAttachment } = require('discord.js');

// create a new Discord client
const client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });

// when the client is ready, run this code
// this event will only trigger one time after logging in
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
    
            //let exists = await DB.checkGuild(guild_id);
            var guild_settings = await fetchSettings(guild_id);


            checkSettings(guild_settings);
    
            if(!guild_settings.set) {
                // Do things
                //updateSettings(interaction, 'interaction');
                //console.log("NOT SET");

                //failedInteraction("This bot is not fully configured for your server. Use `!trix help` to view how to get started.")
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

            //console.log(interaction);

            if(guild_settings.commands_channel != interaction.channel_id) {
                //failedInteraction("Commands are disabled for this channel. Please visit #" + guild_settings.commands_channel.name + " instead")
                client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 3,
                        data: {
                            content: "Commands are disabled for this channel. Please visit #" + guild_settings.commands_channel.name + " instead",
                            flags: 64
                            }        
                    }        
                })
                return;
            }
            // Create embed
            const mail = createMail(args, sender, interaction.id);

            // Insert info into DB
            

        
            //console.log(client.users.fetch(sender.user.id));
            // guild_settings.inbox_channel.send(mail).then(msg=>{
            //     DB.insertMessages(interaction, msg.id);
            //     DB.insertReplies(interaction.id, msg.id, sender.user.id);
            //     //msg.react('✉️');
            //     //DB.postedMessage(interaction.id, msg.id);
            // });
            client.guilds.cache.get(guild_id).channels.cache.get(guild_settings.inbox_channel).send({embed: mail}).then(resp=>DB.insertInteractions(interaction, resp.id));    

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

    client.on('messageReactionAdd', async (reaction, user) => {

        //console.log(reaction);
        // When we receive a reaction we check if the reaction is partial or not
        if (reaction.partial) {
            // If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('Something went wrong when fetching the message: ', error);
                // Return as `reaction.message.author` may be undefined/null
                return;
            }
        }
        // Now the message has been cached and is fully available
        //console.log(`${reaction.message.author}'s message "${reaction.message.content}" gained a reaction!`);
        // The reaction is now also fully available and the properties will be reflected accurately:
        //console.log(`${reaction.count} user(s) have given the same reaction to this message!`);
        //const msg_id = reaction.message.id;
        //const interaction = DB.getInteraction(msg_id, client.channels.cache.get('822859340812910592'));
        //console.log(interaction);
        if(user.bot === false ) {
            // const msg = '```Mail Code: '+ interaction +'```';
            // console.log(msg);
            // DB.getInteraction(msg_id, client.channels.cache.get('822859340812910592'));
            // client.channels.cache.get('822859340812910592').send(msg);
        }
    });
    
    client.on('message', async function(message){
        console.log(message);
        // If message is from user and if it's in a guild channel

     
        const sender = message.author;
        const pfp = 'https://cdn.discordapp.com/avatars/'+ sender.id +'/'+ sender.avatar +'.png';
        var userhandle = sender.username + '#' +  sender.discriminator;
        //console.log(message.channel);
        // If message is a direct reply
    
        console.log(message.author);
        let user = client.users.fetch(message.author.id);
        console.log(user);
        if(message.reference !== null && message.author.bot !== true) {

            // Get ID of message it's replying to (replied_message)
            message.channel.messages.fetch(message.reference.messageID)
            .then(async(replied_message) => {

                // If message is direct reply to bot post.
                if(replied_message.author.id === '789932059224702976') {

                    if(message.channel.type === 'dm') {
                        //let original_interaction = await 
                        console.log(message.author);
                        //console.log(client);
                    } else {
                        const guild_id = message.guild.id;
                        var guild_settings = await fetchSettings(guild_id);    
                    }
                    checkSettings(guild_settings);    
                    //var guild_settings = await fetchSettings(guild_id);

                    // Get original interaction from table
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
                        DB.getAuthor(interaction_id).then(author=>{

                            // If DM to bot, put response in inbox channel
                            if (replied_message.channel.type == "dm") {

                                // console.log(message.author);
                                reply.setColor(config.member_color);

                                DB.getMode(interaction_id).then(mode=>{

                                    // If initial interaction was set to anonymous, change author to hide user.
                                    if(mode == 'anon') {
                                        userhandle = 'User#' + truncateAuthorID(sender.id);
                                        reply.setAuthor(userhandle, config.anon_avatar);
                                    }

                                    // Get author of message being replied to and send to inbox channel
                                    DB.getAuthorByMsg(replied_message).then(replied_author_id=>{
                                        message.guild.channels.cache.get(guild_setting.inbox_channel).send("<@" + replied_author_id + ">", {embed: reply}).then(resp=>DB.insertReplies(interaction_id, resp.id, sender.id));    
                                    });
                                });
                                //message.author.send("You are DMing me now!");
                                // return;

                            // Else if reply to sender from inbox channel, forward message to DM.
                            } else {
                                reply.setColor(config.admin_color);
                                reply.setFooter(config.mail_footer + ". Sent from " + message.guild.name);
                                client.users.fetch(author).then(user=>user.send(
                                    'Your anonymous message has been responded to.',
                                    {embed: reply}
                                ).then(resp=>DB.insertReplies(interaction_id, resp.id, sender.id)));
                            }
                        });

                    });
                }
            })
            .catch(console.error);
          
        }

        if(message.content.length > 5 && message.content.substring(0, 5) === '!trix') {
                    // if(!guild_settings.set) {
                    //     console.log("go set");
                    //     //updateSettings(message, 'message');
                    //     return;
                    // }
    
            // if(!guild_settings.set) {
            //     console.log("go set");
            //     updateSettings(message, 'message');
            //     return;
            // }

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
                    param = param.substring(1, param.length - 1);
                } catch(err) {
                    console.log("Error in parsing " + message.content + ": ");
                    console.log(err);
                    message.channel.send("Unable to execute command. Double-check your format and try again?");
                    return;
                }                //console.log(param);
                //console.log(client.channels.cache);
                let channel = message.guild.channels.cache.find(channel => channel.name.toLowerCase() === param);
                //console.log(channel.id);
                //guild_settings.inbox_channel = channel;
                DB.updateInboxChannel(guild_id, channel.id);
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
                //console.log(param);
                //console.log(client.channels.cache);
                let channel = message.guild.channels.cache.find(channel => channel.name.toLowerCase() === param);
                //console.log(channel.id);
                //guild_settings.commands_channel = channel;
                //console.log(guild_id);
                DB.updateCommandsChannel(guild_id, channel.id);

            } else if(command == 'settings'){
                var body = '';
                console.log(guild_settings);
                for(var key in guild_settings) {
                    if(key !== 'set') {
                        var title = key[0].toUpperCase() + key.substring(1);
                        body += '\n' + title.replace("_", " ") + ': '
                        if (typeof guild_settings[key] === undefined || guild_settings[key] === ''){
                            body += "Not set"
                        } else if(key == 'inbox_channel' || key == 'commands_channel') {
                            //console.log(message.guild.channels.cache);
                            //console.log(guild_settings[key]);
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

            //console.log(guild_settings);
            checkSettings(guild_settings);
            // if(isSet(guild_settings)) {
            //     guild_settings.set = true;
            // }
        } 
    });
    
});

// function updateSettings(event, type) {
//     console.log(event);
//     var channel_id = '';
//     if(type == 'interaction') {
//         channel_id = event.channel_id;
//     } else if (type == 'message') {
//         channel_id = event.channel.id;
//     }
//     console.log(channel_id);
//     client.channel.cache.get(channel_id).send('Thank you for installing Trix! To start setting configuration, please type `!trix inbox [channel_name]` .');  
// }
function createMail(args, sender, id) {
    var user_id = '';
    var pfp ='';
    //console.log(args);
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

    const msg = new Discord.MessageEmbed()
                .setColor(config.member_color)
                .setTitle("Submission #" + truncateInteractionID(id))
                .setAuthor(user_id, pfp)
                .setDescription( args[0].value + '\n')
                // .addFields(
                //     { name: tag, value: args[1].value + '\n' },
                // )
                .setTimestamp()
                .setFooter(config.mail_footer);

    return msg;
}

function truncateInteractionID(id) {
    return id.substring(id.length - 5, id.length);
}

function truncateAuthorID(id) {
    return id.substring(id.length - 4, id.length)
}

async function fetchSettings(guild_id) {
    // var guild_settings = {};
    // Check if guild exists in table
    var exists = await DB.checkGuildExists(guild_id);
    //console.log(exists);

    if(exists) {

        // If it does exist, fetch settings
        var settings = await DB.getGuildSettings(guild_id);
        // .then(settings=>{
        //     //console.log(settings);
        //     if(isSet(settings).length === 0) {
        //         guild_settings.patreon_tier = settings.patreon_tier;
        //         guild_settings.commands_channel = client.channels.cache.get(settings.commands_channel);
        //         guild_settings.inbox_channel = client.channels.cache.get(settings.inbox_channel);
        //         guild_settings.default_mode = settings.default_mode;
        //         guild_settings.set = true;
        //     }
            
        //     //console.log(guild_settings);
        // });
    } else {
        DB.createGuildSettings(guild_id);
        DB.createRepliesTable(guild_id);
        DB.createInteractionssTable(guild_id);
        var settings = await DB.getGuildSettings(guild_id);
        // .then(settings=>{
        //     //console.log(settings);
        //     if(isSet(settings).length === 0) {
        //         guild_settings.patreon_tier = settings.patreon_tier;
        //         guild_settings.commands_channel = client.channels.cache.get(settings.commands_channel);
        //         guild_settings.inbox_channel = client.channels.cache.get(settings.inbox_channel);
        //         guild_settings.default_mode = settings.default_mode;
        //         guild_settings.set = true;
        //     }
            
        //     //console.log(guild_settings);
        // });
    }
    //console.log(settings.inbox_channel);
    return settings;
}

// function getGuildSettings(guild_id, settings) {
    
// }

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
