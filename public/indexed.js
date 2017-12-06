var socket = io.connect();
/*
window.addEventListener('load', function(){
    do{
    	var bool = true;
	    var nickname = '';
    	if(nickname!=''){
    		alert(nickname + "is in use right now. try a different one or go Anonymous");
    	}
	    nickname = prompt('Enter a nickname: ');
	    if(nickname ===''){
	        nickname = 'Anonymous';
	    }
	    socket.emit('nickname', nickname, function(name, namebool){
	    	nickname = name;
	    	bool = namebool;
	    });
	}while(!(bool || nickname == 'Anonymous'));
}, false);
*/
window.addEventListener('load', function(){
	$(".like_area").click(function(data){
		var sport = $(this).attr("id");
   		var user = document.querySelector('meta[name=nickname]').content;
   		socket.emit('like', sport, user);
	});
	var submitform = document.getElementById('loginForm');
	submitform.addEventListener('submit', function(event){ 
		alert("ya");
        event.preventDefault();
        name = document.getElementById('nameField').value;
      	window.location = "/new/" + name;
    });
});
socket.on('retry', function(){
	alert('that room already exists! try a different name or find it in the box of already existing rooms');
});


