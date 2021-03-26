// require the discord.js module
const Discord = require('./node_modules/discord.js');
const auth = require('./auth.json');
const DB = require('./database.js');
const commands = require('./commands.json');
var settings = require('./config.json');
const { WebhookClient } = require('discord.js');
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
        // console.log("MESSAGE");
        // console.log(message);
        // console.log("EO MESSAGE");
        const sender = message.author;
        //console.log(sender);
        const pfp = 'https://cdn.discordapp.com/avatars/'+ sender.id +'/'+ sender.avatar +'.png';
        var userhandle = sender.username + '#' +  sender.discriminator;

        // If message is a direct reply
        if(message.reference !== null) {
            
            // Get ID of message it's replying to
            message.channel.messages.fetch(message.reference.messageID)
            .then(replied_message => {
                // console.log("REPLIED MESSAGE");
                console.log('MessageReference: ' + message.reference.messageID);
                console.log('replied_message: ' + replied_message.id);
                // console.log("EO REPLIED MESSAGE");
                // console.log(message.reference.messageID);

                // If message is direct reply to bot post.
                if(replied_message.author.id === '789932059224702976') {

                    // Get interaction from table
                    DB.getInteraction(replied_message.id).then(interaction_id=>{
                        var reply = new Discord.MessageEmbed()
                            .setColor('#ffffff')
                            .setAuthor(userhandle, pfp)
                            .setTitle('RE: Submission #' + truncateInteractionID(interaction_id))
                            .setDescription(message.content)
                            .setTimestamp()
                            .setFooter(settings.mail_footer);


                        // Get author of replied_message being replied to
                        DB.getAuthor(interaction_id).then(author=>{

                            // If DM to bot, put response in inbox channel
                            if (replied_message.channel.type == "dm") {
                                // console.log(message.author);
                                reply.setColor(settings.member_color);

                                DB.getMode(interaction_id).then(mode=>{
                                    if(mode == 'anon') {
                                        userhandle = 'User#' + sender.id.substring(sender.id.length - 4, sender.id.length);
                                        reply.setAuthor(userhandle, settings.anon_avatar);
                                    }
                                    client.channels.cache.get('822859340812910592')
                                    .send("<@" + author + ">", {embed: reply}).then(resp=>DB.insertReplies(interaction_id, resp.id, sender.id));    
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
    
        if(message.content.substring(0, 5) == '/poll') {
            var params = message.content.match(/"([^"]*)"/g);
            //console.log(params);
            const parsed_params = parseOptions(params);
            console.log(parsed_params);
            const resp = new Discord.MessageEmbed()
                        .setColor('#ff0059')
                        .setTitle('')
                        .setAuthor(userhandle, pfp)
                        .addFields({name: parsed_params.title, value:parsed_params.body})
                        .setTimestamp()
                        .setFooter(parsed_params.footer);
        
            
            client.channels.cache.get('822859340812910592').send(resp).then(
                msg=>pollReact(parsed_params.emojis, msg)
            );
        

            message.delete();
        }

        // if(message.author.bot == true) {
        //     message.react("😄");
        // }
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
        var len = sender.user.id.length;
        user_id += 'User#' + sender.user.id.substr(len - 4, len);
        pfp = settings.anon_avatar;
    }

    // if(args[0].value == 'report') {
    //     tag = ':warning: Report';
    // } else {
    //     tag = ':speech_balloon: Suggestion';
    // }

    //var body = args[1].value + "\n ✉️:`"+id+"`";
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

function parseOptions(args) {
    var returns = {};
    var body = '';
    var emojis = [];
    //console.log(args);
    returns.title = '';
    returns.anon = false;
    returns.footer = '';
    const alphabet = ['🇦','🇧','🇨','🇩','🇪','🇫','🇬','🇭','🇮','🇯','🇰','🇱','🇲','🇳','🇴','🇵','🇶','🇷','🇸','🇹','🇺','🇻','🇼','🇽','🇾','🇿'];
    // const alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u','v','w','x','y','z']
    
    // Variable to start counting options
    var start = 0;
    returns.expiry = '';
    for(let i = 0; i < args.length;i++) {
        const val = args[i].substring(1, args[i].length-1);
        console.log(val);
        if(val == '!anon') {
            returns.anon = true;
        } else if(val.substring(0, 7) == '!expiry') {
            returns.expiry = val.substring(8, val.length);
            start++;
        } else {
            // If title is blank, set and continue looping.
            if(returns.title == '') {
                returns.title = val;
                start = i + 1;
            } else {
                body += ' \n ';
                var emoji = alphabet[i - start];
                emojis.push(emoji);

                var str = emoji + ' ' + val;
                body += str;
            }
            
        }
    }

    if(returns.anon == true) {
        returns.footer = 'This poll is in anonymous mode. Vote counts will be revealed once the poll has closed';
    }

    if(returns.expiry != '') {
        if(returns.footer == '') {
            returns.footer = 'This poll closes'
        }
        returns.footer += ' on ' + returns.expiry;
        returns.footer += '.';
    }
    returns.body = body;
    returns.emojis = emojis;
    return returns;
}

function pollReact(emojis, msg) {
    const alphabet = ['🇦','🇧','🇨','🇩','🇪','🇫','🇬','🇭','🇮','🇯','🇰','🇱','🇲','🇳','🇴','🇵','🇶','🇷','🇸','🇹','🇺','🇻','🇼','🇽','🇾','🇿']
    for(let i = 0; i < emojis.length; i++) {
        msg.react(alphabet[i]);
    }
}


function registerCommand(json) {
    client.api.applications(client.user.id).guilds('349214441604120578').commands.post({data: json});
}
// Log our bot in using the token from https://discord.com/developers/applications
client.login(auth.token);
