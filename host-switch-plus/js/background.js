var enableHosts = [];
var default_mode = 'pac_script';

chrome.webRequest.onCompleted.addListener(function (details) {
    data[details.tabId] = details.ip;
    setTimeout(function(){
        details.req = 'showip';
        details.hosts = enableHosts;
        chrome.tabs.sendRequest(details.tabId, details, function (response) {
            console.log('res:', response);
        });
    },1000);
}, {
    urls: [ 'http://*/*', 'https://*/*' ],
    types: [ 'main_frame' ]
});

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    enableHosts = request;
});
var script = '';
var results = [];
/*__hosts__placeholder__*/
for (var i = 0; i < results.length; i++) {
    var info = results[i];
    var ip = info.ip;
    var port = 80;

    if (info.domain.indexOf('*') != -1) {
        script += '}else if(shExpMatch(host,"' + info.domain + '")){';
    } else if (info.domain.indexOf(':') != -1) {
        var t = info.domain.split(':');
        port = t[1];
        script += '}else if(shExpMatch(url,"http://' + info.domain + '/*") || shExpMatch(url,"https://' + info.domain + '/*")){';
    } else {
        script += '}else if(host == "' + info.domain + '"){';
    }

    if (info.ip.indexOf(':') > -1) {
        var ip_port = info.ip.split(':');
        ip = ip_port[ip_port.length - 2];
        port = ip_port[ip_port.length - 1];
    }
    script += 'return "PROXY ' + ip + ':' + port + '; DIRECT";';

    script += "\n";
}

var data = 'function FindProxyForURL(url,host){ \n if(shExpMatch(url,"http:*") || shExpMatch(url,"https:*")){if(isPlainHostName(host)){return "DIRECT";' +
    script + '}else{return "' + default_mode + '";}}else{return "SYSTEM";}}';
chrome.proxy.settings.set({
    value: {
        //mode: 'system'
        // mode: 'direct'
        mode: default_mode,
        pacScript: {
            data:data
        }
    },
    scope: 'regular'
}, function () {

});