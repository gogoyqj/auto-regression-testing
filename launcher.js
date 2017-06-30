// launch browsers && take screenshots
var fs = require('fs');
var path = require('path');
var webdriverio = require('webdriverio');
var nodejsFsUtils = require('nodejs-fs-utils');
var extDir = path.join(__dirname, 'host-switch-plus');
var tmpDir = process.env.TMPDIR;
var encoding = { encoding: 'utf8' }
var defaultModelJs = fs.readFileSync(path.join(extDir, 'js', 'background.js'), encoding);
var fecha = require('fecha');
var cwd = process.cwd();
var yaml = require('js-yaml');
var request = require('superagent');
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
    var gid = 'hsp_' + (options.gid || fecha.format(Date.now(), 'YYYY-MM-DD_HH:mm:SS_s'));
    var isMobile = options.isMobile;
    var hosts = options.hosts;
    var tmpExtDir = extDir;
    var rewriteUrls = options.rewriteUrls;
    // inject hosts
    if ((hosts instanceof Array) && hosts.length || rewriteUrls) {
        tmpExtDir = path.join(tmpDir, gid);
        nodejsFsUtils.copySync(extDir, tmpExtDir, function(err) {
            err && console.log(err);
        });
        var content = defaultModelJs.replace('/*__hosts__placeholder__*/', 'results = ' + JSON.stringify(hostFormat(hosts)) + ';').replace('/*__ruleDomains__placeholder__*/', 'ruleDomains = ' + JSON.stringify(rewriteUrls || {}) + ';');
        fs.writeFileSync(path.join(tmpExtDir, 'js', 'background.js'), content, encoding);
        allTmpDirs[tmpExtDir] = options.mode;
    }
    var desiredCapabilities = {
        browserName: 'chrome',
        chromeOptions: {
            mobileEmulation: { 
                "deviceName": "iPhone 6" 
            },
            args:['load-extension=' + tmpExtDir].concat(options._mode ? [] : ['window-size=375,800'])
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


function render(screenshots) {
    var html = '<p>Hosts 配置</p><textarea>' + screenshots.hosts + '</textarea>';
    screenshots = screenshots.screenshots;
    if (screenshots instanceof Array) {
        screenshots.forEach(function(item) {
            html += '<div class="screenshot-item">';
            html += '<p><a target="_blank" href="' + item.url.url + '">' + item.url.url + '</a> ' + item.url.name + '</p>';
            html += '<img src="data:image/png;base64,' + item.screenshot.value + '"/>'
            html += '</div>';
        }, this);
    } else {
        html = '<p class="warning">no screenshots taken</p>';
    }
    return html;
}

/**
 * @description launch a browser & screenshot
 * @return webdriverio browser instance
 */
exports.launch = function(options, url) {
    options._mode = options.mode === 'browsing';
    var config = genDefaultOptions(options);
    var outProm = Promise.resolve();
    var sessionInfo = path.resolve(cwd, '.auto-session.yaml');
    if (options._mode) {
        if (fs.existsSync(sessionInfo)) {
            var sessionData =  yaml.safeLoad(fs.readFileSync(sessionInfo, encoding));
            url = url || 'about:blank';
            if (sessionData.dev) {
                // try to connect and reload
                outProm = outProm.then(function() {
                    return new Promise(function(resolve, reject) {
                        var wdPath = "http://127.0.0.1:4444/wd/hub/session/" + sessionData.dev + '/';
                        var timer = setTimeout(function() {
                            reject('connect to ' + wdPath + 'time out');
                        }, 15000);
                        request
                            .post(wdPath + "execute")
                            .send({ script: "new Image().src=\"//--auto-regression-testing.com\";location.reload()", args: [] }) // sends a JSON post body
                            .end(function(err){
                                // 删除
                                if (err) {
                                    request.delete(wdPath).end();
                                }
                                clearTimeout(timer);
                                resolve(err ? null : 'share last create session');
                            });
                    })
                })
            }
        }
    }
    outProm.then(function(shallReturn) {
        if (shallReturn) return;
        var prom = Promise.resolve();
        var driver = webdriverio.remote(config.browser, 'promiseChain');
        var browser = driver.init({}).pause(500); // what **ck must pause here??
        var urls = options.urls;
        // var mode = options.mode;
        var response = {
            hosts: config.hosts,
            screenshots: []
        };
        if (options._mode) {
            return browser.url(url).then(function(session) {
                if (session && session.state === 'success') {
                    var sessionId = session.sessionId;
                    fs.writeFileSync(sessionInfo, 'dev: ' + sessionId, encoding);
                } else {
                    return Promise.reject('start browser failed');
                }
            });
        }
        urls.forEach(function(url) {
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
                    
                    response.html = fs.readFileSync(path.join(__dirname, 'tpl', 'view.html'), encoding).replace('<!--html-->', render(response));
                    return response;
                });
        }, function(err) {
            console.log('err', err);
            browser.end();
            clear();
        });
    })
    return outProm;
}


process.on('exit', function() {
    for (var tmp in allTmpDirs) {
        if (fs.existsSync(tmp) && allTmpDirs[tmp] !== 'browsing') {
            nodejsFsUtils.rmdirsSync(tmp);
        }
    }
});