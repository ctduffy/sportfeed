var request_library = require('request');

var http = require('http');
var express = require('express');
var app = express();
var server = http.createServer(app);

var io = require('socket.io').listen(server);

var anyDB = require('any-db');
var conn = anyDB.createConnection('sqlite3://feed.sqlite');

var engines = require('consolidate');
app.engine('html', engines.hogan); // tell Express to run .html files through Hogan
app.set('views', __dirname + '/templates'); // tell Express where to find templates

app.use(express.bodyParser()); //middleware used for POST, see below

// allow requests to JS/CSS files in local public/ directory
app.use(express.static(__dirname + '/public'));


var users = [];

io.sockets.on('connection', function(socket){

	socket.on('nickname', function(nickname, callbacks){ //upon request to investigate nickname, ensures existence in database, and returns false if it is currently being used
		var exists = 0;
		conn.query('SELECT * FROM users WHERE name = $1', nickname)
		.on('data', function(row){ //if it exists in the database already
			exists = 1; 
			on = row.ison; //check if the user is currently on
		})
		.on('end', function(){
			if(exists == 0){ //if it doesnt exist yet, add to database and return true to callback
				conn.query("INSERT INTO users (Name) VALUES ($1)", nickname);
				callbacks(true);
			}
			else{
				if(on == 1){
						callbacks(false); //if it is currently being used return false
					}
				else{ //otherwise return true and set ison (marker of if in use) to true
						conn.query("UPDATE users SET ison = 1 WHERE Name = $1", nickname);
						callbacks(true);
					}
			}
		});
	});

	socket.on('join', function(roomName, nickname, callback){
		updateMember(nickname, 1);
		socket.join(roomName); //when you join a room, join that socket room
		socket.nickname = nickname; //set the socket nickname to users name
		socket.room = roomName;

		var messages = []; //put messages here

		var m = conn.query('SELECT * FROM messages WHERE RoomName = $1',roomName); //get all messages where roomname matches current roomname
		m.on('data', function(row){
			messages.push(row);
		});
		m.on('end', function(){
			callback(messages); //send messages back to the user
		});
	});

	socket.on('nickname', function(nickname){
		socket.nickname = nickname; //sets socket nickname
	});

	socket.on('like', function(sport, user){ //when a user likes a sport, add it to the table likes with the sport and user id
		var userid;
		var l = conn.query('SELECT id FROM users WHERE Name = $1', user); //get user id
		l.on('data', function(row){
			userid = row.id;
		});
		l.on('end', function(){
			conn.query('INSERT INTO likes (UserId, sport) VALUES ($1, $2)', [userid, sport]); //insert sport and user id into table
		})
	});

	socket.on('message', function(message, roomName){ //when a message is sent 

		var m = conn.query('INSERT INTO messages (RoomName, nickname, message) VALUES ($1, $2, $3)',[roomName, socket.nickname, message]) //insert message into database

		var currentdate = new Date(); //get date
		var time = currentdate.getHours() + ":" + currentdate.getMinutes() + ":" + currentdate.getSeconds();

		io.sockets.in(roomName).emit('message', socket.nickname, message, time); //send message to all users/sockets in the database
	});

	socket.on('disconnect', function(){ //when a user disconnects update their status in the database
		updateMember(socket.nickname, 0);
	});


});

function updateMember(nickname, which){
	conn.query("UPDATE users SET ison = $1 WHERE Name = $2", [which, nickname]);
}

app.get('/index/:nickname', function(request, response){ //homepage
	//nickname is stored in request.params.nickname
	updateMember(request.params.nickname, 1);
	var rooms = [];
	var q = conn.query('SELECT * FROM Rooms');
	q.on('data', function(row){
		rooms.push({RoomName:row.RoomName, nickname:request.params.nickname});
	});
	q.on('end', function(){
		scrape_sport_scores(request, response, rooms, "index");

	});

});

app.get('/', function(request, response){
	response.render('login.html');
});

app.get('/New/:name/:user', function(request, response){ //if there is a request for a new room, create a random name and redirect the user to the page with that as its name
	generateRoomIdentifier(request.params.name, function(worked){
		response.redirect('/index/' + request.params.user);
	});
});

app.get('/:roomName/:nickname', function(request, response){ //finds room and takes user to the page and fills out the room template so that it appears as the correct room
	updateMember(request.params.nickname, 1);
	var q = conn.query('SELECT * FROM Rooms WHERE RoomName = $1', request.params.roomName); //gets room 
	q.on('data', function(row){

	});
	q.on('end', function(){
		scrape_sport_scores(request, response, "rooms", "room");
		// this code is executed after all rows have been returned
	});
	q.on('err', function(){
		conn.query('INSERT INTO Rooms VALUES ($1)', [request.params.RoomName]) 
		.on('data', function(row){
			response.redirect('/'+ request.params.RoomName + '/' + request.params.nickname);
		});

	});

	var name = request.params.roomName;
});

