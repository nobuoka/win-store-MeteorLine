// ページ コントロール テンプレートの概要については、次のドキュメントを参照してください:
// http://go.microsoft.com/fwlink/?LinkId=232511
(function () {
    "use strict";

    var CONSUMER_KEY = vividcode.meteorline.Config.twitter.consumerKey;
    var CONSUMER_SECRET = vividcode.meteorline.Config.twitter.consumerSecret;

    var TimelineView = WinJS.UI.Pages.define("/js/vividcode/meteorline/ui/TimelineView.html", {
        /// <field>アカウント情報</field>
        account: null,

        /// <field type="vividcode.twitter.TwitterClient">twitter client</field>
        _client: null,
        /// <field type="String">最後に追加された status の Id</field>
        _idStrOfLastAddedStatus: '',
        /// <field type="Boolean">中断前にストリームが動いていたかどうか</field>
        _isStreamWorkingBeforeSuspend: false,
        /// <field type="Number">一覧の中に表示する要素の最大数</field>
        _maxNumItems: 100,

        init: function (element, options) {
            element.classList.add("timeline-view-component");
            this.account = options.account;
            if (options.initHide) this.hide();

            this._client = new vividcode.twitter.TwitterClient({ key: CONSUMER_KEY, secret: CONSUMER_SECRET }, this.account.tokenCreds);
        },

        processed: function (element, options) {
            var h1Elem = element.querySelector("section h1");
            WinJS.Binding.processAll(h1Elem, { screenName: this.account.screenId });
        },

        ready: function (element, options) {
            var that = this;

            // 投稿周り
            var tweetFormElem = element.querySelector("section .tweet-form");
            tweetFormElem.querySelector("textarea").addEventListener("activate", function (evt) {
                evt.currentTarget.parentNode.classList.add("active");
                tweetFormElem.querySelector(".error-message").textContent = "";
            }, false);
            tweetFormElem.querySelector("button.cancel-button").addEventListener("click", function (evt) {
                evt.currentTarget.parentNode.classList.remove("active");
                tweetFormElem.querySelector(".error-message").textContent = "";
            }, false);
            tweetFormElem.querySelector("button.tweet-button").addEventListener("click", function (evt) {
                var status = tweetFormElem.querySelector("textarea").value;
                tweetFormElem.querySelector(".error-message").textContent = "";
                tweetFormElem.classList.add("progress");
                that._client.postStatus(status).then(function () {
                    tweetFormElem.querySelector("textarea").value = "";
                    tweetFormElem.classList.remove("active");
                }, function onError(err) {
                    tweetFormElem.querySelector(".error-message").textContent = "投稿に失敗しました : " + err.description;
                    console.dir(err);
                }).then(function () {
                    tweetFormElem.classList.remove("progress");
                });
            }, false);


            this._client.onuserstreammessage = function (json) {
                if (json.text) {
                    that.__pushStatus(json);
                } else {
                    console.dir(json);
                }
            };
            this._client.onuserstreamstart = function () {
                element.querySelector(".stream-control > .stream-working").classList.remove("hide");
                element.querySelector(".stream-control > .stream-not-working").classList.add("hide");
            };
            this._client.onuserstreamstop = function () {
                element.querySelector(".stream-control > .stream-working").classList.add("hide");
                element.querySelector(".stream-control > .stream-not-working").classList.remove("hide");
            };

            element.querySelector(".stream-control > .stream-working button").addEventListener("click", function (evt) {
                that._client.stopUserStream();
            }, false);
            element.querySelector(".stream-control > .stream-not-working button").addEventListener("click", function (evt) {
                that.__updateByGettingHomeTimeline();
                that._client.startUserStream();
            }, false);

            // アプリの再開や終了の際のイベントリスナ
            this._suspendingListener = function (evt) {
                that._isStreamWorkingBeforeSuspend = that._client.isUserStreamWorking();
                that._client.stopUserStream();
            };
            this._resumingListener = function (evt) {
                // とりあえず今のところはアプリ再開時に自動でユーザーストリームを開始しない
                // アプリ切り替えを多くする場合などに困るので
                if (that._isStreamWorkingBeforeSuspend) {
                    //that.__updateByGettingHomeTimeline();
                    //that._client.startUserStream();
                }
            };
            Windows.UI.WebUI.WebUIApplication.addEventListener("suspending", this._suspendingListener, false);
            Windows.UI.WebUI.WebUIApplication.addEventListener("resuming", this._resumingListener, false);
        },

        // 終了処理
        unload: function () {
            Windows.UI.WebUI.WebUIApplication.removeEventListener("suspending", this._suspendingListener, false);
            Windows.UI.WebUI.WebUIApplication.removeEventListener("resuming", this._resumingListener, false);
            this._client.stopUserStream();
        },

        show: function () {
            this.element.classList.remove("hide");
        },
        hide: function () {
            this.element.classList.add("hide");
        },

        __updateByGettingHomeTimeline: function () {
            var that = this;
            this._client.getHomeTimeline().done(function (homeTimelineStatuses) {
                //console.dir(homeTimelineStatuses);
                var statuses = [];
                homeTimelineStatuses.reverse().forEach(function (status) {
                    var oid = that._idStrOfLastAddedStatus;
                    var nid = status.id_str;
                    if (oid.length > nid.length || (oid.length === nid.length && oid >= nid)) {
                        // ID が古い場合は何もしない
                        return;
                    }
                    statuses.unshift(status);
                });
                that.__pushStatuses(statuses);
            }, function onError(err) {
                console.error(err);
            });
        },
        __pushStatus: function (status) {
            this.__pushStatuses([status]);
        },
        __pushStatuses: function (statuses) { // statuses のインデックスの小さい方が新しいツイート
            if (statuses.length === 0) return;

            var that = this;

            // statuses の個数が多すぎる場合は削除
            while (statuses.length > that._maxNumItems) {
                statuses.pop();
            }

            var statusTemplateElem = this.element.getElementsByClassName("twitter-status-view-template").item(0);
            var retweetedStatusTemplateElem = this.element.getElementsByClassName("twitter-retweeted-status-view-template").item(0);
            this._idStrOfLastAddedStatus = statuses[0].id_str;
            //console.log(status.user.screen_name + ": " + status.text);
            /// <var name="statusTemplate" type="WinJS.Binding.Template">ツイッターの status を表示する HTML 要素のテンプレート</var>
            var statusTemplate = statusTemplateElem.winControl;//this.element.querySelector(".status-template").winControl;
            var retweetedStatusTemplate = retweetedStatusTemplateElem.winControl;
            var statusListElem = this.element.querySelector(".status-list");
            var statusElemPromises = statuses.map(function (status) {
                if (status.retweeted_status) {
                    return retweetedStatusTemplate.render(status);
                } else {
                    return statusTemplate.render(status);
                }
            });
            WinJS.Promise.join(statusElemPromises).done(function (statusElems) {
                var affectedItems = statusListElem.querySelectorAll(".win-template");
                var affectedItemArray = [];
                for (var i = 0; i < affectedItems.length; ++i) {
                    affectedItemArray.push(affectedItems.item(i));
                }
                var mni = that._maxNumItems - statuses.length;
                while (affectedItemArray.length > mni) {
                    statusListElem.removeChild(affectedItemArray.pop());
                }

                // Create addToList animation.
                var addToList = WinJS.UI.Animation.createAddToListAnimation(statusElems, affectedItemArray);

                var f = document.createDocumentFragment();
                statusElems.forEach(function (statusElem) {
                    f.appendChild(statusElem);
                });
                // Insert new item into DOM tree.
                // This causes the affected items to change position.
                statusListElem.insertBefore(f, statusListElem.firstChild);

                // Execute the animation.
                addToList.execute();
            });
        },

        updateLayout: function (element, viewState, lastViewState) {
            /// <param name="element" domElement="true" />

            // TODO: viewState の変更に対応します。
        }
    });

    WinJS.Namespace.define("vividcode.meteorline.ui", {
        TimelineView: TimelineView
    });
})();
