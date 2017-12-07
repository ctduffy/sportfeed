var socket = io.connect();

window.addEventListener('load', function(){ 
	var user = document.querySelector('meta[name=nickname]').content; 
	$(".like_area").click(function(data){ //when a user clicks the like button on a game
		var sport = $(this).attr("id"); //get the sport from the id, and send that in a socket emit to the database to add to the likes databse for this user
   		socket.emit('like', sport, user);
	});
	var submitform = document.getElementById('roomForm');
	submitform.addEventListener('submit', function(event){ // if the user submits a name for a new room
        event.preventDefault(); //stop page redirect
        name = document.getElementById('nameField').value; //send that name in a new custom get request as below
      	window.location = "/new/" + name + "/" + user;
    });
});
socket.on('retry', function(){
	alert('that room already exists! try a different name or find it in the box of already existing rooms');
});
