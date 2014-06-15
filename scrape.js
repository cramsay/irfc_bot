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

//Start periodic update of game text
Game.prototype.start_updates = function(){
	if(!this.timer){
		this.timer=setInterval(createDelegate(this,this.handle_game),this.interval);
		this.handle_game();
	}
};

//Stop periodic update of game text
Game.prototype.stop_updates = function(){
	clearInterval(this.timer);
};

//Grab, process and say new game commentary
Game.prototype.handle_game = function(){
	//Load game events page
	request(url_events+this.id, createDelegate(this,function(err, resp, body) {
		var norm_colour=this.colour;
		lines=[];
	    if (err)
	        throw err;
	    $ = cheerio.load(body);

	    //Add each event to our lines array
	    $('.live-text').each(function(i,e){
	    	$(e).children('span').each(function(i,e){
				lines.push(irc.colors.wrap('light_blue', $(this).text().trim(),norm_colour)+': '+$(this).next('p').text().trim()+'\n');	
	    	});
	    });

	    //Print out any new lines
		for(var i=lines.length-1-this.saidLines;i>=0;i--){
	    	console.log(lines[i])
	    	ircbot.bot.say(ircbot.config.channels[0],lines[i]);
	    }
	   	this.saidLines=lines.length;
	    
	}));
};

var colours=['gray','dark_red','dark_green','dark_blue']; //List of possible game colours
var games={};//Use this as an associative array or live games (actually an object)
var games_len=0;//Needed because games obj doesn't have .length property
function maintainGamesList(){
	//Load games page
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
		    			games[game_id].start_updates();
		    		}
		    	}
		    });

		    //When no live games are found take the oppertunity to
		    //do some easy garbage collection
		    if(!hits&&games_len){
		    	console.log('cleaning games...');
		    	for(var i in games){
		    		games[i].stop_updates();
		    		games[i]=null;
		    		games_len=0;
		    	}
		    }
	});
}

//Run game list maintenance every 5 minutes (and once, straight away)
setInterval(maintainGamesList,300000);
maintainGamesList();

//Print out details of all todays games
//This is what is called when a client types "!games"
function gameListDetails(){
	//Load games page
	request(url_games,function(err, resp, body) {
			
		    if (err)
		        throw err;
		    $ = cheerio.load(body);

		    //Set up 3 lists for different game types
		    var games_list = {live:[],past:[],future:[]};

		    //Find all games
		    $('tr').each(function(i,e){
		    	var id=$(e).attr('id');
		    	if(id && (id.indexOf('match-row-')==0)){

		    		var game_id = $(e).attr('id').replace('match-row-','');
		    		
	    			//Find any live games and display using correct colour (if possible)
		    		if($(e).hasClass('live'))
		    			games_list.live.push(
		    				irc.colors.wrap(games[game_id]?games[game_id].colour:'reset',$(e).find('.team-home').text().trim()+' vs '+$(e).find('.team-away').text().trim())+' : '+irc.colors.wrap('light_blue',$(e).find('.score').text().trim())
		    			);
		    		//Find any finished games
		    		else if($(e).hasClass('report'))
		    			games_list.past.push(
		    				$(e).find('.team-home').text().trim()+' vs '+$(e).find('.team-away').text().trim()+' : '+irc.colors.wrap('light_blue',$(e).find('.score').text().trim())
		    			);
		    		//Find any games yet to start
		    		else if($(e).hasClass('fixture'))
		    			games_list.future.push(
		    				$(e).find('.team-home').text().trim()+' vs '+$(e).find('.team-away').text().trim()+' : '+irc.colors.wrap('light_blue',$(e).find('.elapsed-time').text().trim().replace(/ +|\n/g,' '))
		    			);   			
		    	}
		    });

	    	//Print out each game lists
	    	for (t in games_list)
	    	if(games_list[t].length){
	    		ircbot.bot.say(ircbot.config.channels[0],' ');
    			ircbot.bot.say(ircbot.config.channels[0],irc.colors.wrap('dark_green',t+':'));
	    		for(var i=0;g=games_list[t][i++];)
	    			ircbot.bot.say(ircbot.config.channels[0],g);
	    	}
	    	ircbot.bot.say(ircbot.config.channels[0],' ');
	});
}