irfc_bot
========
A web scraper and irc bot to relay the BBC football live text commentary written in node.js


This small project is actually a result of another one ([bbc-lc](https://github.com/cramsay/bbc-lc)).
The goal was to create a ncurses interface to the BBC commentary.
However, I suck at UI design... I realised I was just trying to replicate the configuration I had for irssi 
(my irc client of choice). IRC bots are _cool_ and I could use some better OOP skills with javascript for my work.
So I turned it in to an IRC bot written in Node.js :)  
If you want to see it in action (and there is football happening) connect to "cramsay.co.uk" and join the "#fitba" channel.

## Usage
Any IRC user can type "!games" to have the bot return details of all of the games today.
Any live games will be detected automatically and the commentary will be posted by the bot in a unique-ish colour.
To run the bot, just change the ircbot.config object to point to your preferred IRC server and channel.

## Details
I made use of 3 node.js packages...  
* **Request** : for grabbing bbc pages  
* **Cheerio** : for parsing the DOM of pages  
* **IRC** : for interaction with the IRC server

This is my step in to node.js so it *is* not a golden example of good style...
For anyone in the position I was, here are a few helpful sites :)  
  1. [Node.js web scraping guide](http://blog.miguelgrinberg.com/post/easy-web-scraping-with-nodejs)
  2. [Node.js IRC tutorial](http://davidwalsh.name/nodejs-irc)

Just now it only searches for world cup games, however this is easily adapted to more competitions.
The real challange would be allowing users to pick which games to follow and which to ignore without much scope for griefing.
