﻿
/// <reference path="ms-appx://Microsoft.WinJS.1.0/js/base.js" />
/// <reference path="/js/oauth.js" />
/// <reference path="/js/sha1.js" />
(function () {

    var TwitterClientRequestError = WinJS.Class.derive(Error, function (name, message) {
        this.name = name;
        this.message = message;
    }, {
    }, {
        Name: {
            NetworkError: "NetworkError",
            ServerError: "ServerError",
            ClientError: "ClientError",
        },
    });

    var TwitterClient = WinJS.Class.define(function (consumerKeys, creds) {
        this._creds = creds;
        this._consumerKeys = consumerKeys;
    }, {
        __requestViaApi: function (method, action, parameters) {
            /// <summary>Twitter API に対してリクエストを投げる</summary>

            var that = this;
            var consumerKeys = this._consumerKeys;
            return WinJS.Promise.wrap().
            then(function () {
                // consumer key などの設定
                var accessor = {
                    consumerKey: consumerKeys.key,
                    consumerSecret: consumerKeys.secret,
                    token: that._creds.token,
                    tokenSecret: that._creds.secret
                };

                // メッセージオブジェクトの生成
                var message = { method: method, action: action, parameters: parameters };
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
                console.dir(requestObj);
                return WinJS.xhr(requestObj).
                then(function (xhr) {
                    console.log("xhr success");
                    /*
                        X-Rate-Limit-Limit: the rate limit ceiling for that given request
                        X-Rate-Limit-Remaining: the number of requests left for the 15 minute window
                        X-Rate-Limit-Reset: the remaining window before the rate limit resets in UTC epoch seconds
                    */
                    console.log("limit: " + xhr.getResponseHeader("X-Rate-Limit-Limit"));
                    console.log("remaining: " + xhr.getResponseHeader("X-Rate-Limit-Remaining"));
                    var resetEpochStr = xhr.getResponseHeader("X-Rate-Limit-Reset");
                    console.log("reset: " + resetEpochStr + " (" + (new Date(Number(resetEpochStr) * 1000)) + ")");
                    return JSON.parse(xhr.responseText);
                }, function onError(xhrOrError) {
                    console.log("xhr error");
                    console.dir(xhrOrError);
                    if (xhrOrError instanceof XMLHttpRequest) {
                        var xhr = xhrOrError;
                        if (xhr.status === 0) {
                            var err = new TwitterClientRequestError(
                                TwitterClientRequestError.Name.NetworkError,
                                "ネットワークエラーでリクエストが失敗しました");
                            return WinJS.Promise.wrapError(err);
                        } else if (400 <= xhr.status && xhr.status < 500) {
                            var err = new TwitterClientRequestError(
                                TwitterClientRequestError.Name.ClientError,
                                "パラメータがおかしいなどの理由でリクエストが拒否されました");
                            return WinJS.Promise.wrapError(err);
                        } else if (500 <= xhr.status) {
                            var err = new TwitterClientRequestError(
                                TwitterClientRequestError.Name.ServerError,
                                "サーバー側のエラーでリクエストが失敗しました");
                            return WinJS.Promise.wrapError(err);
                        }
                        console.log(xhr.responseText);
                        var err = new Error("XHR Error");
                        return WinJS.Promise.wrapError(err);
                    } else if (xhrOrError instanceof Error) {
                        return WinJS.Promise.wrapError(xhrOrError);
                    } else {
                        return WinJS.Promise.wrapError(new Error("Unexpected Error"));
                    }
                });
            });
        },

        postStatus: function (status, opts) {
            /// <param name="opts" value="{ in_reply_to_status_id: '' }">オプション</param>

            var method = "POST";
            var action = "https://api.twitter.com/1.1/statuses/update.json";
            var parameters = [
                ["status", status],
            ];
            if (opts.in_reply_to_status_id) parameters.push(["in_reply_to_status_id", opts.in_reply_to_status_id]);

            return this.__requestViaApi(method, action, parameters).then(function (res) {
                return 0; // 今回は特に返すものがないので
            });
        },

        postRetweet: function (statusId) {
            /// <param name="statusId" type="String">Retweet 対象の status の ID/param>

            var method = "POST";
            var action = "https://api.twitter.com/1.1/statuses/retweet/" + encodeURIComponent(statusId) + ".json";
            var parameters = [
                ["trim_user", "true"], // user 情報を含めないようにすることで通信量を減らす
            ];

            // 既に RT 済みだった場合は 403 エラー (ここでは特に対応していない)
            // response : {"errors":"sharing is not permissible for this status (Share validations failed)"}

            return this.__requestViaApi(method, action, parameters).then(function (res) {
                return 0; // 今回は特に返すものがないので
            });
        },

        postFavorite: function (statusId) {
            /// <param name="statusId" type="String">Retweet 対象の status の ID/param>

            var method = "POST";
            var action = "https://api.twitter.com/1.1/favorites/create.json";
            var parameters = [
                ["id", statusId],
                ["trim_user", "true"], // user 情報を含めないようにすることで通信量を減らす
            ];

            // 既に Fav 済みだった場合は 403 エラー (ここでは特に対応していない)
            // response : {"errors":[{"code":139,"message":"You have already favorited this status"}]}

            return this.__requestViaApi(method, action, parameters).then(function (res) {
                return 0; // 今回は特に返すものがないので
            });
        },

        getHomeTimeline: function () {
            var method = "GET";
            var action = "https://api.twitter.com/1.1/statuses/home_timeline.json";
            var parameters = [
                  ["count", "200"],
            ];

            return this.__requestViaApi(method, action, parameters).then(function (timelineJsonObj) {
                return timelineJsonObj;
            });
        },

        startUserStream: function () {
            /// <returns value='WinJS.Promise.wrap(new TemporaryCredentials())'>取得した OAuth の Request Token の情報</returns>
            var that = this;
            var reader = null;
            var promise = null;
            var consumerKeys = this._consumerKeys;
            promise = this._userStreamPromise = WinJS.Promise.wrap().
            then(function () {
                that.onuserstreamstart();
                // GET メソッドで接続する先の URL
                var action = "https://userstream.twitter.com/1.1/user.json";
                // 渡すパラメータ
                var parameters = [
                  //["since_id", "XXXXXX"],
                ];
                // consumer key などの設定
                var accessor = {
                    consumerKey: consumerKeys.key,
                    consumerSecret: consumerKeys.secret,
                    token: that._creds.token,
                    tokenSecret: that._creds.secret
                };

                // メッセージオブジェクトの生成
                var message = { method: "GET", action: action, parameters: parameters };
                // パラメータを含む URL の取得
                var uriStr = OAuth.addToURL(message.action, message.parameters);
                // OAuth 認証のためのパラメータ等の補完 (パラメータを含む URL の取得の後にすること)
                OAuth.completeRequest(message, accessor);
                var realm = "";
                return {
                    type: message.method,
                    url: uriStr,
                    responseType: "ms-stream",
                    headers: {
                        "Authorization": OAuth.getAuthorizationHeader(realm, message.parameters)
                    }
                };
            }).
            then(function (requestObj) {
                console.dir(requestObj);
                return WinJS.xhr(requestObj).
                then(function (xhr) {
                    console.log("xhr success");
                    /*
                        X-Rate-Limit-Limit: the rate limit ceiling for that given request
                        X-Rate-Limit-Remaining: the number of requests left for the 15 minute window
                        X-Rate-Limit-Reset: the remaining window before the rate limit resets in UTC epoch seconds
                    */
                    console.log("limit: " + xhr.getResponseHeader("X-Rate-Limit-Limit"));
                    console.log("remaining: " + xhr.getResponseHeader("X-Rate-Limit-Remaining"));
                    var resetEpochStr = xhr.getResponseHeader("X-Rate-Limit-Reset");
                    console.log("reset: " + resetEpochStr + " (" + (new Date(Number(resetEpochStr) * 1000)) + ")");
                    return JSON.parse(xhr.responseText);
                }, function onError(xhrOrError) {
                    // cancel された場合もここに
                    if (xhrOrError instanceof Error) {
                        console.log("error on xhr");
                        console.dir(xhrOrError);
                    } else {
                        console.log("xhr error");
                        var xhr = xhrOrError;
                        console.dir(xhr);
                        console.log(xhr.status);
                        console.log(xhr.responseText);
                    }
                    return WinJS.Promise.wrapError("XHR Error");
                }, function onProgress(xhr) {
                    var req = xhr;
                    // streaming の読み込みを開始した時に以下の if 文の中に入る
                    if (req.readyState === req.LOADING) {
                        console.log("prog");
                        console.dir(req.response);
                        // res は MSStream オブジェクト
                        var res = req.response;
                        // msDetachStream メソッドを呼び出すことで IInputStream オブジェクトを res から切り離して取り出す
                        var stream = res.msDetachStream();
                        console.log(stream);
                        console.dir(req);
                        for (var name in stream) {
                            console.log("  name : " + name);
                            console.dir(stream[name]);
                        }

                        var jsonConverter = new JsonConverter();
                        jsonConverter.onmessage = function (json) { that.onuserstreammessage(json) };

                        reader = new StreamReader(stream);
                        reader.onmessage = function (msg) { jsonConverter.pushString(msg) };
                        reader.start();
                    }
                    console.log("prog : " + req);
                });
            }).
            then(null, function () {}).
            then(function () {
                // 内部的にエラーが出たときか外部から終了させられたときにここにくる
                if (promise === that._userStreamPromise) that._userStreamPromise = null;
                if (reader) reader.stop();
                console.log("twitter user stream is stopped");
                that.onuserstreamstop();
            });
        },

        stopUserStream: function () {
            if (this._userStreamPromise) this._userStreamPromise.cancel();
        },
        isUserStreamWorking: function () {
            return !!this._userStreamPromise;
        },
        onuserstreammessage: function () { },
        onuserstreamstart: function () { },
        onuserstreamstop: function () { },
    });

    WinJS.Namespace.define("vividcode.twitter", {
        TwitterClient: TwitterClient,
        TwitterClientRequestError: TwitterClientRequestError
    });


    /**
     *
     */
    function StreamReader(stream) {
        this._stream = stream;
        var cap = 4096;
        this._buffer = new Windows.Storage.Streams.Buffer(cap);
        // stream が空の場合に待つ時間
        this._waitTime = 3000;
    }
    StreamReader.STAT_BEGIN = "begin";
    StreamReader.STAT_RUNNING = "running";
    StreamReader.STAT_STOPPING = "stopping";
    StreamReader.STAT_STOPPED = "stopped";
    StreamReader.prototype.start = function () {
        this._status = StreamReader.STAT_RUNNING;
        this.__readPartial();
    };
    StreamReader.prototype.stop = function () {
        this._status = StreamReader.STAT_STOPPING;
    };
    StreamReader.prototype.__readPartial = function () {
        // 停止リクエストがあったかどうかを検査して, あったならば出ていくべき
        if (this._status === StreamReader.STAT_STOPPING) {
            this._status = StreamReader.STAT_STOPPED;
            return;
        } else if (this._status !== StreamReader.STAT_RUNNING) {
            console.error("動作状態がおかしい... stat : ", this._status);
            return;
        }

        var self = this;
        var stream = this._stream;
        var buf = this._buffer;
        var waitTime = this._waitTime;
        var bufPromise;
        try {
            bufPromise = stream.readAsync(buf, buf.capacity, Windows.Storage.Streams.InputStreamOptions.partial);
        } catch (err) {
            // 既に stream が閉じている場合などはここにくる
            console.error("stream が既に閉じられている?", err);
            return;
        }
        bufPromise.done(function (dat) {
            //console.log("----");
            //console.log("read size : " + buf.length);
            var readStr = Windows.Storage.Streams.DataReader.fromBuffer(buf).readString(buf.length);
            if (self.onmessage) {
                var cb = self.onmessage;
                WinJS.Promise.wrap(0).done(function () { cb(readStr) });
            }
            //console.log(readStr);
            var p = (buf.length === 0 ? WinJS.Promise.timeout(waitTime) : WinJS.Promise.wrap(0));
            p.done(function () {
                self.__readPartial();
            });
        }, function onError(err) {
            console.error("errorrrrrr", err);
        });
    };
    StreamReader.prototype._onmessage = void 0;
    Object.defineProperties(StreamReader.prototype, {
        onmessage: {
            set: function (v) { this._onmessage = v },
            get: function () { return this._onmessage; }
        }
    });

    /**
     *
     */
    function JsonConverter() {
        this._bufStr = "";
        this._onmessage = void 0;
        Object.seal(this);
    }
    JsonConverter.prototype.pushString = function (str) {
        this._bufStr += str;
        var jsonStrs = this._bufStr.split("\r\n", -1);
        this._bufStr = jsonStrs.pop();
        var self = this;
        jsonStrs.forEach(function (e, i, arr) {
            if (e === "") return;
            var json = JSON.parse(e);
            var callback = self.onmessage;
            if (callback) {
                WinJS.Promise.wrap(0).done(function () {
                    callback(json);
                });
            }
        });
    };
    Object.defineProperties(JsonConverter.prototype, {
        onmessage: {
            set: function (v) { this._onmessage = v },
            get: function () { return this._onmessage; }
        }
    });
    Object.freeze(JsonConverter.prototype);
    Object.seal(JsonConverter);
}).call(this);
