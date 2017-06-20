// launch browsers && take screenshots
var fs = require('fs');
var path = require('path');
var webdriverio = require('webdriverio');
var nodejsFsUtils = require('nodejs-fs-utils');
var extDir = path.join(__dirname, 'host-switch-plus');
var tmpDir = path.join(__dirname, 'tmp');
var defaultModelJs = fs.readFileSync(path.join(extDir, 'js', 'background.js'), { encoding: 'utf8' });
var fecha = require('fecha');

var placeHolder = '@@__@@';
var indexToName = ['name'];
/**
 * @description make url => { url: 'http://xxxx', name: 'xxx', script: '' };
 * @param {*} url 
 */
function urlFormat(url) {
    var _url = url;
    if (typeof url === 'string') {
        _url = {};
        url = decodeURIComponent(url);
        url.replace(/(^|[ ])http[s]?:\/\/[^\[\]\(\) \r\n]+[ ]?/g, function(u) {
            _url.url = u.trim();
            return placeHolder;
        }).split(placeHolder).forEach(function(parts, index) {
            if (indexToName[index]) {
                _url[indexToName[index]] = parts.trim();
            }
        });
    }
    return _url;
}

/**
 * @description 
    {
        "0": {
            "ip": "100.80.21.71:9876",
            "domain": "*.bbb.com",
            "tags": "",
            "note": "",
            "status": 1,
            "order": 1,
            "uptime": "2017-06-19 16:59:54",
            "id": 0
        }
    }
 * @param {*} hosts 
 */
function hostFormat(hosts) {
    var _hosts = [], cnt = 0;
    hosts.forEach(function(host, index) {
        host = host.trim();
        if (host.indexOf('#') === 0) return;
        host = host.split(' ');
        if (host.length < 2) return;
        var domain = host[1].split(',');
        domain.forEach(function(item) {
            _hosts.push({
                ip: host[0],
                domain: item.trim(),
                status: 1,
                order: index,
                id: cnt,
                uptime: "2017-06-19 16:59:54",
                tags: host.slice(2).join(' '),
                note: ""
            });
            cnt++;
        });
    });
    return _hosts;
}

var allTmpDirs = {};
function genDefaultOptions(options) {
    var gid = 'hsp_' + fecha.format(Date.now(), 'YYYY-MM-DD_HH:mm:SS_s');
    var isMobile = options.isMobile;
    var deploy_type = options.deploy_type || 'beta';
    var hosts = options.hosts;
    hosts = hosts && hosts[deploy_type];
    var tmpExtDir = extDir;
    // inject hosts
    if ((hosts instanceof Array) && hosts.length) {
        tmpExtDir = path.join(tmpDir, gid);
        nodejsFsUtils.copySync(extDir, tmpExtDir, function(err) {
            err && console.log(err);
        });
        var content = defaultModelJs.replace('/*__hosts__placeholder__*/', 'results = ' + JSON.stringify(hostFormat(hosts)) + ';');
        fs.writeFileSync(path.join(tmpExtDir, 'js', 'background.js'), content, { encoding: 'utf8' });
        allTmpDirs[tmpExtDir] = '';
    }
    var desiredCapabilities = {
        browserName: 'chrome',
        chromeOptions: {
            mobileEmulation: { 
                "deviceName": "iPhone 6" 
            },
            args:['load-extension=' + tmpExtDir, 'window-size=375,800']
        }
    };
    if (!isMobile) {
        delete desiredCapabilities.chromeOptions.mobileEmulation;
    }
    var config = {
        hosts: hosts,
        tmpExtDir: hosts && tmpExtDir,
        browser: {
            desiredCapabilities: desiredCapabilities
        }
    }
    return config;
}

/**
 * @description launch a browser & screenshot
 * @return webdriverio browser instance
 */
exports.launch = function(options) {
    var config = genDefaultOptions(options);
    var driver = webdriverio.remote(config.browser, 'promiseChain');
    var browser = driver.init({}).pause(500); // what **ck must pause here??
    var urls = options.urls;
    var prom = Promise.resolve();
    var response = {
        hosts: config.hosts,
        screenshots: []
    };
    urls.forEach(function(url) {
        url = urlFormat(url);
        prom = prom.then(function() {
            return new Promise(function(resolve, reject) {
                browser
                    .url(url.url)
                    .pause(1000)
                    .screenshot()
                    .then(function(base64) {
                        response.screenshots.push({
                            url: url,
                            screenshot: base64
                        });
                        resolve();
                    }, reject);
            });
        });
    });
    function clear() {
        console.log('close browser');
        if (config.tmpExtDir) {
            nodejsFsUtils.rmdirsSync(config.tmpExtDir);
            delete allTmpDirs[config.tmpExtDir];
        }
    }
    prom = prom.then(function() {
        clear();
        return browser
            .end()
            .then(function() {
                return response;
            });
    }, function(err) {
        console.log('err', err);
        browser.end();
        clear();
    });
    return prom;
}


process.on('exit', function() {
    for (var tmp in allTmpDirs) {
        if (fs.existsSync(tmp)) {
            nodejsFsUtils.rmdirsSync(tmp);
        }
    }
});