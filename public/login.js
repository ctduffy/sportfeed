var socket = io.connect();

window.addEventListener('load', function(){
    var submitForm = document.getElementById('loginForm');//when user submits username
    submitForm.addEventListener('submit', function(event){ 
        name = document.getElementById('nameField').value;
        event.preventDefault(); //stop auto redirect
        socket.emit('nickname', name, function(bool){ //emit the nickname in the socket, and upon callback either allow this or not
        	if(bool == true){
        		window.location = "/index/" + name; //if not currently being used, redirect to the home page
        	}
        	else{ //if name is currently being used, alert and allow user to try again
        		alert("your account is being used right now!");
        		window.location = "/";
        	}
    	});
        
    } , false); 
}, false);
