// require the discord.js module
const Discord = require('./venv/Scripts/node_modules/discord.js');

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
                        "value" : "Suggestion"
                    },
                    {
                        "name" : "report",
                        "value" : "Report"
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
    
    registerCommand(omail_json);

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
            if(args[2].value == 'public') {
                console.log("GOOO");
                user_id += sender.user.username + '@' + sender.user.discriminator; 
                pfp = 'https://cdn.discordapp.com/avatars/'+ sender.user.id +'/'+ sender.user.avatar +'.png';
                console.log(pfp);
            // } else {
            //     var len = sender.user.id.length;
            //     user_id += 'User#' + sender.user.id.substr(len - 4, len);
            //     pfp = 'https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/default-avatar.png';
            }

            // full_message += interaction.data.options.message;
            // console.log(full_message);

            const embed_res = new Discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle(args[0].value)
            .setAuthor(user_id, pfp)
            .setDescription(args[1].value)
            .addFields(
                { name: 'Regular field title', value: 'Some value here' },
                { name: '\u200B', value: '\u200B' },
                { name: 'Inline field title', value: 'Some value here', inline: true },
                { name: 'Inline field title', value: 'Some value here', inline: true },
            )
            .addField('Inline field title', 'Some value here', true)
            .setImage('https://i.imgur.com/wSTFkRM.png')
            .setTimestamp()
            .setFooter('Some footer text here', 'https://i.imgur.com/wSTFkRM.png');

            client.api.interactions(interaction.id, interaction.token).callback.post({
                data: {
                    type: 4,
                    data: {
                        content: "hello world!!!"
                    }
                }
            })

            new Discord.WebhookClient(client.user.id, interaction.token).send(embed_res)

        }
    });

    
});


function registerCommand(json) {
    client.api.applications(client.user.id).guilds('349214441604120578').commands.post({data: json});
}
// Log our bot in using the token from https://discord.com/developers/applications
client.login('Nzg5OTMyMDU5MjI0NzAyOTc2.X95Pjw.uDTLfO1ZxOJqfz3ac3-Rn8hZ5gk');
