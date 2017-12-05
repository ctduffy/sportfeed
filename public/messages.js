var socket = io.connect();

window.addEventListener('load', function(){
    socket.on('message', function(nickname, message, time){
        addOne(nickname, message, time);
    });

    socket.on('membershipChanged', function(members){
        //console.log(members);
        $('#memberList').empty();
        //console.log('#memberList');
        //console.log(members.length);
        for(var i = 0; i < members.length; i++){
            //console.log(members[i]);
            if(members[i] != null){
                $('#memberList').append("<li><span class=\"member\"></span>" + members[i] + "</li><br>");
            }
        }


    });
    var meta = document.querySelector('meta[name=roomName]');
    var roomName = meta.content;

    var nickname = prompt('Enter a nickname: ');
    console.log(nickname);

    if(nickname ===''){
        nickname = 'Anonymous';
    }

    socket.emit('join', roomName, nickname, function(messages){
        addMessages(messages);
    });

    var messageForm = document.getElementById('messageForm');//when user tries to send message
    messageForm.addEventListener('submit', function(event){

        updateScroll(); //scrolls to bottom of messages div

        // prevent the page from redirecting
        event.preventDefault();
        socket.emit('message', document.getElementById('messageField').value, roomName)
        document.getElementById('messageField').value='';
    } , false);
}, false);

function addOne(nickname, message, time){
    //console.log(message);
    $('#messages').append("<li> <span class=\"username\">" + nickname + ":"+"</span> <span class=\"time\">" + "(" + time + ")"+"</span> <span class=\"text\">" + message+ "</span></li><br>");
    updateScroll();
}

function addMessages(messages){
    //console.log(messages);
    //var data = JSON.parse(messages);
    var data=messages;
    for (var i = 0; i < data.length; i++) {
    // have to check if this message is already here
        //add text, name
        if(data[i].nickname==''){
            data[i].nickname='Anonymous';
        }
        $('#messages').append("<li id=\"" + data[i].id + "\"> <span class=\"username\">" + data[i].nickname + ":"+"</span> <span class=\"time\">" + "(" + data[i].time + ")"+"</span> <span class=\"text\">" + data[i].message + "</span></li><br>");

    }

}

function updateScroll(){ //taken from: http://stackoverflow.com/questions/18614301/keep-overflow-div-scrolled-to-bottom-unless-user-scrolls-up
    //scrolls to bottom of all messages
    var element = document.getElementById("messages-box");
    element.scrollTop = element.scrollHeight;
}
