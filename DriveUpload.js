var fs = require('fs');	
var path = require('path');
var mime = require("mime-types");
var async = require('async');
var google = require('googleapis');
var googleAuth = require('google-auto-oauth2');

exports.GoogleDrive = {
	SCOPES : ['https://www.googleapis.com/auth/drive','https://www.googleapis.com/auth/drive.file'],

	authClient : null, //Объект для аутентификации
	path_dir : "temporal_records", //Путь к папке с записями
	AUTH_PATH : null,

	remoteFolder : "root", //По умолчанию - корневая папка. 
	
	authentication : function(login,callback)
		{
		var CREDENTIALS_FILE = "credentials/"+login+".json";	

		fs.readFile(CREDENTIALS_FILE,function(err,file){
			
			if(err){
				console.err('не возможно открыть файл ${CREDENTIALS_FILE}');
				callback('не возможно открыть файл ${CREDENTIALS_FILE}');
				return;
				}
			
			var credentials = JSON.parse(file);
			var OAuth2 = google.auth.OAuth2;

			try{
			
			this.authClient = new OAuth2(
				credentials.installed.client_id, 
				credentials.installed.client_secret, 
				credentials.installed.redirect_uris[0]
				);	

				callback(null);

			}catch(err){
				callback("\n У файла "+CREDENTIALS_FILE+" искаженные данные! Невозможно открыть! \n");
			}

			});	
		},
		
	authorize : function(login,pass,subdomain,callback){
		this.AUTH_PATH = 'keys/' + login+'_key_auth.json';

		fs.readFile(this.AUTH_PATH, (err, token) => {
			if (err){
				this.queryFileAuth(login,row[0].password_gmail,function(err){
					callback(err);
					});
				}else{
				var auth_cred = JSON.parse(token);	

				 this.authClient.setCredentials({
					refresh_token: auth_cred.refresh_token
					}); 

				callback(null);
				}
			});	
		},	
		
	queryFileAuth : function(login,pass,callback)
		{
		var authUrl = this.authClient.generateAuthUrl({
			access_type : 'offline',
			scope: this.SCOPES
			});

		var params = {
    		email: login,
    		password: pass,
			};

		googleAuth.options = {
    		show: true,
    		webPreferences:{
        		partition: 'nopersist',
    			}
			};

	  		var createAuthFile = function(){	
				return new Promise(function(resolve,reject){

				googleAuth.getCode(authUrl,params,20000)
					.then(function(data){
					
						this.authClient.getToken(data.code,function(err,token){
							if(err)
								reject(err);
							else
								resolve(token);	
							});	

					}).catch(function(error){
						console.log(error);
						});
					});
				};

		createAuthFile()
			.then(function(token){
				this.authClient.setCredentials({
					refresh_token : token.refresh_token
				});			
			return token;
			})
			.then(function(token){
				fs.writeFile(AUTH_PATH,JSON.stringify(token));	
				callback(null);
			})
			.catch(function(err){
				callback(err);
			});
		},

 	upload : function(filename,callback)
	  	{
		var service = google.drive({version: 'v3', auth: this.authClient});		

	  	var path_file = path_dir+"/"+filename;
	  	var stats = fs.statSync(path.normalize(path_file));	

	  	if(!stats.isDirectory() && mime.lookup(path.extname(path_file)) == 'audio/mpeg')
	  		{
			service.files.create({	
				resource:{
					name: file,
					mimeType: mime.lookup(path.extname(path_file)),	//Определяет mime-type файла
					parents: [remoteFolder]	// id папки. root по умолчанию 
					},
				media:{
					mimeType: mime.lookup(path.extname(path_file)), //Определяет mime-type файла
					body: fs.createReadStream(path_file)		
					}

				},function(err,f){
					if(err) 
						callback(err,null,null);
					else 
						callback(null,id,"https://drive.google.com/file/d/"+f.id+"/view");
					});	
	  		}
	  	}
	}; //Конец Object GoogleDrive
