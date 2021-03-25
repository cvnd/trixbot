// require the discord.js module
const Discord = require('./node_modules/discord.js');
const auth = require('./auth.json');
const DB = require('./database.js');
const commands = require('./commands.json');
var config = require('./config.json');
const { WebhookClient } = require('discord.js');
// create a new Discord client
const client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });
// when the client is ready, run this code
// this event will only trigger one time after logging in
client.once('ready', () => {
	console.log('Ready!');

    commands.forEach(element => {
        registerCommand(element);
    });

    client.ws.on('INTERACTION_CREATE', async interaction => {
        console.log(interaction);
        console.log(interaction.data);
        const command = interaction.data.name.toLowerCase();
        const args = interaction.data.options;
        const sender = interaction.member;
        if (command === 'mail'){ 
            const mail = sendMail(args, sender, interaction.id);
            DB.insertMessage(interaction);
            client.api.interactions(interaction.id, interaction.token).callback.post({
                data: {
                    type: 3,
                    data: {
                        content: "Your message has been sent successfully.",
                        flags: 64
                        }        
                }        
            })
        
            console.log(client.users.fetch(sender.user.id));
            client.users.fetch(sender.user.id).then(user=>user.send('The following message has been sent to the officers: ', {embed: mail}));
            client.channels.cache.get('822859340812910592').send(mail).then(msg=>{
                //msg.react('✉️');
                DB.postedMessage(interaction.id, msg.id);
            });
        
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
        const msg_id = reaction.message.id;
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
        console.log("MESSAGE");
        console.log(message);
        console.log("EO MESSAGE");
        const sender = message.author;
        //console.log(sender);
        const pfp = 'https://cdn.discordapp.com/avatars/'+ sender.id +'/'+ sender.avatar +'.png';
        const userhandle = sender.username + '#' +  sender.discriminator;

        if(message.reference !== null) {
            message.channel.messages.fetch(message.reference.messageID)
            .then(msg => {
                // If message is direct reply to bot post.
                if(msg.author.id === '789932059224702976') {
                  
                    const embed = new Discord.MessageEmbed()
                    .setColor('#ff0059')
                    .setTitle('Re: Submission #0972')
                    .setAuthor(userhandle, pfp)
                    // .setDescription(message.content)
                    .addFields(
                        { name: ':speech_balloon: Response!', value: message.content},
                        { name: '\u200B', value: '\u200B'}
                    )
                    .setTimestamp()
                    .setFooter("To respond anonymously, please directly reply to this message. It will be relayed to the officers on your behalf.");
        
                    if (msg.channel.type == "dm") {
                        console.log(message.author);
                        message.author.send("You are DMing me now!");
                        return;
                    }  
                    DB.getInteraction(message.reference.messageID)
                    .then(id=>{
                        DB.getAuthor(id)
                        .then(author=>{
                            client.users.fetch(author).then(user=>user.send(
                                'Your anonymous message has been responded to.',
                                {embed: embed}
                            ));

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

function sendMail(args, sender, id) {
    var user_id = '';
    var pfp ='';
    //console.log(args);
    // If the mode value is set and is set to public
    if(args.length == 2 && args[1].value == 'public') {
        user_id += sender.user.username + '#' + sender.user.discriminator; 
        pfp = 'https://cdn.discordapp.com/avatars/'+ sender.user.id +'/'+ sender.user.avatar +'.png';
        console.log(pfp);
    } else {
        var len = sender.user.id.length;
        user_id += 'User#' + sender.user.id.substr(len - 4, len);
        pfp = 'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/default-avatar.png';
    }

    // if(args[0].value == 'report') {
    //     tag = ':warning: Report';
    // } else {
    //     tag = ':speech_balloon: Suggestion';
    // }

    //var body = args[1].value + "\n ✉️:`"+id+"`";
    const resp = new Discord.MessageEmbed()
        .setColor('#0099ff')
        .setTitle("Submission #" + id.substring(id.length - 6, id.length))
        .setAuthor(user_id, pfp)
        .setDescription( args[0].value + '\n')
        // .addFields(
        //     { name: tag, value: args[1].value + '\n' },
        // )
        .setTimestamp()
        .setFooter('To respond to the user, please reply to this message directly. It will be forwarded to the user on your behalf.');

    return resp;
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
