exports.http_build_query = function(formdata) 
		{  
	    var key, use_val, use_key, i = 0, tmp_arr = [];

	    for(key in formdata){
	        use_key = escape(key);
	        use_val = escape((formdata[key].toString()));
	        use_val = use_val.replace(/%20/g, '+');
	        tmp_arr[i] = use_key + '=' + use_val;
	        i++;
	    }
	    return tmp_arr.join('&');
	}
