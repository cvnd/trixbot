# trixbot
 Discord bot that allows for an anonymous feedback/reporting system with the ability to go back and forth between users while preserving the initiator's anonymity.
 
 ## Commands
 !trix help --- to see all available commands
 !trix inbox "inbox name" --- set the appropriate channel for Trix to post the messages. Make sure it has the appropriate (read, write) permissions! Include quotations.
 !trix settings --- view current settings (current inbox channel setting).
 /main [message] [mode (optional)] --- Slash command to mail message using Discord's built-in slash command features. Default mode is automatically set to 'anon,' but can be manually set to public for that message. On first use in a server, the interaction may fail. Re-send again and it should work properly.
