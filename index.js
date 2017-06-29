#!/usr/bin/env node
var Koa = require('koa'),
    app = new Koa(),
    launcher = require('./launcher'),
    config = require('./config').config,
    yaml = require('js-yaml'),
    cwd = process.cwd(),
    path = require('path'),
    fs = require('fs'),
    program = require('commander'),
    encoding = {encoding: 'utf8'};

var urlNotSpecified = 'one url specified at least';

var placeHolder = '@@__@@';
var indexToName = ['name'];
/**
 * @description make url => { url: 'http://xxxx', name: 'xxx', script: '' };
 * @param {*} url 
 */
function urlFormat(urls, deploy_type, options) {
    var _urls = [],
        isArr = urls instanceof Array;
    for (var key in urls) {
        var url  = urls[key];
        if (typeof url === 'string') {
            var _url = {};
            url = format(decodeURIComponent(url), deploy_type, options);
            url.replace(/(^|[ ])http[s]?:\/\/[^\[\]\(\) \r\n]+[ ]?/g, function(u) {
                _url.url = u.trim();
                return placeHolder;
            }).split(placeHolder).forEach(function(parts, index) {
                if (indexToName[index]) {
                    _url[indexToName[index]] = parts.trim();
                }
            });
            if (!isArr) _url[indexToName[0]] = key;
            url = _url;
        } else {
            url.url = format(url.url, deploy_type, options);
        }
        _urls.push(url);
    }
    return _urls;
}

function formatRewriteUrls(rules) {
    var ruleMap;
    if (rules) {
        ruleMap = {};
        rules.forEach(function(item, index) {
            if (item.on !== false) item.on = true;
            if (!item.matchUrl) item.matchUrl = '*';
            if (item.rules) {
                item.rules = item.rules.map(function(rule) {
                    if (typeof rule === 'string') {
                        var _rule = {};
                        rule.replace(/(^[^ ]+)[ ]+([^ ]+)(.*$)/g, function(mat, fr, to, title) {
                            _rule.match = fr.trim();
                            _rule.replace = to.trim();
                            _rule.title = title;
                        });
                        rule = _rule;
                    }
                    if (rule.on !== false) rule.on = true;
                    if (('requestRules' in rule) || ('responseRules' in rule)) {
                        rule.type = 'headerRule';
                    } else {
                        rule.type = 'normalOverride';
                    }
                    return rule;
                });
            } else {
                item.on = false;
            }
            ruleMap[item.id = 'd' + index] = item;
        })
    }
    return ruleMap;
}

function format(url, deploy_type, options) {
    var reg = /\$\{([^\}]+)\}/g;
    url = url.replace(reg, function(mat, val) {
        var configValue = options[val] || '';
        configValue = deploy_type in configValue ? configValue[deploy_type] : configValue;
        return configValue;
    });
    if (url.match(reg)) return format(url, deploy_type, options);
    return url;
}

function runRegression(body) {
    return new Promise(function(resolve, reject) {
        var type = body.type,
            data = decodeURIComponent(body.data),
            err;
        if (type === 'json') {
            try {
                data = JSON.parse(data);
            } catch(e) {
                err = e;
            }
        } else {
            try {
                data = yaml.safeLoad(data);
            } catch(e) {
                err = e;
            }
        }
        var urls = data.urls;
        if (!urls) {
            err = urlNotSpecified;
        } else {
            data.isMobile = 'isMobile' in data ? data.isMobile : body.isMobile;
            data.mode = body.mode;
            var deploy_type = body.deploy_type || 'beta';
            data.gid = encodeURIComponent(cwd) + '_' + deploy_type;
            data.hosts = data.hosts && data.hosts[deploy_type];
            var rewriteUrls = data.rewriteUrls;
            rewriteUrls = rewriteUrls && rewriteUrls[deploy_type] || rewriteUrls;
            data.rewriteUrls = formatRewriteUrls(rewriteUrls);
            // different deploy_type different urls
            if (!(urls instanceof Array)) {
                var differentUrls = urls[deploy_type];
                if (deploy_type === 'prod' && !differentUrls) {
                    for (var dType in urls) {
                        if (String(dType).indexOf('beta') === 0) {
                            differentUrls = urls[dType];
                            break;
                        }
                    }
                }
            } else {
                differentUrls = urls;
            }
            if (differentUrls) {
                data.urls = urlFormat(differentUrls, deploy_type, data);
                var url = body.url;
                if (url === true || url === 'true') {
                    url = 0;
                }
                if (+url >= 0) {
                    url = data.urls[+url];
                    url = url && url.url;
                } else if (url.indexOf('http') !== 0) {
                    url = data.urls.find(function(item) {
                        item.name === url;
                    });
                }

                return launcher.launch(data, url).then(function(res) {
                    resolve(res);
                }, function(e) {
                    reject({
                        err: e
                    })
                });
            }
            err = urlNotSpecified;
        }
        if (err) {
            reject({ err: err });
        }
    });
}

program
    .version('0.0.1');

program
    .command('start')
    .description('start chrome with specified hosts')
    .option('-y,--yaml [value]', 'specify a yaml for auto regression, default is: auto-regression-testing.yaml', 'auto-regression-testing.yaml')
    .option('-d,--deploy_type [value]', 'specify deploy_type, can be: dev, beta or prod, determines which hosts to be used, default is: dev', 'dev')
    .option('-m,--mode [value]', 'specify mode, if mode === browsing, just start the browser, default is: testing', 'testing')
    .option('-u, --url [value]', 'specify a url to open if mode === browsing', false)
    .action(function(options) {
        // if there is auto-regression-testing.yaml file, must be dev
        var ifYAML = path.join(cwd, options.yaml);
        if (fs.existsSync(ifYAML)) {
            ifYAML = fs.readFileSync(ifYAML, encoding);
            if (ifYAML) {
                return runRegression({
                    data: ifYAML,
                    type: 'yaml',
                    deploy_type: options.deploy_type,
                    mode: options.mode,
                    url: options.url
                }).then(function(res) {
                    var html = path.join(cwd, 'auto-regression-testing.html');
                    fs.writeFileSync(html, res.html, encoding);
                }, function(err) {
                    console.log('err', err);
                });
            }
        } else {
            console.log('err', ifYAML, 'not found');
        }
    });
    
program
    .command('server')
    .description('start a server listen to post')
    .option('-p,--port [value]', 'specify the port which post server listens', config.httpServerPort)
    .action(function(options) {
        var router = require('koa-router')(),
            koaBody = require('koa-body');
        var port = options.port;
        console.log('start listening at port:', port);
        router
            .post('/auto-regression-testing', koaBody(), function(ctx) {
                    return runRegression(ctx.request.body).then(function(res) {
                        ctx.body = res;
                    }, function(err) {
                        ctx.body = err;
                    })
            }).get('*', function(ctx) {
                ctx.body = {err: "POST ONLY"};
            });
        app.use(router.middleware());
        app.listen(port);
    });
program.parse(process.argv);