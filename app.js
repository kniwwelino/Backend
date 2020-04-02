const mqtt = require('mqtt');
const express = require('express');
const bodyParser = require('body-parser');
const logger = require('./logger.js');
const config = require('config');
const urlbroker = require('./config/urlbroker.js');
const fs = require('fs');
const md5File = require('md5-file');
const Queue = require('better-queue');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

var ids = {};

let compileQueue = new Queue(function(task, cb) {
	if (task.isPrepareQueue) {
		let spawn = require('child_process').spawn;
		let copy = spawn('./copyTemplate.sh', [task.macadr]);

		copy.on('close', function(code) {
			logger.log(`copying Template closed with Code: ${code} for ${task.macadr}`);
		});
		copy.on('error', function(err) {
			logger.log(`copying Template failed with Error: ${err} for ${task.macadr}`);
		});
	}

	compile(task.macadr, task.isPrepareQueue, cb);

}, { concurrent: 1 });
compileQueue.on('task_finish', function (taskId, result, stats) {
  // taskId = 1, result: 3, stats = { elapsed: <time taken> }
  // taskId = 2, result: 5, stats = { elapsed: <time taken> }
	logger.log(`taskId = ${taskId}, result: ${result}, stats = { elapsed: ${stats.elapsed} }`);
});

const mqttClient = mqtt.connect(urlbroker.url(), {
	clientId: config.get('broker.clientId')
});

mqttClient.on('connect', function(){
	console.log('mqtt client has connected!');
	mqttClient.subscribe('/management/from/+/status/libversion');
	mqttClient.subscribe('$SYS/broker/log/M/subscribe');
	mqttClient.subscribe('$SYS/broker/log/N');
});

mqttClient.on('message', function(topic, message) {
	let v = '';
	if (topic === '$SYS/broker/log/M/subscribe') {
		const regex = /.*?\/management\/to\/([A-F0-9]+)\/update/g;
		let m;
		if ((m = regex.exec(message)) !== null) {
			v = m[1];
	  }
	} else {
		v = topic.split("/")[3];
	}
	if (v.length === 12) {
		mac = v;
		id = v.substr(-6);
		var l = {};
		l[mac] = {'id': id,
							 'mac': mac,
							 'topic': topic.split("/")[5],
							 'message': message.toString(),
							 'ts': Date.now(),
						 	 'online': true };
		if (!ids[id]) {
			ids[id] = l;
			addPrepareWorkspaceQueue(mac);
			logger.log(`add: ID:${id}, MAC:${mac}, ${message.toString()}`);
			setTimeout(removeID, 7*24*60*1000*60, id, mac);
		} else {
			if (!ids[id][mac]) {
				var m = ids[id];
				m[mac] = {'id': id,
									 'mac': mac,
									 'topic': topic.split("/")[5],
									 'message': message.toString(),
									 'ts': Date.now(),
								 	 'online': true };
				ids[id] = m;
				addPrepareWorkspaceQueue(mac);
				logger.log(`add: ID:${id}, MAC:${mac}, ${message.toString()}`);
				setTimeout(removeID, 7*24*60*1000*60, id, mac);
			} else {
				updateID(mac);
				addPrepareWorkspaceQueue(mac);
				setTimeout(removeID, 7*24*60*1000*60, id, mac);
			}
		}
	};

	if (topic === '$SYS/broker/log/N') {
		const regex = /.*?Kniwwelino_([A-F0-9]+).*(kniwwelino|disconnecting)/g;
		let m;
		if ((m = regex.exec(message)) !== null) {
			if (ids[m[1]] && m[2]==='disconnecting') {
				logger.log(`offline: ${m[1]} disconnecting`);

				for(var i in ids[m[1]]){
			    var key = i;
			    var val = ids[m[1]][i];
					val.online = false;

			    console.log(key + " : " + JSON.stringify(val));
				}

				// if (ids[m[1]].length > 1) {
				// 	ids[m[1]].forEach(function(element) {
				// 		element.online = false;
				// 	});
				// } else {
				// 	let macEle = ids[m[1]];
				// 	console.log(macEle);
				// 	ids[m[1]].online = false;
				// }
			}
	  }
	}

});

