# auto-regression-testing

help to auto regression your urls by take screenshot.

### install 

```
    // if available on npm
    npm install auto-regression-testing 
```

### usage

#### requirements

+ [selenium-server-standalone](http://selenium-release.storage.googleapis.com/3.3/selenium-server-standalone-3.3.1.jar)
+ [chromedriver](https://sites.google.com/a/chromium.org/chromedriver/)
+ nodejs v6.10.0+

u can use npm: [selenium-standalone@latest](https://github.com/vvo/selenium-standalone) instead:

```
npm install selenium-standalone@latest -g
```

start selenium-server-standalone first.

#### start a server as remote service and wait for post

start server

```
 // without a auto-regression-testing.yaml in current dir
 // start listening at port 8000
 auto-regression-testing server
```

post data

```javascript
{
    "data": `
hosts:
 beta:
  # beta
  - 127.0.0.1 *.aaa.com,aaa.com
urls:
 - 首页 http://aaa.com/qreactGitHub/examples/index.html
isMobile: true
    `,
    "type": "yaml", // or json
    "isMobile": true // or false, if true, will open chrome in mobileEmulation mode
}
```

#### start browser in dev dir

```
    // with a auto-regression-testing.yaml in current dir
    auto-regression-testing start
```

auto-regression-testing.yaml

```yaml
aliases:
  - &ResponseHeader
    Access-Control-Allow-Origin: "*"
hosts:
 beta:
  # beta
  - 127.0.0.1:8099 *.aaa.com,aaa.com
 dev:
  # dev
  - 127.0.0.1 q.qunarzz.com,qunarzz.com
rewriteUrls:
  dev:
    - matchUrl: http://127.0.0.1/*/src/html/*
      rules:
      - http://127.0.0.1/destination/productList.do* http://searchtouch.qunar.com/destination/productList.do* xxxx
      - match: http://127.0.0.1/queryData/searchCommentList.do*
        replace: http://searchtouch.qunar.com/queryData/searchCommentList.do*
        title: xxxx
      - match: http://searchtouch.qunar.com/*
        responseRules:
          <<: *ResponseHeader
        requestRules:
        # on: true
      - http://127.0.0.1/stat.gif* http://searchtouch.qunar.com/stat.gif*
      - http://127.0.0.1/queryData/searchSightDetail.do* http://search.qunar.com/queryData/searchSightDetail.do*
      # on: true
# ${var} is not valid yaml sytax
host:
  dev: http://127.0.0.1/intention-search-h5-hy2/src/html/
  beta: http://127.0.0.1/intention-search-h5-hy2/src/html/
  prod: http://127.0.0.1/intention-search-h5-hy2/src/html/
baseUrl:
  dev: ${host}index.html 
  beta: ${host}index.html
  prod: ${host}index.html
baseUrlQreact:
  dev: ${host}qreact.html 
  beta: ${host}qreact.html
  prod: ${host}qreact.html
urls:
  - 首页 ${baseUrl}#place.summary?destination=上海
  - 首页2 ${baseUrlQreact}#place.detail?destination=上海
isMobile: true
```

u can just use auto-regression-testing to start browser with specified hosts, in other word, u can use this tool to manage ur hosts conveniently.

```
auto-regression-testing start --mode=browsing
```