// all the middleware goes here
var middlewareObj = {};

middlewareObj.checkServerError = function (error, request, response, next) {
    // 出力するデータ
    var data = {
        method: request.method,
        protocol: request.protocol,
        version: request.httpVersion,
        url: request.url,
        name: error.name,
        message: error.message,
        stack: error.stack
    };
 
	// エラーを返却
    response.status(500);
    if (request.xhr) {
        response.json(data);
    } else {
        response.render('../views/errors/500', { data: data });
    }
};

module.exports = middlewareObj;