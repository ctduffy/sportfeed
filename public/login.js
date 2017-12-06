window.addEventListener('load', function(){
    var submitForm = document.getElementById('loginForm');//when user tries to send message
    submitForm.addEventListener('submit', function(event){ 
        name = document.getElementById('nameField').value
        event.preventDefault();
        window.location = "/index/" + name;
    } , false); 
}, false);