function addPrepareWorkspaceQueue(mac) {
	//TODO add the preparation queue
	let exists = false;
	fs.mkdir(`./builds/${mac}/`, '774', function(err) {
  	if (err) {
      if (err.code == 'EEXIST') exists = true; // ignore the error if the folder already exists
    }
		if (!exists) {
			compileQueue.push({macadr:mac, isPrepareQueue:true});
		}
	});
}

function removeID(id, mac) {
	if (ids[id]) {
		if (ids[id][mac]) {
			var div = Date.now()-ids[id][mac].ts;
			if (div > 7*24*60*1000*60) { //older 5min 5*1000*60 // older 1 week 7*24*60*1000*60
				logger.log(`remove: ${id} ${mac} ${ids[id][mac].ts} ${div}`);
				delete ids[id][mac];
				logger.log(`remove ID: ${!Object.keys(ids[id]).length}`);
				if (!Object.keys(ids[id]).length) delete ids[id];
			} else {
				logger.log(`no remove: ${id} ${mac} ${ids[id][mac].ts} ${div}`);
			}
		}
	}
	return;
}

function updateID(mac) {
	var id = String(mac).substr(6);
	ids[id][mac].ts = Date.now();
	ids[id][mac].online = true;
	logger.log(`update: ${id} ${mac} ${ids[id][mac].ts} ${Date.now()}`);
	return true;
}

app.listen(config.get('app.port'), function() {
	console.log('Server is listening http://localhost:'+config.get('app.port'));
});

// app.use(function(req, res, next) {
// 	logger.log(`${req.ip}: ${req.originalUrl}`);
// 	next();
// });

app.use(function(req, res, next) {
	if (req.originalUrl.match(/xml=/i)) {
		logger.log(`${req.ip}: ${req.originalUrl}`);
	}
	next();
});

app.use(function(req, res, next) {
	if (req.originalUrl.match(/examples/i)) {
		logger.log(`${req.ip}: ${req.originalUrl}`);
	}	else if (req.originalUrl.match(/flasher/i)) {
		logger.log(`${req.ip}: ${req.originalUrl}`);
	}
	next();
});

app.use('/flasher', express.static(__dirname + '/flasher', {
  setHeaders: function(res, path) {
		res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
  }
}));
app.use('/examples', express.static(__dirname + '/KniwwelinoBlockly/examples'));
app.use('/user', express.static(__dirname + '/static/user'));
app.use('/', express.static(__dirname + '/KniwwelinoBlockly/ardublockly'));
app.use('/blockly', express.static(__dirname + '/KniwwelinoBlockly/blockly'));
app.use('/closure-library', express.static(__dirname + '/KniwwelinoBlockly/closure-library'));
app.use('/termsofuse', function(req, res, next) {
	var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            res.send(xmlHttp.responseText);
    }
    xmlHttp.open("GET", 'https://doku.kniwwelino.lu/termsofuseplatform?do=export_htmlbody', true); // true for asynchronous
    xmlHttp.send(null);
});

//added to use content from the Dokuwiki without enabling CORS
app.use('/doku', createProxyMiddleware({ target: 'https://doku.kniwwelino.lu', changeOrigin: true , //logLevel: 'debug',
	pathRewrite: {
	'^/doku': '/'
	},
}));

app.use(bodyParser.json({'limit':'2mb'}));
//middelware to decode text/* data, e.g. to receive the arduino code
app.use(function(req, res, next){
	if (req.is('text/*')) {
		req.text = '';
		req.setEncoding('utf8');
		req.on('data', function(chunk){ req.text += chunk });
		req.on('end', next);
	} else {
		next();
	}
});

