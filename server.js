var request = require('request');

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

	socket.on('nickname', function(nickname, callback){
		var exists = 0;
		var old = conn.query('SELECT * FROM users WHERE name = $1', nickname);
		old.on('data', function(row){
			exists = 1;
		});
		old.on('end', function(){
			if(exists == 0){
				var newuser = conn.query("INSERT INTO users (Name) VALUES ($1)", nickname);
				newuser.on('end', function(){
					console.log(nickname);
					if(users.indexOf(nickname) > -1){
						callback(false);
					}
					else{
						users.psuh(nickname);
						callback(true);
					}
				});
			}
			else{
				if(users.indexOf(nickname) > -1){
						callback(false);
					}
				else{
						users.push(nickname);
						callback(true);
					}
			}
		});
	})

	socket.on('join', function(roomName, nickname, callback){
		socket.join(roomName);
		socket.nickname = nickname;
		socket.room=roomName;
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
		//deleteMember(room, socket.nickname);
	});


});
/*
function deleteMember(roomName, nickname){
	var sockets = io.sockets.clients(roomName);

	var nicknames = sockets.map(function(socket){
		if(socket.nickname!= nickname){
			return socket.nickname
		}
	});

	console.log(nicknames);
	io.sockets.in(roomName).emit('membershipChanged', nicknames);
}*

function broadcastMembership(roomName){
	var sockets = io.sockets.clients(roomName);

	var nicknames = sockets.map(function(socket){
		return socket.nickname
	});

	console.log(nicknames);
	io.sockets.in(roomName).emit('membershipChanged', nicknames);
}*/

app.get('/index/:nickname', function(req, response){ //homepage
	//nickname is stored in req.params.nickname
	var rooms = [];
	var q = conn.query('SELECT * FROM Rooms');
	q.on('data', function(row){
		rooms.push({RoomName:row.RoomName, nickname:req.params.nickname});
	});
	q.on('end', function(){
		//console.log(rooms);
		var request = require('request');
		var games_array = []

		get_game_data(games_array, "Football");
		get_game_data(games_array, "Basketball");
		get_game_data(games_array, "Hockey");




		request('https://www.scorespro.com/rss2/live-soccer.xml', function (error, responseNew, body) {
			//console.log('error:', error); // Print the error if one occurred
			//console.log('statusCode:', responseNew && responseNew.statusCode); // Print the response status code if a response was received
			// console.log('body:', body); // Print the HTML for the Google homepage.
			// get_game_data(games_array, body, "Baseball");
			//console.log(games_array);

			var games_data = regexMatch(/<item>\s*(.*?)\s*<\/item>/g, body);
			for (var i = 0; i < games_data.length; i++) {
					var info = (regexMatch(/\) \s*(.*?)\s*: /g, games_data[i])[0]).split(' vs ');
					var score = regexMatch(/<description>\s*(.*?)\s*<\/description>/g, games_data)[0].split(': ')[1].split('-');
					var id = regexMatch(/<link>\s*(.*?)\s*<\/link>/g, games_data[i])[0];
					games_array.push({
							'name_team1': info[0],
							'name_team2': info[1],
							'score_team1': score[0],
							'score_team2': score[1],
							'status': score[2],
							'sport': "Soccer",
							'id': id.split('livescore/')[1]
					})
			};

			var sports_likes_keys = {"Football": 0, "Basketball": 0, "Hockey": 0, "Hockey": 0}
			var sports = ["football", "basketball", "hockey", "baseball"]
			var s = conn.query('SELECT * FROM Users WHERE Name = $1', req.params.nickname);
			s.on('data', function(row){
				current_id = row.Name;
			});
			s.on('end', function(){
				j = conn.query('SELECT * FROM likes WHERE UserId = $1', current_id)
				j.on('data', function(row){
					console.log(row);
				});
				j.on('end', function(){
					for (var i = 0; i < sports.length; i++) {
						var number_of_likes = 0;

						number_of_likes++;
					}
					sports_likes_keys[sports[i]] = number_of_likes;
					games_array.sort(function(a, b) {
						if(sports_likes_keys[a.sport] < sports_likes_keys[b.sport]) return -1;
						if(sports_likes_keys[a.sport] > sports_likes_keys[b.sport]) return 1;
						return 0;
					});
					response.render('index.html',{roomlist: rooms, games_array: games_array});

				});
});

		});
	});
});

app.get('/', function(request, response){
	response.render('login.html');
});

function compare(a,b) {
  if (a.last_nom < b.last_nom)
	return -1;
  if (a.last_nom > b.last_nom)
	return 1;
  return 0;
}
function generateRoomIdentifier(response) { //creates random name for all new rooms
	//console.log('new');
	var name = "";
	var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	for (var i = 0; i < 6; i++){ //for statement to make a new roomname
		name += chars.charAt(Math.floor(Math.random() * chars.length));
	}

	var z = conn.query('SELECT * FROM Rooms WHERE RoomName == $1', [name]);
	z.on('data', function(row){//if the room already exists
		generateRoomIdentifier(response);
	});
	z.on('end', function(){
		//console.log(result);
		var x = conn.query('INSERT INTO Rooms VALUES ($1)', [name]);
		response.redirect('/'+name);
	});
};
app.get('/New', function(request, response){ //if there is a request for a new room, create a random name and redirect the user to the page with that as its name
	generateRoomIdentifier(response);
});

app.get('/:roomName/:named', function(request, response){ //finds room and takes user to the page and fills out the room template so that it appears as the correct room
	var q = conn.query('SELECT * FROM Rooms WHERE RoomName = $1', [request.params.roomName]);
	q.on('data', function(row){

	});
	q.on('end', function(){
		response.render('room.html', {roomName: request.params.roomName, nickname: request.params.named});
		// this code is executed after all rows have been returned
	});

	q.on('err', function(){
		//response.write('there is nothing here');
		console.log('room requested doesnt exist');
	});

	var name = request.params.roomName; // 'ABC123' // ...
});

function regexMatch(regex, data){
	var matches = [];
	while (m = regex.exec(data)) {
		matches.push(m[1]);
	}
	return matches;
}

function get_game_data(games_array, sport){

	request('https://www.scorespro.com/rss2/live-'+sport.toLowerCase()+'.xml', function (error, responseNew, body) {
		//console.log('error:', error); // Print the error if one occurred
		//console.log('statusCode:', responseNew && responseNew.statusCode); // Print the response status code if a response was received

		var games_data = regexMatch(/<item>\s*(.*?)\s*<\/item>/g, body);
		console.log(games_data);
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

		// console.log(games_array);
	});

}

server.listen(8080);
