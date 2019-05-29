
/**
 * @author 2017 Nidal Shevchenko
 * Integration for amoCRM via Mango Telecom and Google Drive. 
 */

var express = require("express");
var bodyParser = require("body-parser");
var multipart = require('connect-multiparty');
var fs = require('fs-extra');
var url = require('url');
var https = require('https');
var formidable = require('formidable');
var query = require("./queries").query;
var googleDrive = require("./DriveUpload").GoogleDrive;
var new_process = require("child_process");
var out = fs.openSync("logs/out.log","a");
var err = fs.openSync("logs/err.log","a");

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({'extended': true}));
var multipartMiddleware = multipart();

const SERVER_PORT = 9090;

var records = [];

var cert_params = {
	ssl: true,
	port: SERVER_PORT, 
	ssl_key: '/etc/apache2/ssl/mango.difway.ru.key',
	ssl_cert: '/etc/apache2/ssl/mango.difway.ru.crt',
	ssl_ca: '/etc/apache2/ssl/root_bundle.crt'
	};

var credentials = {
	key: fs.readFileSync(cert_params.ssl_key), 
	cert: fs.readFileSync(cert_params.ssl_cert),
	ca: fs.readFileSync(cert_params.ssl_ca), //Обязательный параметр.
	requestCert: false,
	rejectUnauthorized: true //Безопасный параметр
	};
	
	
app.post("/saveCred/",multipartMiddleware,function(req,res){
    
    if(req.body.login && req.files.upload)
      {
      var login = req.body.login;
      var tmp_path = req.files.upload.path;
      var new_location = 'credentials/'+req.body.login+'_credential.json';
      
      fs.rename(tmp_path,new_location,function(err){
        if(!err)
    	  googleDrive.authentication(login,0,function(err){
	  if(!err){
	    googleDrive.generateUrl(function(err,url){
	    if(!err)
		res.end(JSON.stringify({status: 'OK', url: url}));
	    else
               	res.end(JSON.stringify({status: 'error',  url: null}));	
		});	
	   }else   
             res.end(JSON.stringify({status: 'error', url: null})); 		
	  });
	        
    	 fs.unlink(tmp_path,function(){});
        });
      }
    else
      {
      console.log(req);
      res.end(JSON.stringify({status: "error", type: "bad request"}));
      }
    });
    
app.post("/PlayRecord/",function(req,res){
    if(req.body.recording_id && req.body.subdomain)
    {
    var subdomain = req.body.subdomain;
    var recording_id = req.body.recording_id;
    
    query("SELECT * from audio_records where mango_recording_id=? and amo_subdomain=?",[recording_id,subdomain])
	.then(function(row){

	var login = "nzs.vus@gmail.com";
	var key = "";		
				
	if(row.length > 0)
	{///
	
	var drive_recording_id = row[0].drive_recording_id;
	
	query("SELECT id FROM clients where name=?",[subdomain])
	  .then(function(row){
	
	console.log(row[0].id);
	   return query("SELECT GGLogin,GGKey FROM clients_info WHERE DT IN ( SELECT MAX( DT ) FROM clients_info WHERE ClientId=?)",
		    [row[0].id]);
						    
	}).then(function(row){
	
	   var login = row[0].GGLogin;
	   var key = row[0].GGKey;
	   
	   if(login == null)
	      login = "nzs.vus@gmail.com";
						      
	    googleDrive.authentication(login,1,function(err){							
		if(!err){
		 googleDrive.authorize(login,key,function(err){
		   if(!err)						   
                     googleDrive.download(drive_recording_id,res);
		  });
		}
		else
		{
		res.end(null);	
		}	
	     }); 
         });
	}///
	else
	{
	res.end(null);
	}
	}).catch(function(){});	
	}
	else
	  res.end(null);
    });
    
    
app.post("/createKey/",function(req,res){		
    if(req.body.key && req.body.login && req.body.type)
    {	
    var type = req.body.type;
    var key = req.body.key;
    var login = req.body.login;
    
     if(type == "Google"){	
	googleDrive.authentication(login,0,function(err){
	 if(!err){
	   console.log("key: "+key);		
	   googleDrive.queryFileAuth(key,function(err){
	  
	    if(!err)
	    {
	    res.end(JSON.stringify({status: 'OK'})); 
	    }	       
	    else 
	    {
	    console.log(err);
	    res.end(JSON.stringify({status: 'error_key'}));
	    }                         	
	  });
	}else{
	 console.log(err);
	 res.end(JSON.stringify({status: 'error_cred'}));
	}		
       }); 
      }
     }
     else
     {
      res.end(JSON.stringify({status: "error_params"}));	
     }
});
    
var server = https.createServer(credentials,app);
server.listen(SERVER_PORT,function(){console.log("Listening on port "+this.address().port);});


 setInterval(function(){

	if(records.length > 0){
		console.log("record extracted");
		var info_record = records.pop();
		get_Mango_Auth_values(info_record.amo_subdom,info_record.mango_id);
		}

	query("SELECT * FROM audio_records_inbound WHERE status=?",["new"])
	  .then(function(rows){
		if(rows.length > 0){	
		  console.log("new records!");
		  rows.forEach(function(row){
			query("UPDATE audio_records_inbound SET status=? WHERE mango_recording_id=?",["old",row.mango_recording_id]);
			//get_Mango_Auth_values(row.amo_subdomain,row.mango_recording_id);
			records.unshift({amo_subdom: row.amo_subdomain,mango_id: row.mango_recording_id});		
		     });
		}else
		    {
		    console.log("there is not records!");	
		    }
	
	   }).catch(function(err){
	      console.log(err);
	   });

	},2500);		

var get_Mango_Auth_values = function(subdomain,id_recording)
	{
	console.log(subdomain+" "+id_recording);
	var login;
	var pass;

	console.log("get mango auth values");
	
	query("SELECT id FROM clients where name=?",[subdomain])
	.then(function(row){

		console.log(row[0].id);
		return query(
			"SELECT VatsApiKey,VatsApiSalt,GGLogin,GGKey FROM clients_info WHERE DT IN ( SELECT MAX( DT ) FROM clients_info WHERE ClientId=?)",
			[row[0].id]
			)
		})
	.then(function(row){
	       
		login = row[0].GGLogin;
		key = row[0].GGKey;
	
		//console.log(login+" "+pass);
	
		var vats_api_key = row[0].VatsApiKey;
		var vats_api_salt = row[0].VatsApiSalt;

		//console.log(vats_api_key+" "+vats_api_salt);     

		createNewProcess(id_recording,vats_api_key,vats_api_salt,"test.amovich@gmail.com",key,subdomain);
		}).catch(function(err){
		  console.log(err);
		});  
	};

var createNewProcess = function() 
	{
	//console.log("creating new process");

	var child = new_process.spawn(
			process.argv[0],
			[
			"downloadAndUpload.js",
			arguments[0], //id_recording
			arguments[1], //vats_api_key
			arguments[2], //vats_api_salt
			arguments[3], //login_cloud
			arguments[4], //pass_cloud
			arguments[5]  //subdomain
			],
			{
			detached: true,
			stdio: ["ignore",out,err],
			}
		);	

	child.unref();
	}; //Запускаем дочерный процесс
