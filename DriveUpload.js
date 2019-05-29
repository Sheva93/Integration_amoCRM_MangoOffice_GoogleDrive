
/**
 * @author 2017 Nidal Shevchenko
 * 
 * Google Drive object - [Authentication, Authorization, Upload, Download, URL generation]; 
 */


var fs = require('fs');	
var path = require('path');
var mime = require("mime-types");
//var async = require('async');
var google = require('googleapis');
var googleAuth = require('google-auto-oauth2');

//var authClient;

exports.GoogleDrive = {
	SCOPES : ['https://www.googleapis.com/auth/drive','https://www.googleapis.com/auth/drive.file'],

	authClient : null, //Объект для аутентификации
	path_dir : "records", //Путь к папке с записями
	AUTH_PATH : null,

	remoteFolder : "root", //По умолчанию - корневая папка. 
	
	authentication : function(login,type,callback)
		{
		var CREDENTIALS_FILE = 'credentials/'+login+'_credential.json';
	        

		this.AUTH_PATH = 'keys/' + login+'_key_auth.json';

		var self = this;	

		fs.readFile(CREDENTIALS_FILE,"utf-8",function(err,file){
		      if(err){
			  console.log(err);
			  console.error('не возможно открыть файл ${CREDENTIALS_FILE}');
			  callback('не возможно открыть файл ${CREDENTIALS_FILE}');
			  return;
			 }
		       else{

			var credentials = JSON.parse(file);

			console.log(credentials.installed.client_id+" "+credentials.installed.client_secret+" "+credentials.installed.redirect_uris[0]);

			   var OAuth2 = google.auth.OAuth2;

			   console.log(credentials);

                           if(credentials.installed.client_id && 
				credentials.installed.client_secret && 
				credentials.installed.redirect_uris){  		

			    self.authClient = new OAuth2(
				credentials.installed.client_id, 
				credentials.installed.client_secret,
				credentials.installed.redirect_uris[0]
				);
				console.log("auth успешно создан");
				
				callback(null);
	
			     }else{
				console.log("Не удалось создать auth");	
				callback(JSON.stringify({status: 'error'}));	
				}	

		/*	}catch(err){
				callback("\n У файла "+CREDENTIALS_FILE+" искаженные данные! Невозможно открыть! \n");
				}    */
				}
			});	
		},
		
	authorize : function(login,key,callback){

		var self = this;

		fs.readFile(self.AUTH_PATH, (err, token) => {
			if (err){
				self.queryFileAuth(key,function(err){
					callback(err);
					});
				}else{

				var auth_cred = JSON.parse(token);	
				
				console.log(auth_cred);	

				 self.authClient.setCredentials({
					refresh_token: auth_cred.refresh_token
					}); 

				callback(null);
				}
			});	
		},

	generateUrl: function(callback){

		try{

	    	var authUrl = this.authClient.generateAuthUrl({
			access_type : 'offline',
			scope: this.SCOPES
			});

			callback(null,authUrl);
			console.log("url succefully")
		}catch(err)
			{
			console.log("url error");	
			callback(true,null);			
			}	

		//callback(authUrl);
	    },	
		
	queryFileAuth : function(code,callback)
		{
		var self = this;

		this.generateUrl(function(url){});

		//var code = '4/C6P_n3pO_xaCf90wpT0Zs5roa600lv1VEn90qag9Qd4';			
		//var code = code;

		self.authClient.getToken(code,function(err,token){

		   if(!err){
		      console.log(token);
 
		      self.authClient.setCredentials({
			    refresh_token : token.refresh_token
			    });
				
			fs.writeFile(self.AUTH_PATH,JSON.stringify(token),function(err){
	                    if(!err)
			         callback(null);
			     else
				callback("Error writing key file");	
			       });

			}
			else
		           callback(err);
			 
			});	
				
		},
		
	createFolder : function(callback)
	    {
	    var drive = google.drive({version: "v3", auth: this.authClient});
	    
	    var fileMetadata = {
		'name' : 'MangoOfficeRecordings',
		'mimeType' : 'application/vnd.google-apps.folder'
		};
		
	    drive.files.create({
		resource: fileMetadata,
		fields: 'id'
	    }, function(err, file) {
		if(err) {
		    callback(err,null);
		    console.log(err);
		} else {
		    callback(null,file.id);
		    }
		});
	    },
	    
	searchFolder : function(callback)
	    {
	    var drive = google.drive({version: "v3",auth: this.authClient});
	    
	    var fileMetadata = {
		'name' : 'MangoOfficeRecordings',
		'mimeType' : 'application/vnd.google-apps.folder'
		};
		
	    drive.files.list({
		q: "name='MangoOfficeRecordings' and mimeType='application/vnd.google-apps.folder'",
		fields: 'files(id,name)',
		spaces: 'drive'
	    }, function(err, res) {
		if(err){
    		  callback(err,null);
		}else{
		  callback(null,res.files);
		  }
	      });
	    },
	    
	constructUpload : function(filename,callback){
	    var self = this;
	    
	    this.searchFolder(function(err,folders){
		if(err){
		   console.log(err);
		    self.upload(filename,null,callback);
		}else
		    {
		    console.log(JSON.stringify(folders));
		    
		    if(folders.length > 0)
		     {
		     console.log("there is folders "+JSON.stringify(folders));
		     self.upload(filename,folders[0].id,callback);
		     }
		     else
		     {
		     console.log("there is not folders");
		     self.createFolder(function(err,id){
		        console.log(err);
		        
			if(err){
			    self.upload(filename,null,callback);    
			    }
			else
			    self.upload(filename,id,callback);
		        });    
		     }
		    }
		});
	    },

 	upload : function(filename,folderId,callback)
	  	{
	  	console.log(folderId);
	  	
		var self = this;
		var service = google.drive({version: 'v3', auth: this.authClient});		

	  	var path_file = this.path_dir+"/"+filename;
	  	var stats = fs.statSync(path.normalize(path_file));	

	  	if(!stats.isDirectory() && mime.lookup(path.extname(path_file)) == 'audio/mpeg')
	  		{
			service.files.create({	
				resource:{
					name: filename,
					mimeType: mime.lookup(path.extname(path_file)),	//Определяет mime-type файла
					parents: (folderId) ? [folderId] : [this.remoteFolder]	
					},
				media:{
					mimeType: mime.lookup(path.extname(path_file)), //Определяет mime-type файла
					body: fs.createReadStream(path_file)		
					}

				},function(err,f){
					if(err){ 
						callback(err,null,null);
					}else{ 
						fs.unlink(path_file,function(err){
							if(!err)
						        console.log(path_file+" Succefully has beed deleted");
							});

						callback(null,f.id,"https://drive.google.com/file/d/"+f.id+"/view");
						}
					});	
	  		}
	  	},

	   download: function(fileId,response){
		var self = this;
		
		var drive = google.drive({version: "v2",auth: self.authClient});

	     console.log("file id "+fileId);
	
	       drive.files.get({fileId: fileId},function(err,file){
	       
	        console.log(err);
	                     
	         drive.files.get({
                fileId: file.id,
		        auth: self.authClient,	
                alt: 'media'
		   })
		.on('end', function() {
		    //response.end(JSON.stringify({result: "done"}));
		   // response.end("done");		
  		    console.log("done");
		    })
    		.on('error', function(err) {
		    response.end(null);	
  		    console.log('Error during download', err);
		  })
		  .pipe(response);
		});

		}
	}; //Конец Object GoogleDrive
