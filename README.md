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
hosts:
 beta:
  # beta
  - 127.0.0.1 *.aaa.com,aaa.com
 dev:
  - 127.0.0.1 *.aaa.com,aaa.com
urls:
 - 首页 http://aaa.com/qreactGitHub/examples/index.html
isMobile: true
```

u can just use auto-regression-testing to start browser with specified hosts

```
auto-regression-testing start --mode=browsing
```