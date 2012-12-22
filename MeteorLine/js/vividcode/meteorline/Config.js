
/// <reference path="ms-appx://Microsoft.WinJS.1.0/js/base.js" />
(function () {
    "use strict";

    var Config = {
        twitter: {
            consumerKey: "YOUR_CONSUMER_KEY",
            consumerSecret: "YOUR_CONSUMER_SECRET"
        }
    };

    WinJS.Namespace.define("vividcode.meteorline", {
        Config: Config
    });
}).call(this);
