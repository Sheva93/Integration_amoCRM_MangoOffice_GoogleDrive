
var pool = require("mysql").createPool({
		host: '',
		user: '',
		password: '',
		database: ''	
});

exports.query = function(sql,props)
	{
		return new Promise(function(resolve,reject){
			pool.getConnection(function(err,connection){
				connection.query(sql,props,function(err,res){
					if(!err)
						resolve(res);
					else
						reject(err);
					});

				connection.release();
				});
			});
	};
