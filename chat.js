// Dependencies
var express = require('express'),
	socket = require('socket.io'),
	redis = require('redis'),
	url = require('url'),
  path = require('path'),
	// Server launch
	app = express.createServer(),
	io = socket.listen(app),
	// Redis database
	redisClient,
	// Extra variables
	conn_url,
	rtg,
	passwd;

console.log("Connecting to nodejitsu redis...")
conn_url = 'redis://nodejitsu:95d9494bbb7bb8f9e067cd601b9dd566@fish.redistogo.com:9377/';
rtg = url.parse(conn_url);
redisClient = redis.createClient(rtg.port, rtg.hostname);
passwd = rtg.auth.split(':')[1];
console.log("redis port:"+rtg.port+" hostname:"+rtg.hostname+" passwd:"+passwd);
redisClient.auth(passwd);

//sessionStore = new RedisStore(redisClient);

//Recuperamos listado de nombres ante una eventual caida
redisClient.del('names');

//Temporal, incluir underscore para esto
function find_user (usr, array){
	for (var i in array)
		if(array[i] === usr)
			return i;
	return -1;
};

//Evitando inyecciones de código
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

//Almacenando mensajes
function storeMessage(name,data){
	var message = JSON.stringify({name: name, data: data});
	redisClient.lpush("messages", message, function(err, response){
		redisClient.ltrim("messages", 0, 10);
	});
};

io.sockets.on('connection', function(client) {
	client.emit('server_messages', 'Connecting to chat...');

	client.on('join', function(name){
		var out_msgs = [],
			name = clean_message(name);

		//Adding new connected guy
		client.set('nickname', name);
		redisClient.sadd("names", name);

		//Sacando mensajes
		redisClient.lrange("messages", 0, -1, function(err, messages){
			messages = messages.reverse();

			messages.forEach(function(m){
				out_msgs.push(JSON.parse(m));
			});

			redisClient.smembers("names", function(err, names){
				client.emit('joined', {
					message: 'Connected as '+name,
					list: names,
					last_messages: out_msgs
				});
			});
		});

		client.broadcast.emit('new_connection', name);
	});

	client.on('disconnect', function(){
		client.get('nickname', function(err, name){
			//Desconectamos este usuario y avisamos la resto
			redisClient.srem("names",name);
			redisClient.smembers("names", function(err, names){
				client.broadcast.emit('server_messages', {
					message: name+" has gone...",
					list: names
				});
			});
		});
	});

	client.on('messages', function(data){
		data = clean_message(data);
		client.get('nickname', function(err, name){
			storeMessage(name,data);
			client.broadcast.emit('messages', {sender: name, message: data});
		});
	});
});

// Configuring express (Middleware)
app.configure(function () {
	app.use(app.router);
	app.use(express.static(path.join(__dirname, "static")));
});

// URLs and callbacks
app.get('/', function(request, response) {
	response.sendfile(path.join(__dirname,"index.html"));
});

// app.listen(80);
app.listen(7777);
