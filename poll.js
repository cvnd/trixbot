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

