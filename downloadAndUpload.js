
var GoogleDrive = require("./DriveUpload").GoogleDrive;
var MangoRecord = require("./downloadRecord");
var query = require("./queries").query;

var get_datatime = function()
	{
	return new Date().toISOString().slice(0, 19).replace('T', ' ');
	};

var _log = function(message,type)
	{
	var datatime = get_datatime();
		
	switch(type){
		case 'out':
			console.log("\n"+datatime+" - "+message+"\n");
			break;
		case 'error':
			console.error("\n"+datatime+" - "+message+"\n");
			break;
		};	
	};

MangoRecord.createInstanceMango(process.argv[2],process.argv[3],process.argv[4]);

var downloadMangoRecord = MangoRecord.downloadRecord;

const id_audio = process.argv[2];
//const login = process.argv[5];

const login = 'test.amovich@gmail.com';

const key = process.argv[6];         

//const key = '4/LuzXcUjPjitg9sClri_aHTdlRKz6iOW2JMK1Vf7j8Dc';
const subdomain = process.argv[7];

var num_attemps = 0;

var callback_download = function(err,filename){
		if(!err){
			GoogleDrive.authentication(login,0,function(err){ //Authentication as Client of Google Drive
				if(!err){
					_log("Authenticated\n","out");
					GoogleDrive.authorize(login,key,function(err){ //Get authorization with key_file in keys folder
					if(!err){
						_log("Authorized\n","out");
						GoogleDrive.constructUpload(filename,function(err,id,url){ //Upload file to cloud Google Drive
						if(!err){
							_log("Uploaded","out");
							query("INSERT INTO audio_records SET "+ 
								"amo_subdomain=?, "+
								"mango_recording_id=?, "+ 
								"cloud_file=?, "+
								"cloud_type=?, "+
								"drive_recording_id=?",
								[subdomain,id_audio,url,"GoogleDrive",id])
							 .then(function(res){
								_log("Inserted new values","out");
								return query("DELETE FROM audio_records_inbound WHERE ??=?",["mango_recording_id",id_audio]);
								})
							 .then(function(res){
								_log("Process has been killed","out");
								process.exit(0);
								})
							 .catch(function(err){
								_log(err,'error');
								});
							
							}
						});
					    }
					});
				     }	
				});	

			}else if(err == 404){
				if(num_attemps < 13){
					num_attemps++;

					var datatime = get_datatime();

					query("UPDATE audio_records_inbound SET date_last_trying=?,try_counter=? WHERE mango_recording_id=?",[datatime,num_attemps,id_audio])
						.then(function(){
							_log("Попытка номер "+num_attemps,'out');
							var interval = 60000 * (5 * (num_attemps-1) == 0 ? 1 : 5 * num_attemps);

							setTimeout(function(){
								downloadMangoRecord(callback_download);
								},interval);	
						    })	
						.catch(function(){ });
					}else{
						query("DELETE FROM audio_records_inbound WHERE ??=?",["mango_recording_id",id_audio])
							.then(function(res){
								_log("Превышен лимит максимального количества попыток.",'error');	
								process.exit(0);
							})
							.catch(function(err){
								_log(err,'error');
							});
					}
				}else{
				      _log("error: "+err,'error');
				     }
			};	

downloadMangoRecord(callback_download);

