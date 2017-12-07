var socket = io.connect();

window.addEventListener('load', function(){
    var submitForm = document.getElementById('loginForm');//when user tries to send message
    submitForm.addEventListener('submit', function(event){ 
        name = document.getElementById('nameField').value;
        event.preventDefault();
        socket.emit('nickname', name, function(bool){
        	if(bool == true){

        		window.location = "/index/" + name;
        	}
        	else{
        		alert("your account is being used right now!");
        		window.location = "/";
        	}
    	});
        
    } , false); 
}, false);
