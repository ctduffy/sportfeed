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

	socket.on('nickname', function(nickname, callbacks){
		var exists = 0;
		conn.query('SELECT * FROM users WHERE name = $1', nickname)
		.on('data', function(row){
			exists = 1;
			on = row.on;
		});
		old.on('end', function(){
			if(exists == 0){
				var newuser = conn.query("INSERT INTO users (Name) VALUES ($1)", nickname);
				console.log("curious");
				callbacks(true);
			}
			else{
				if(on == 1){
						callbacks(false);
					}
				else{
						var usere = conn.query("UPDATE users SET (on = 1) WHERE Name = $1", nickname);
						callbacks(true);
					}
			}
		});
	});

	socket.on('join', function(roomName, nickname, callback){
		socket.join(roomName);
		socket.nickname = nickname;
		socket.room = roomName;
		//console.log(socket.room)
		//console.log(roomName);
		//console.log(nickname);

		//broadcastMembership(roomName);

		var messages = []; //put messages here

		var m = conn.query('SELECT * FROM messages WHERE RoomName = $1',roomName);
		m.on('data', function(row){
			messages.push(row);

		});
		m.on('end', function(){
			//console.log(messages);
			callback(messages);
		});
	});

	socket.on('nickname', function(nickname){
		socket.nickname = nickname;
	});

	socket.on('like', function(sport, user){
		var userid;
		var l = conn.query('SELECT id FROM users WHERE Name = $1', user);
		l.on('data', function(row){
			console.log(row.id);
			userid = row.id;
		});
		l.on('end', function(){
			var n = conn.query('INSERT INTO likes (UserId, sport) VALUES ($1, $2)', [userid, sport]);
		})
	});

	socket.on('message', function(message, roomName){
		//console.log(message);
		//console.log(roomName);
		//var rooms = Object.keys(io.sockets.manager.roomClients[socket.id]);
		//var roomName = (rooms[0] = '') ? rooms[1].substr(1) : rooms[0].substr(1);

		var m = conn.query('INSERT INTO messages (RoomName, nickname, message) VALUES ($1, $2, $3)',[roomName, socket.nickname, message])

		var currentdate = new Date();
		var time = currentdate.getHours() + ":" + currentdate.getMinutes() + ":" + currentdate.getSeconds();

		//console.log(time);

		io.sockets.in(roomName).emit('message', socket.nickname, message, time);
	});

	socket.on('disconnect', function(){
		room = socket.room;
		deleteMember(socket.nickname);
	});


});

function deleteMember(nickname){
	var usere = conn.query("UPDATE users SET (on=0) WHERE Name = $1", nickname);
}
/*
function broadcastMembership(roomName){
	var sockets = io.sockets.clients(roomName);

	var nicknames = sockets.map(function(socket){
		return socket.nickname
	});

	console.log(nicknames);
	io.sockets.in(roomName).emit('membershipChanged', nicknames);
}*/

app.get('/index/:nickname', function(request, response){ //homepage
	//nickname is stored in req.params.nickname
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
	var q = conn.query('SELECT * FROM Rooms WHERE RoomName = $1', [request.params.roomName]);
	q.on('data', function(row){

	});
	q.on('end', function(){
		scrape_sport_scores(request, response, "rooms", "room");
		// this code is executed after all rows have been returned
	});
	q.on('err', function(){
		//response.write('there is nothing here');
		z = conn.query('INSERT INTO Rooms VALUES ($1)', [request.params.RoomName]);
		z.on('data', function(row){
			response.redirect('/'+ request.params.RoomName + '/' + request.params.nickname);
		})

	});

	var name = request.params.roomName; // 'ABC123' // ...
});

function compare(a,b) {
  if (a.last_nom < b.last_nom)
	return -1;
  if (a.last_nom > b.last_nom)
	return 1;
  return 0;
}
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

function regexMatch(regex, data){
	var matches = [];
	while (m = regex.exec(data)) {
		matches.push(m[1]);
	}
	return matches;
}

function get_game_data(games_array, sport){

	request_library('https://www.scorespro.com/rss2/live-'+sport.toLowerCase()+'.xml', function (error, responseNew, body) {

		var games_data = regexMatch(/<item>\s*(.*?)\s*<\/item>/g, body);

		for (var i = 0; i < games_data.length; i++) {
				var info = regexMatch(/<title>\s*(.*?)\s*<\/title>/g, games_data[i])[0];
				var score = info.split(': ')[2].split('-');
				var id = regexMatch(/<guid>\s*(.*?)\s*<\/guid>/g, games_data[i])[0];
				games_array.push({
						'name_team1': regexMatch(/\) #\s*(.*?)\s* vs #/g, info)[0],
						'name_team2': regexMatch(/vs #\s*(.*?)\s*:/g, info)[0],
						'score_team1': score[0],
						'score_team2': score[1],
						'status': regexMatch(/<description>\s*(.*?)\s*<\/description>/g, games_data[i])[0],
						'sport': sport,
						'id': id.split('livescore/')[1]
				})
		};

	});

}

function scrape_sport_scores(request, response, rooms, render_type){

	var games_array = []

	get_game_data(games_array, "Football");
	get_game_data(games_array, "Basketball");
	get_game_data(games_array, "Hockey");
	get_game_data(games_array, "Baseball");

	// function for scraping soccer data is slightly different due to differences in the website we are scraping
	request_library('https://www.scorespro.com/rss2/live-soccer.xml', function (error, responseNew, body) {

		var games_data = regexMatch(/<item>\s*(.*?)\s*<\/item>/g, body);
		for (var i = 0; i < games_data.length; i++) {
				var info = (regexMatch(/\) \s*(.*?)\s*: /g, games_data[i])[0]).split(' vs ');
				var score = regexMatch(/<description>\s*(.*?)\s*<\/description>/g, games_data)[0].split(': ')[1].split('-');
				var status = "";
				if (score[2].includes("Goal for")) status = "Goal Scored";
				else status = score[2];
				var id = regexMatch(/<link>\s*(.*?)\s*<\/link>/g, games_data[i])[0];
				games_array.push({
						'name_team1': info[0],
						'name_team2': info[1],
						'score_team1': score[0],
						'score_team2': score[1],
						'status': status,
						'sport': "Soccer",
						'id': id.split('livescore/')[1]
				})
		};

		var sports_likes_keys = {"Football": 0, "Basketball": 0, "Hockey": 0, "Baseball": 0, "Soccer": 0}
		var s = conn.query('SELECT * FROM Users WHERE Name = $1', request.params.nickname);
		s.on('data', function(row){
			current_id = row.id;
		});
		s.on('end', function(){
			j = conn.query('SELECT * FROM likes WHERE UserId = $1', current_id)
			j.on('data', function(row){
				sports_likes_keys[row['sport']]++;
			});
			j.on('end', function(){

				games_array.sort(function(a, b) {
					if(sports_likes_keys[a.sport] < sports_likes_keys[b.sport]) return 1;
					if(sports_likes_keys[a.sport] > sports_likes_keys[b.sport]) return -1;
					return 0;
				});

				if(render_type == "index") response.render('index.html',{nickname: request.params.nickname, roomlist: rooms, games_array: games_array});
				else if (render_type == "room") response.render('room.html', {roomName: request.params.roomName, nickname: request.params.nickname, games_array: games_array});

			});
		});
	});
}

server.listen(8080);
