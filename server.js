var $ = require('jquery');

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

	socket.on('join', function(roomName, nickname, callback){
		socket.join(roomName);
		socket.nickname = nickname;
		socket.room=roomName;
		//console.log(socket.room)
		//console.log(roomName);
		//console.log(nickname);

		broadcastMembership(roomName);

		var messages = []; //put messages here

		var m = conn.query('SELECT * FROM messages WHERE RoomName = $1',[roomName]);
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
		deleteMember(room, socket.nickname);
	});


});
function deleteMember(roomName, nickname){
	var sockets = io.sockets.clients(roomName);

	var nicknames = sockets.map(function(socket){
		if(socket.nickname!= nickname){
			return socket.nickname
		}
	});

	console.log(nicknames);
	io.sockets.in(roomName).emit('membershipChanged', nicknames);
}

function broadcastMembership(roomName){
	var sockets = io.sockets.clients(roomName);

	var nicknames = sockets.map(function(socket){
		return socket.nickname
	});

	console.log(nicknames);
	io.sockets.in(roomName).emit('membershipChanged', nicknames);
}

app.get('/', function(request, response){ //homepage
	var rooms = [];
	var q = conn.query('SELECT * FROM Rooms');
	q.on('data', function(row){

		rooms.push({RoomName:row.RoomName});
	});
	q.on('end', function(){
		//console.log(rooms);
		var url = 'http://feeds.feedburner.com/raymondcamdensblog?format=xml';

		var yql = "https://query.yahooapis.com/v1/public/yql?q=select%20title%2Clink%2Cdescription%20from%20rss%20where%20url%3D%22http%3A%2F%2Ffeeds.feedburner.com%2Fraymondcamdensblog%3Fformat%3Dxml%22&format=json&diagnostics=true&callback=";

		var feed = "http://feeds.feedburner.com/raymondcamdensblog?format=xml";

    // $.ajax(feed, {
    //     accepts:{
    //         xml:"application/rss+xml"
    //     },
    //     dataType:"xml",
    //     success:function(data) {
    //         //Credit: http://stackoverflow.com/questions/10943544/how-to-parse-an-rss-feed-using-javascript
    //
    //         $(data).find("item").each(function () { // or "item" or whatever suits your feed
    //             var el = $(this);
    //             console.log("------------------------");
    //             console.log("title      : " + el.find("title").text());
    //             console.log("link       : " + el.find("link").text());
    //             console.log("description: " + el.find("description").text());
    //         });
    //
    //
    //     }
    // });

		response.render('index.html',{roomlist: rooms});
	});
});
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

app.get('/:roomName', function(request, response){ //finds room and takes user to the page and fills out the room template so that it appears as the correct room
	var q = conn.query('SELECT * FROM Rooms WHERE RoomName = $1', [request.params.roomName]);
	q.on('data', function(row){

	});
	q.on('end', function(){
		response.render('room.html', {roomName: request.params.roomName});
		// this code is executed after all rows have been returned
	});

	q.on('err', function(){
		//response.write('there is nothing here');
		console.log('room requested doesnt exist');
	});

	var name = request.params.roomName; // 'ABC123' // ...
});

$( document ).ready(function() {
    console.log( "ready!" );
});

server.listen(8080);
