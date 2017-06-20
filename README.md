# auto-regression-testing

help to auto regression your urls by take screenshot.

### install 

```
    // if available on npm
    npm install auto-regression-testing 
```

### usage

#### start a server and wait for post

start server

```
 // without a auto-regression-testing.yaml in current dir
 // start listening at port 8000
 auto-regression-testing
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
    auto-regression-testing
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