app.get('/id', function(req, res) {
	if (req.query.id) {
		var reqID = req.query.id.toUpperCase();
		if (ids[reqID]) {
			var m = {};
			m[reqID] = ids[reqID];
			return res.send(m);
		} else if (reqID && !ids[reqID]) {
			return res.send({});
		}
	}
	res.status(403).send("Forbidden!");
});

//number of ids in the array
app.get('/size', function(req, res) {
	res.send(Object.keys(ids).length+'');
});

//TODO: add required logic here.
app.post('/compile', function(req, res) {
	if (req.query.id) {
		var reqID = req.query.id.toUpperCase();
	}
	if (req.query.mac) {
		var reqMAC = req.query.mac.toUpperCase();
		if (!reqID) {
			var reqID = String(reqMAC).substr(6);
		}
	}
	if (!reqMAC && reqID) {
		if (ids[reqID] && Object.keys(ids[reqID]).length) {
			if (Object.keys(ids[reqID]).length === 1) {
				var reqMAC = Object.keys(ids[reqID]);
				logger.log(`compile: MAC assigned by ID: ${reqID} ${Object.keys(ids[reqID])}`);
			} else {
				logger.log(`compile: ID is not unique no MAC assigned: ID:${ids[id]} entries:${Object.keys(ids[reqID]).length}`);
				//TODO message send to website
				return res.sendStatus(901);
			}
		}
	}

	if (!reqMAC || !reqID) {
		logger.log(`compile: cannot compile without ID or MAC`);
		//TODO message send to website
		return res.sendStatus(902);
	}

	logger.log(`upload: xml to compile:\n ${req.body.sketch_xml}`);
	logger.log(`compile: ino to compile:\n ${req.body.sketch_code}`);
	uploadIno(reqMAC, req.body.sketch_code, res);
	uploadXML(reqMAC, req.body.sketch_name, req.body.sketch_xml);

	logger.log(`compile: ${reqID} ${reqMAC}`);
	// console.log(req.text);

	// res.status(200);
	// res.send('{"responseText": "OK"}');
});

//TODO add logic
function uploadIno(mac, ino, res) {
	let exists = false;
	fs.mkdir(`./builds/${mac}/`, '774', function(err) {
  	if (err) {
      if (err.code == 'EEXIST') exists = true; // ignore the error if the folder already exists
    } else exists = true; // successfully created folder
		if (exists) {
			fs.writeFile(`./builds/${mac}/${mac}.ino`, ino, function(err) {
		    if(err) {
		        return console.log(err);
		    }
		    logger.log(`file uploaded: ${mac}.ino`);

				compile(mac, false, null, res);
			});
		}
  });

	return;
}

function uploadXML(mac, sketchname, xml) {
	let exists = false;
	fs.mkdir(`./static/user/${mac}/`, '774', function(err) {
  	if (err) {
      if (err.code == 'EEXIST') exists = true; // ignore the error if the folder already exists
    } else exists = true; // successfully created folder
		if (exists) {
			fs.writeFile(`./static/user/${mac}/${sketchname}.xml`, xml, function(err) {
		    if(err) {
		        return console.log(err);
		    }
		    logger.log(`file uploaded: ${sketchname}.xml`);
			});
			fs.writeFile(`./static/user/${mac}/latest.xml`, xml, function(err) {
		    if(err) {
		        return console.log(err);
		    }
		    logger.log(`file uploaded: latest.xml for ${mac}`);
				fs.writeFile(`./static/user/${mac}/latest.name`, sketchname, function(err) {
			    if(err) {
			        return console.log(err);
			    }
			    logger.log(`file uploaded: latest.name for ${mac}`);
				});
			});
		}
  });

	return;
}


