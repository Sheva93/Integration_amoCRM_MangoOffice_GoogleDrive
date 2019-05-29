//var queries = require("./queries").query;
var https = require("https");
var fs = require('fs');	
var http_build_query = require('./http_build_query').http_build_query;
var sha256 = require('sha256');
var url = require("url");

var mangoParams = null;

var MangoObjParams = function(recording_id,vats_api_key,vats_api_salt)
	{
	//const RECORDING_URL = 'https://mango.difway.ru/widget/v2/develop/getrecording.php';
	//const MANGO_API_URL = 'https://app.mango-office.ru';
	const MANGO_API_URL = 'app.mango-office.ru';	// Mango external API url
	//const MANGO_API_ROUTE_URL = MANGO_API_URL+'/commands/route'; // Mango API url for routing incoming call
	//const MANGO_API_CALLBACK_URL = MANGO_API_URL+'/commands/callback'; // Mango API url for outgoing call	
	const MANGO_API_GETRECORDID_URL = MANGO_API_URL+'/vpbx/queries/recording/post/'; // Mango API url for recording id

	//var recording_id  = 'MToxMDAzMjA5NjoyNDQwMzE5MjY4OjA='; // id записи
	//var vats_api_key  = 'zi1w3j67vl7ndzd578ppd4effbzh43ct'; // код АТС
	//var vats_api_salt = 'c4g5dc2yo0csqfnoe23hx8n29c946co8'; // для создания подписи

	this.id_recording = recording_id;
	this.api_key = vats_api_key;
	this.api_salt = vats_api_salt;

	var data = {
    	'recording_id' : recording_id,
    	'action'       : "download"
	};

	var json = JSON.stringify(data);

	var post = http_build_query(
			{
		    'vpbx_api_key': vats_api_key,
		    'sign'        : sha256(`${vats_api_key}${json}${vats_api_salt}`),
		    'json'        : JSON.stringify(data)
			}
		);

	var opts = { 
		'host' : MANGO_API_URL,
        	'method' : 'POST', 
		'path' : '/vpbx/queries/recording/post',
		'headers' :
			{
        		'Content-Type': 'application/x-www-form-urlencoded',
        		'Content-Length': post.length //Buffer.byteLength(post)
			}
		}; 

	this.returnPost = function(){
		return post;		
		}

	this.returnOpts = function(){
		return opts;		
		}
};

exports.createInstanceMango = function(recoring_id,vats_api_key,vats_api_salt)
	{
	mangoParams = new MangoObjParams(recoring_id,vats_api_key,vats_api_salt);	
	};
	

exports.downloadRecord = function(callback)
	{

	console.log(mangoParams.returnPost());
	console.log("download record");

	var self = arguments.callee;
	var options = mangoParams.returnOpts();
	var data = '';
	var writeFile = '';
	var writeFileExists = false;
	//var downloadedData = 0;
	//var content_length = '';

	if(arguments[1])
		{
		var address = url.parse(arguments[1]);
		options.host = address.hostname;
		options.path = address.path;						
		}

	var req = https.request(options, (res) => {
		var filename = "";

		switch(res.statusCode)
			{
			case 200:
				//content_length = res.headers['content-length'];
				console.log(res.statusCode);
				break;
			case 302:
				console.log(res.statusCode);
				newAddress = res.headers.location;
				self.call(self,callback,newAddress);
				return;				
				break;
			case 404:
				callback(res.statusCode);
				break;
			case 500:
				console.log("Your request 505")
				break;
			default:
				callback(res.statusCode);
				return;
			};


		res.on('data', (data) => {		
			if(!writeFileExists)
				{
				var vremya = new Date().toISOString().slice(0, 19).replace('T', '_');

				filename = 'call_'+vremya+'_.mp3';

				writeFile = fs.createWriteStream("records/"+filename);	
				writeFileExists = true;
				}			
				//downloadedData += data.length;
				//console.log((downloadedData/content_length)*100);
				writeFile.write(data);
			});

		res.on('end', () => {
			writeFile.end();
			callback(null,filename);		
			});

		res.on('error',function(err){
			callback(err.code);
			console.log(err.code);
			});

	});

	req.write(mangoParams.returnPost()); //POST request
	req.end();

};