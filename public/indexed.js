var socket = io.connect();

window.addEventListener('load', function(){
	var user = document.querySelector('meta[name=nickname]').content;
	$(".like_area").click(function(data){
		var sport = $(this).attr("id");
   		socket.emit('like', sport, user);
	});
	var submitform = document.getElementById('roomForm');
	submitform.addEventListener('submit', function(event){
        event.preventDefault();
        name = document.getElementById('nameField').value;
      	window.location = "/new/" + name + "/" + user;
    });
});
socket.on('retry', function(){
	alert('that room already exists! try a different name or find it in the box of already existing rooms');
});
