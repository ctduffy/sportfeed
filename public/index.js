var socket = io.connect();

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


$("#like_area").click(function(data){
	console.log(data);
})