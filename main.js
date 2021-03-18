// require the discord.js module
const Discord = require('./venv/Scripts/node_modules/discord.js');
const auth = require('./auth.json');
// create a new Discord client
const client = new Discord.Client();

// when the client is ready, run this code
// this event will only trigger one time after logging in
client.once('ready', () => {
	console.log('Ready!');

    var omail_json = {
        "name": "mail",
        "description": "Send a suggestion/report to the officers",
        "options": [
            {
                "name" : "type",
                "description" : "Mail type",
                "type" : 3,
                "required" : true,
                "choices" : [
                    {
                        "name": "suggestion",
                        "value" : "suggest"
                    },
                    {
                        "name" : "report",
                        "value" : "report"
                    }
                ]
            },
            {
                "name": "message",
                "description": "Your message",
                "type": 3,
                "required": true
            },
            {
                "name": "mode",
                "description": "Choose to have username displayed to officers. Default is anonymous",
                "type": 3,
                "required": false,
                "choices" : [
                    {
                        "name": "anon",
                        "value": "anon"
                    },
                    {
                        "name": "public",
                        "value": "public"
                    }
                ]
            }
        ]
    }
    
    var response_json = {
        "name": "response",
        "description": "Respond to an anonymous message",
        "options": [
            {
                "name" : "id",
                "description" : "ID of message. Hit the mail icon on the desired message to get it.",
                "type" : 3,
                "required" : true
            },
            {
                "name": "message",
                "description": "Your message",
                "type": 3,
                "required": true
            }
        ]
    };
    registerCommand(omail_json);
    registerCommand(response_json);

    client.ws.on('INTERACTION_CREATE', async interaction => {
        console.log(interaction);
        console.log(interaction.data);
        const command = interaction.data.name.toLowerCase();
        const args = interaction.data.options;
        const sender = interaction.member;
        if (command === 'mail'){ 
            // here you could do anything. in this sample
            // i reply with an api interaction
            var user_id = '';
            var pfp ='';
            // If the mode value is set and is set to public
            console.log();
            if(args.length == 3 && args[2].value == 'public') {
                console.log("GOOO");
                user_id += sender.user.username + '@' + sender.user.discriminator; 
                pfp = 'https://cdn.discordapp.com/avatars/'+ sender.user.id +'/'+ sender.user.avatar +'.png';
                console.log(pfp);
            } else {
                var len = sender.user.id.length;
                user_id += 'User#' + sender.user.id.substr(len - 4, len);
                pfp = 'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/default-avatar.png';
            }

            // full_message += interaction.data.options.message;
            // console.log(full_message);
            var title ='';
            if(args[0].value == 'report') {
                title = ':warning: Report';
            } else {
                title = ':speech_balloon: Suggestion';
            }
            const resp = new Discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle(title)
            .setAuthor(user_id, pfp)
            .setDescription(args[1].value)
            .setTimestamp()
            .setFooter('To respond to the user, please hit on the envelope below. To preserve anonymity, you will get a specific respone ID and I will message the user on your behalf.');

            // client.api.interactions(interaction.id, interaction.token).callback.post({
            //     data: {
            //         type: 4,
            //         data: {
            //             content: "hello world!",
            //             embeds: [resp]
            //         }
            //     }
            // })

            // new Discord.WebhookClient(client.user.id, interaction.token).send({embed: embed_res}).then(embedMessage => {
            //     embedMessage.react(":incoming_envelope:");
            // });

            const botResponse = new Discord.WebhookClient(client.user.id, interaction.token);
            
            botResponse.send({embeds: [resp]}).then((msg)=>{console.log(msg);console.log(msg.constructor.name)}).catch(console.error);

            
        }

        if (command === 'response') {
            var id = args[0].value;
            var msg = args[1].value;

        }
    });

    client.on('message', function(message){
        if(message.content == 'react') {
            message.react("😄");
        }
    });
    
});
// {
//   id: '822207764872298516',
//   type: 0,
//   content: '',
//   channel_id: '822130272341590081',
//   author: {
//     id: '789932059224702976',
//     username: 'Trix',
//     avatar: null,
//     discriminator: '9600',
//     public_flags: 0,
//     bot: true
//   },
//   attachments: [],
//   embeds: [
//     {
//       type: 'rich',
//       title: ':speech_balloon: Suggestion',
//       description: 'asdasdasdsa',
//       color: 39423,
//       timestamp: '2021-03-18T20:40:06.880000+00:00',
//       author: [Object],
//       footer: [Object]
//     }
//   ],
//   mentions: [],
//   mention_roles: [],
//   pinned: false,
//   mention_everyone: false,
//   tts: false,
//   timestamp: '2021-03-18T20:40:07.027000+00:00',
//   edited_timestamp: null,
//   flags: 0,
//   webhook_id: '789932059224702976'
// }


function registerCommand(json) {
    client.api.applications(client.user.id).guilds('349214441604120578').commands.post({data: json});
}
// Log our bot in using the token from https://discord.com/developers/applications
client.login(auth.token);
