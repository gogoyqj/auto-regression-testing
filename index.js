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
        if (!data.urls) {
            err = 'one url specified at least';
        } else {
            data.isMobile = 'isMobile' in data ? data.isMobile : body.isMobile;
            data.mode = body.mode;
            data.gid = encodeURIComponent(cwd) + '_' + body.deploy_type;
            data.hosts = data.hosts && data.hosts[body.deploy_type || 'beta'];
            return launcher.launch(data).then(function(res) {
                resolve(res);
            }, function(e) {
                reject({
                    err: e
                })
            });
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
                    mode: options.mode
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