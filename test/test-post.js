var config = require('../config').config;
var postJson = require("post-json");

var url = "http://127.0.0.1:" + config.httpServerPort + '/auto-regression-testing'
var body = `
hosts:
 beta:
  # beta
  - 127.0.0.1 *.aaa.com,aaa.com
urls:
 - 首页 http://aaa.com/qreactGitHub/examples/index.html
isMobile: true
`;
postJson(url, {
        type: 'yaml',
        isMobile: true,
        deploy_type: 'beta',
        data: encodeURIComponent(body)
    }, function (err, result) {
        if (err) {
            console.log(err);
            process.exit(500);
        }
        var body = result.body;
        console.log(JSON.parse(body).html);
    });