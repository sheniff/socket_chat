(function(){
	//Vars
	var //server = io.connect('http://sheniff.chat.jit.su:80'),
		server = io.connect('http://localhost:7777'),
		nickname;

	server.on('connect', function(data){
		while(!nickname || nickname == "")
			nickname = prompt("What's your nickname?");
		server.emit('join', nickname);
		addNewConnectedGuy(clean_message(nickname));
	});

	server.on('joined', function(data){
		appendMessage(data.message, null, "server");
		updateConnectionList(data.list);
		if(data.last_messages)
			updateMessages(data.last_messages);
	});

	server.on('new_connection', function(name){
		appendMessage("New guy has connected: "+name, null, "server");
		addNewConnectedGuy(name);
	});

	server.on('messages', function(data){
		appendMessage(data.message, data.sender);
	});

	server.on('server_messages', function(data){
		if (data.message)
			appendMessage(data.message, null, "server");
		else
			appendMessage(data, null, "server");

		if(data.list)
			updateConnectionList(data.list);
	});

	// Helpers
	function appendMessage(message, username, type){
		var $block;

		if(!type) type = 'client';
		if(username)
			$block = $('<li><span class="server"><strong>'+username+'<strong> said:</span> '+message+'</li>');
		else
			$block = $('<li>'+message+'</li>');

		$block
			.prependTo("#message_list")
			.addClass(type);
	};

	function addNewConnectedGuy(name){
		var $connection_list = $("#connection_list");

		$('<li>'+name+'</li>')
			.appendTo($connection_list);
	};

	function updateConnectionList(list){
		var i,
		$connection_list = $("#connection_list");

		$connection_list.empty();
		for(i in list)
			addNewConnectedGuy(list[i]);
	};

	function updateMessages(list){
		for(var i in list)
			appendMessage(list[i].data, list[i].name, "client");
	};

	function clean_message(message){
		var i,
		result,
		ret = "";
		for (var i in message){
			switch (message[i]) {
				case "<":
					result = "&lt;";
					break;
				case "<":
					result = "&gt;";
					break;
				case "&":
					result = "&amp;";
					break;
				default:
					result = message[i];
					break;
			}
			ret += result;
		}
		return ret;
	};

	// Setting up sender form
	$(document).ready(function($) {
    	$('#chat_form').submit(function(e){
    		e.preventDefault();
    		var message = $('#chat_input').val();
    		if(message && message != ""){
	    		//Sending message to server
	    		server.emit('messages', message);
	    		//Appending message to my own list
	    		appendMessage(clean_message(message), null, "me");
	    		//Clearing block
    			$('#chat_input').val("");
    		}
    	});

    	//Controlamos que el usuario cierra el chat, para enviar un mensaje al servidor de desconexión
    	$(window).on("beforeunload", function(e){
    		server.emit('disconnect');
    	});
	});
}());
