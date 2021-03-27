// require the discord.js module
const Discord = require('./node_modules/discord.js');
const auth = require('./auth.json');
const DB = require('./database.js');
const commands = require('./commands.json');
var settings = require('./config.json');
const { WebhookClient } = require('discord.js');
var guild_id = '';
// create a new Discord client
const client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });
// when the client is ready, run this code
// this event will only trigger one time after logging in
client.once('ready', () => {
    console.log(client.guilds);
	console.log('Ready!');

    // Register all commands
    commands.forEach(element => {
        registerCommand(element);
    });

    client.ws.on('INTERACTION_CREATE', async interaction => {

        if(guild_id == '') {
            guild_id = interaction.guild_id;
            //console.log(interaction);
        }

        //console.log(interaction);
        //console.log(interaction.data);
        const command = interaction.data.name.toLowerCase();
        const args = interaction.data.options;
        const sender = interaction.member;
        if (command === 'mail'){ 

            // Create embed
            const mail = createMail(args, sender, interaction.id);

            // Insert info into DB
            
            client.api.interactions(interaction.id, interaction.token).callback.post({
                data: {
                    type: 3,
                    data: {
                        content: "Your message has been sent successfully.",
                        flags: 64
                        }        
                }        
            })
        
            //console.log(client.users.fetch(sender.user.id));
            client.channels.cache.get('822859340812910592').send(mail).then(msg=>{
                DB.insertMessages(interaction, msg.id);
                DB.insertReplies(interaction.id, msg.id, sender.user.id);
                //msg.react('✉️');
                //DB.postedMessage(interaction.id, msg.id);
            });
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
    
    client.on('message', function(message){
        if(guild_id == '') {
            guild_id = message.guild_id;
        }
        // console.log("MESSAGE");
        // console.log(message);
        // console.log("EO MESSAGE");
        const sender = message.author;
        //console.log(sender);
        const pfp = 'https://cdn.discordapp.com/avatars/'+ sender.id +'/'+ sender.avatar +'.png';
        var userhandle = sender.username + '#' +  sender.discriminator;

        // If message is a direct reply
        if(message.reference !== null) {
            
            // Get ID of message it's replying to (replied_message)
            message.channel.messages.fetch(message.reference.messageID)
            .then(replied_message => {
                // console.log("REPLIED MESSAGE");
                //console.log('MessageReference: ' + message.reference.messageID);
                //console.log('replied_message: ' + replied_message.id);
                // console.log("EO REPLIED MESSAGE");
                // console.log(message.reference.messageID);

                // If message is direct reply to bot post.
                if(replied_message.author.id === '789932059224702976') {

                    // Get original interaction from table
                    DB.getInteraction(replied_message.id).then(interaction_id=>{

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
                            .setFooter(settings.mail_footer);


                        // Get author of original interaction
                        DB.getAuthor(interaction_id).then(author=>{

                            // If DM to bot, put response in inbox channel
                            if (replied_message.channel.type == "dm") {

                                // console.log(message.author);
                                reply.setColor(settings.member_color);

                                DB.getMode(interaction_id).then(mode=>{

                                    // If initial interaction was set to anonymous, change author to hide user.
                                    if(mode == 'anon') {
                                        userhandle = 'User#' + truncateAuthorID(sender.id);
                                        reply.setAuthor(userhandle, settings.anon_avatar);
                                    }

                                    // Get author of message being replied to
                                    DB.getAuthorByMsg(replied_message).then(replied_author_id=>{
                                        client.channels.cache.get('822859340812910592')
                                        .send("<@" + replied_author_id + ">", {embed: reply}).then(resp=>DB.insertReplies(interaction_id, resp.id, sender.id));    
                                    });
                                });
                                //message.author.send("You are DMing me now!");
                                // return;
                            } else {
                                reply.setColor(settings.admin_color);
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
    
    });
    
});

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
        pfp = settings.anon_avatar;
    }

    const msg = new Discord.MessageEmbed()
                .setColor(settings.member_color)
                .setTitle("Submission #" + truncateInteractionID(id))
                .setAuthor(user_id, pfp)
                .setDescription( args[0].value + '\n')
                // .addFields(
                //     { name: tag, value: args[1].value + '\n' },
                // )
                .setTimestamp()
                .setFooter(settings.mail_footer);

    return msg;
}

function truncateInteractionID(id) {
    return id.substring(id.length - 5, id.length);
}

function truncateAuthorID(id) {
    return id.substring(id.length - 4, id.length)
}

function registerCommand(json) {
    client.api.applications(client.user.id).commands.post({data: json});
}
// Log our bot in using the token from https://discord.com/developers/applications
client.login(auth.token);
