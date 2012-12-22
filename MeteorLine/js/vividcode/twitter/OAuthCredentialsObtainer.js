
/// <reference path="ms-appx://Microsoft.WinJS.1.0/js/base.js" />
/// <reference path="/js/oauth.js" />
/// <reference path="/js/sha1.js" />
(function () {
    "use strict";

    var REQUEST_TOKEN_URI = "https://api.twitter.com/oauth/request_token";
    var AUTHORIZE_URI = "https://api.twitter.com/oauth/authorize";
    var ACCESS_TOKEN_URI = "https://api.twitter.com/oauth/access_token";

    var TemporaryCredentials = WinJS.Class.define(function (token, secret) {
        /// <field name="token" type="String">The temporary credentials identifier</field>
        /// <field name="secret" type="String">The temporary credentials shared-secret</field>

        this.token = token;
        this.secret = secret;
    });

    var TokenCredentials = WinJS.Class.define(function (credsInfo) {
        /// <field name="token" type="String">The temporary credentials identifier</field>
        /// <field name="secret" type="String">The temporary credentials shared-secret</field>

        this.token = credsInfo.token;
        this.secret = credsInfo.secret;
        this.userId = credsInfo.userId;
        this.screenName = credsInfo.screenName;
    });

    var OAuthCredentialsObtainer = WinJS.Class.define(function (consumerKey, consumerSecret) {
        this._consumerKey = consumerKey;
        this._consumerSecret = consumerSecret;
    }, {
        requestTemporaryCredentials: function () {
            /// <returns value='WinJS.Promise.wrap(new TemporaryCredentials())'>取得した OAuth の Request Token の情報</returns>
            // 例外として起こり得るのはネットワークエラー

            var that = this;

            return WinJS.Promise.wrap().
            then(function () {
                // WinJS.xhr の引数にできるオブジェクトを生成する
                // 例外は発生しないはず

                // GET メソッドで接続する先の URL
                var action = REQUEST_TOKEN_URI;
                // 渡すパラメータ
                var parameters = [];
                // consumer key などの設定
                var accessor = {
                    consumerKey: that._consumerKey,
                    consumerSecret: that._consumerSecret
                };

                // メッセージオブジェクトの生成
                var message = { method: "POST", action: action, parameters: parameters };
                // パラメータを含む URL の取得
                var uriStr = OAuth.addToURL(message.action, message.parameters);
                // OAuth 認証のためのパラメータ等の補完 (パラメータを含む URL の取得の後にすること)
                OAuth.completeRequest(message, accessor);
                var realm = "";
                return {
                    type: message.method,
                    url: uriStr,
                    headers: {
                        "Authorization": OAuth.getAuthorizationHeader(realm, message.parameters)
                    }
                };
            }).
            then(function (requestObj) {
                // WinJS.xhr で通信を行う
                // エラーは発生しうる

                return WinJS.xhr(requestObj).
                then(function (xhr) {
                    return xhr.responseText;
                }, function onError(err) { // err は XHR か Error
                    if (err && err.name === "Canceled" && err.description === "Canceled")
                        return WinJS.Promise.wrapError(err); // do nothing
                    // TODO xhr をエラーオブジェクトに変換
                    var xhr = err;
                    return WinJS.Promise.wrapError("通信中にエラーが発生しました");
                });
            }).
            then(function (oauthRequestTokenInfoStr) {
                // "oauth_token=XXXX&oauth_token_secret=XXXX&oauth_callback_confirmed=true" みたいな文字列
                var nameMap = {
                    // 返り値の名前 => [ オブジェクトのプロパティ名, 変換が必要ならその関数 ]
                    "oauth_token": "oauthToken",
                    "oauth_token_secret": "oauthTokenSecret",
                    "oauth_callback_confirmed": "oauthCallbackConfirmed"
                };
                var oauthRequestTokenInfo = {};
                var dd = OAuth.decodeForm(oauthRequestTokenInfoStr);
                dd.forEach(function (d) { // d は [ [ name, value ], ... ]
                    var s = nameMap[d[0]];
                    if (s) {
                        oauthRequestTokenInfo[s] = d[1];
                    }
                });
                that._tempCreds = new TemporaryCredentials(oauthRequestTokenInfo.oauthToken, oauthRequestTokenInfo.oauthTokenSecret);
                return that._tempCreds;
            });
        },

        getResourceOwnerAuthorizationUriStr: function () {
            return AUTHORIZE_URI + "?oauth_token=" + OAuth.percentEncode(this._tempCreds.token);
        },

        requestTokenCredentials: function (verifier) {
            /// <param name="tempCreds" type="TemporaryCredentials">aaa</param>
            /// <returns value='WinJS.Promise.wrap(new TemporaryCredentials())'>取得した OAuth の Request Token の情報</returns>

            var that = this;
            var tempCreds = this._tempCreds;

            return WinJS.Promise.wrap().
            then(function () {
                // GET メソッドで接続する先の URL
                var action = ACCESS_TOKEN_URI;
                // 渡すパラメータ
                var parameters = [
                    ["verifier", verifier]
                ];
                // consumer key などの設定
                var accessor = {
                    consumerKey: that._consumerKey,
                    consumerSecret: that._consumerSecret,
                    token: tempCreds.token,
                    tokenSecret: tempCreds.secret
                };

                // メッセージオブジェクトの生成
                var message = { method: "POST", action: action, parameters: parameters };
                // パラメータを含む URL の取得
                var uriStr = OAuth.addToURL(message.action, message.parameters);
                // OAuth 認証のためのパラメータ等の補完 (パラメータを含む URL の取得の後にすること)
                OAuth.completeRequest(message, accessor);
                var realm = "";
                return {
                    type: message.method,
                    url: uriStr,
                    headers: {
                        "Authorization": OAuth.getAuthorizationHeader(realm, message.parameters)
                    }
                };
            }).
            then(function (requestObj) {
                return WinJS.xhr(requestObj).
                then(function (xhr) {
                    return xhr.responseText;
                }, function onError(err) {
                    if (err && err.name === "Canceled" && err.description === "Canceled")
                        return WinJS.Promise.wrapError(xhrOrErr); // do nothing
                    // TODO xhr をエラーオブジェクトに変換
                    var xhr = err;
                    return WinJS.Promise.wrapError("通信中にエラーが発生しました");
                });
            }).
            then(function (oauthAccessTokenInfoStr) {
                console.log(oauthAccessTokenInfoStr);
                // "oauth_token=XXXX&oauth_token_secret=XXXX&oauth_callback_confirmed=true" みたいな文字列
                var nameMap = {
                    // 返り値の名前 => [ オブジェクトのプロパティ名, 変換が必要ならその関数 ]
                    "oauth_token": "token",
                    "oauth_token_secret": "secret",
                    "user_id": "userId",
                    "screen_name": "screenName"
                };
                var oauthAccessTokenInfo = {};
                var dd = OAuth.decodeForm(oauthAccessTokenInfoStr);
                dd.forEach(function (d) { // d は [ [ name, value ], ... ]
                    var s = nameMap[d[0]];
                    if (s) {
                        oauthAccessTokenInfo[s] = d[1];
                    }
                });
                return new TokenCredentials(oauthAccessTokenInfo);
            });
        }
    });

    WinJS.Namespace.define("vividcode.twitter", {
        OAuthCredentialsObtainer: OAuthCredentialsObtainer
    });

}).call(this);
