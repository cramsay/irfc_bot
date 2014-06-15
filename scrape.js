//Library includes
var request = require('request');
var cheerio = require('cheerio');
var irc = require("irc");

//URL "constants"
var url_games = 'http://www.bbc.co.uk/sport/shared/football/live-scores/matches/119001880/today';
var url_events = 'http://polling.bbc.co.uk/sport/shared/football/oppm/live-text-commentary/';

//Helper function to preserve "this" reference when using
//callback functions
function createDelegate(obj, handler)
{
    return function() {
        handler.apply(obj, arguments);
    }
}

//IRC setup
function IRCBot(){
	this.config = {
				channels: ["#fitba"],
				server: "cramsay.co.uk",
				botName: "fitbot"
	};
	this.bot = new irc.Client(this.config.server, this.config.botName, {
				channels: this.config.channels
	});
	this.bot.addListener("message", function(from, to, text, message) {
		if(text=='!games')
			gameListDetails();
	});
}
var ircbot = new IRCBot();

//Game object
function Game(game_id, colour){
	this.id = game_id;
	this.colour = colour;
	this.interval = 20000;
	this.timer;
	this.saidLines = 0;
}

Game.prototype.start_updates = function(){
	this.timer=setInterval(createDelegate(this,this.handle_game),this.interval);
	this.handle_game();
};

Game.prototype.stop_updates = function(){
	clearInterval(this.timer);
};

Game.prototype.handle_game = function(){
	request(url_events+this.id, createDelegate(this,function(err, resp, body) {
		var norm_colour=this.colour;
		lines=[];
	    if (err)
	        throw err;
	    $ = cheerio.load(body);

	    $('.live-text').each(function(i,e){
	    	$(e).children('span').each(function(i,e){
				lines.push(irc.colors.wrap('light_blue', $(this).text().trim(),norm_colour)+': '+$(this).next('p').text().trim()+'\n');	
	    	});
	    });

		for(var i=lines.length-1-this.saidLines;i>=0;i--){
	    	console.log(lines[i])
	    	ircbot.bot.say(ircbot.config.channels[0],lines[i]);
	    }
	   	this.saidLines=lines.length;
	    
	}));
};

var colours=['gray','dark_red','dark_green','dark_blue'];
var games={};//Use this as an associative array (actually an object)
var games_len=0;
function maintainGamesList(){
	request(url_games,function(err, resp, body) {
			
		    if (err)
		        throw err;
		    $ = cheerio.load(body);

		    //Find all live games
		    var hits=0;
		    $('tr.live').each(function(i,e){
		    	var id=$(e).attr('id');
		    	if(id && (id.indexOf('match-row-')==0)){
		    		hits++;
		    		var game_id = $(e).attr('id').replace('match-row-','');
		    		
		    		//Add game if it's new
		    		if(!games[game_id]){
		    			console.log('Adding new game : '+game_id);
		    			ircbot.bot.say(ircbot.config.channels[0],'Adding new game : '+game_id);
		    			games[game_id]= new Game(game_id,colours[games_len++%colours.length]);
		    		}
		    	}
		    });

		    //When no live games are found take the oppertunity to
		    //do some easy garbage collection
		    if(!hits&&games_len){
		    	console.log('cleaning games...');
		    	for(var i in games)
		    		games[i].stop_updates();
		    	games=[];
		    }

	    	//Start all found games
	    	for (var i in games)
	    		games[i].start_updates();
	});
}
setInterval(maintainGamesList,300000);
maintainGamesList();

function gameListDetails(){
	request(url_games,function(err, resp, body) {
			
		    if (err)
		        throw err;
		    $ = cheerio.load(body);

		    var games_list = {live:[],past:[],future:[]};
		    //Find games
		    $('tr').each(function(i,e){
		    	var id=$(e).attr('id');
		    	if(id && (id.indexOf('match-row-')==0)){

		    		var game_id = $(e).attr('id').replace('match-row-','');
		    		if($(e).hasClass('live'))
		    			games_list.live.push(
		    				irc.colors.wrap(games[game_id]?games[game_id].colour:'reset',$(e).find('.team-home').text().trim()+' vs '+$(e).find('.team-away').text().trim())+' : '+irc.colors.wrap('light_blue',$(e).find('.score').text().trim())
		    			);
		    		else if($(e).hasClass('report'))
		    			games_list.past.push(
		    				$(e).find('.team-home').text().trim()+' vs '+$(e).find('.team-away').text().trim()+' : '+irc.colors.wrap('light_blue',$(e).find('.score').text().trim())
		    			);
		    		else if($(e).hasClass('fixture'))
		    			games_list.future.push(
		    				$(e).find('.team-home').text().trim()+' vs '+$(e).find('.team-away').text().trim()+' : '+irc.colors.wrap('light_blue',$(e).find('.elapsed-time').text().trim().replace(/ +|\n/g,' '))
		    			);   			
		    	}
		    });

	    	//Print out game lists
	    	if(games_list.live.length){
	    		ircbot.bot.say(ircbot.config.channels[0],' ');
    			ircbot.bot.say(ircbot.config.channels[0],irc.colors.wrap('dark_green','Live games:'));
	    		for(var i=0;g=games_list.live[i++];)
	    			ircbot.bot.say(ircbot.config.channels[0],g);
	    	}
	    	if(games_list.past.length){
	    		ircbot.bot.say(ircbot.config.channels[0],' ');
    			ircbot.bot.say(ircbot.config.channels[0],irc.colors.wrap('dark_green','Finished games:'));
	    		for(var i=0;g=games_list.past[i++];)
	    			ircbot.bot.say(ircbot.config.channels[0],g);
	    	}
	    	if(games_list.future.length){
	    		ircbot.bot.say(ircbot.config.channels[0],' ');
    			ircbot.bot.say(ircbot.config.channels[0],irc.colors.wrap('dark_green','Upcoming games:'));
	    		for(var i=0;g=games_list.future[i++];)
	    			ircbot.bot.say(ircbot.config.channels[0],g);
	    	}
	    	ircbot.bot.say(ircbot.config.channels[0],' ');
	});
}