function generateRoomIdentifier(name, callback) { //creates random name for all new rooms
	var tried = 0
	var z = conn.query('SELECT * FROM Rooms WHERE RoomName == $1', [name]);
	z.on('data', function(row){//if the room already exists
		tried = 1;
	});
	z.on('end', function(){
		if(tried == 0){
			var x = conn.query('INSERT INTO Rooms VALUES ($1)', [name]);
			callback(true);
		}
		else{
			callback(false);
		}
	});
};

// function that return matches of text in a substring using regular expressions (regex)
function regexMatch(regex, data){
	var matches = [];
	while (m = regex.exec(data)) {
		matches.push(m[1]);
	}
	return matches;
}

// function that scrapes game data for sport games
function get_game_data(games_array, sport){
	// get html of page using request module
	request_library('https://www.scorespro.com/rss2/live-'+sport.toLowerCase()+'.xml', function (error, responseNew, body) {
		// get html block that contains the info we want (all instances of games) using regexMatch a function we created to utilize regular expressions
		var games_data = regexMatch(/<item>\s*(.*?)\s*<\/item>/g, body);
		// loop through each game html
		for (var i = 0; i < games_data.length; i++) {
				// using regular expressions, get the text we want to display to the user, which is the team names, the team scores, status of the game, sport, and a unique game ID
				var info = regexMatch(/<title>\s*(.*?)\s*<\/title>/g, games_data[i])[0];
				var score = info.split(': ')[2].split('-');
				var id = regexMatch(/<guid>\s*(.*?)\s*<\/guid>/g, games_data[i])[0].split('livescore/')[1].replace('/', '-').replace('/', '');
				games_array.push({
						'name_team1': regexMatch(/\) #\s*(.*?)\s* vs #/g, info)[0],
						'name_team2': regexMatch(/vs #\s*(.*?)\s*:/g, info)[0],
						'score_team1': score[0],
						'score_team2': score[1],
						'status': regexMatch(/<description>\s*(.*?)\s*<\/description>/g, games_data[i])[0],
						'sport': sport,
						'id': id
				})
		};

	});

}

// this function gets all sport scores and renders the sports scores banner in html
function scrape_sport_scores(request, response, rooms, render_type){
	// used to store all the games
	var games_array = []

	// scrape game data for sports
	get_game_data(games_array, "Football");
	get_game_data(games_array, "Basketball");
	get_game_data(games_array, "Hockey");
	get_game_data(games_array, "Baseball");

	// function for scraping soccer data is slightly different due to differences in the website we are scraping
	request_library('https://www.scorespro.com/rss2/live-soccer.xml', function (error, responseNew, body) {
		// get html block that contains the info we want (all instances of games) using regexMatch a function we created to utilize regular expressions
		var games_data = regexMatch(/<item>\s*(.*?)\s*<\/item>/g, body);
		// loop through each game html
		for (var i = 0; i < games_data.length; i++) {
				// using regular expressions, get the text we want to display to the user, which is the team names, the team scores, status of the game, sport, and a unique game ID
				var info = (regexMatch(/\) \s*(.*?)\s*: /g, games_data[i])[0]).split(' vs ');
				var score = regexMatch(/<description>\s*(.*?)\s*<\/description>/g, games_data)[0].split(': ')[1].split('-');
				var status = "";
				if (score[2].includes("Goal for")) status = "Goal Scored";
				else status = score[2];
				var id = regexMatch(/<link>\s*(.*?)\s*<\/link>/g, games_data[i])[0].split('livescore/')[1].replace('/', '-').replace('/', '');
				games_array.push({
						'name_team1': info[0],
						'name_team2': info[1],
						'score_team1': score[0],
						'score_team2': score[1],
						'status': status,
						'sport': "Soccer",
						'id': id
				})
		};

		// initialize a dictionary for storing a user's likes of sports
		var sports_likes_keys = {"Football": 0, "Basketball": 0, "Hockey": 0, "Baseball": 0, "Soccer": 0}
		var s = conn.query('SELECT * FROM Users WHERE Name = $1', request.params.nickname); // find id of current user
		s.on('data', function(row){
			current_id = row.id;
		});
		s.on('end', function(){
			j = conn.query('SELECT * FROM likes WHERE UserId = $1', current_id) //find all likes from this user
			j.on('data', function(row){
				sports_likes_keys[row['sport']]++; // add a like to sport from returned row
			});
			j.on('end', function(){

				// sort the games_array based on the number of user likes for each sport by using sports_likes_keys dictionary
				games_array.sort(function(a, b) {
					if(sports_likes_keys[a.sport] < sports_likes_keys[b.sport]) return 1;
					if(sports_likes_keys[a.sport] > sports_likes_keys[b.sport]) return -1;
					return 0;
				});

				// render a certain html page (index or room) based on what is passed in
				// pass in certain variables including the games_array to display on the html page
				if(render_type == "index") response.render('index.html',{nickname: request.params.nickname, roomlist: rooms, games_array: games_array});
				else if (render_type == "room") response.render('room.html', {roomName: request.params.roomName, nickname: request.params.nickname, games_array: games_array});

			});
		});
	});
}

server.listen(8080);