function compile(mac, isPrepareQueue, callback, response) {
	let spawn = require('child_process').spawn;
	let prepare = spawn('./cleanWorkspace.sh', [mac]);

	prepare.on('close', function(code) {
		logger.log(`cleaning workspace closed with Code: ${code} for ${mac}`);
		if (code === 0)  {
			logger.log(`cleaning workspace ./builds/${mac}/: Done !`);

			let make = spawn('make', [], {cwd: `./builds/${mac}/`});
			let ide_data = '';
			make.stdout.on('data', (data) => {
				//logger.log(data.toString());
			});
			make.stderr.on('data', (data) => {
				//logger.log(data.toString());
				ide_data += data.toString().replace(/.*ino:/g, '');
			});

			make.on('close', function(code) {
				logger.log(`make closed with Code: ${code} for ${mac}`);

				if (isPrepareQueue) {
					callback();
				} else {
					if (code > 0) {
						let resObj = {};
						//`{"responseText": "FAILED", "code": ${code}, "success":false, "ide_mode" :"upload", "errors": [{"id": ${code-1}}], "ideData":{"err_output": "${ide_data}"}}`
						resObj.responseText = 'FAILED';
						resObj.code = code;
						resObj.success = false;
						resObj.ide_mode = 'upload';
						resObj.errors = [];
						var err = {};
						err.id = code-1;
						resObj.errors.push(err);
						resObj.ide_data = {};
						resObj.ide_data.err_output = ide_data;
						resObj.ide_data.std_output = '';

						response.status(200).send(JSON.stringify(resObj));
					} else {
						response.status(200).send(`{"responseText": "FAILED", "code": ${code}, "success":true, "ide_mode" :"upload"}`);
					}
				}
				if (code === 0 && !isPrepareQueue) {
					deploy(mac);
				} else return code;
			});

			make.on('error', function(err) {
				if (isPrepareQueue) callback();
				logger.log(`make failed with Error: ${err} for ${mac}`);
				response.status(200).send('{"responseText": "FAILED"}');//TODO is this code correct????
			});
		}

	});

	prepare.on('error', function(err) {
		if (isPrepareQueue) callback();
		logger.log(`prepare failed with Error: ${err} for ${mac}`);
	});

	return;
}

function deploy(mac) {
	let spawn = require('child_process').spawn;
	let deploy = spawn('./copyDeploy.sh', [mac]);

	deploy.on('close', function(code) {
		logger.log(`deploy with Code: ${code} for ${mac}`);
		if (code === 0) {
			mqttClient.publish(`/management/to/${mac}/update`, 'firmware');
		} else {
			//TODO fire a error message to the browser.
		}
	});

	deploy.on('error', function(err) {
		logger.log(`deploy failed with Error: ${err} for ${mac}`);
	});

	return;
}

//number of ids in the array
app.get('/updateFW', function(req, res) {
	//logger.log(req.headers);
	if (req.header('user-agent') === 'ESP8266-http-Update') {
		if (req.header('x-esp8266-sta-mac')) {
			let reqMAC = String(req.header('x-esp8266-sta-mac')).replace(/:/g, "");
			if (fs.existsSync(`./static/builds/${reqMAC}.ino.bin`)) {
				logger.log(`Kniwwelino is downloading: ${reqMAC}.ino.bin`);
				var opt = {
					root: __dirname + '/static/builds/',
					dotfiles: 'deny',
    			headers: {
						'Content-Disposition': `attachment; filename=${reqMAC}.ino.bin`,
						'x-MD5': md5File.sync(`./static/builds/${reqMAC}.ino.bin`)
					}
    		};
				logger.log(`sending firmware file: ${reqMAC}.ino.bin`);
				return res.sendFile(`${reqMAC}.ino.bin`, opt, (err) => {
					if (err) {
						logger.log(`error: ${err} occured during download of ${reqMAC}.ino.bin`);
					} else {
						logger.log(`success: ${reqMAC}.ino.bin downloaded`);
					}
				});
			} else {
				logger.log(`Kniwwelino no update for ${reqMAC}.ino.bin`);
				return res.sendStatus(304);
			}
		}
	}

	return res.sendStatus(403);
});
