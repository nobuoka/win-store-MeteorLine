// ページ コントロール テンプレートの概要については、次のドキュメントを参照してください:
// http://go.microsoft.com/fwlink/?LinkId=232511
(function () {
    "use strict";

    var CONSUMER_KEY = vividcode.meteorline.Config.twitter.consumerKey;
    var CONSUMER_SECRET = vividcode.meteorline.Config.twitter.consumerSecret;

    var TweetFormView = WinJS.Class.define(function (element, options) {
        this.element = element;
        element.winControl = this;

        this._client = options.client;
        this._replyTo = void 0;
        this._replyToScreenName = "";

        this._textareaElem = element.querySelector("textarea");
        this._statusRepliedToContainer = element.querySelector(".status-replied-to-container");

        var that = this;
        var tweetFormElem = element;
        // 投稿周り
        tweetFormElem.querySelector("textarea").addEventListener("activate", function (evt) {
            evt.currentTarget.parentNode.classList.add("active");
            tweetFormElem.querySelector(".error-message").textContent = "";
        }, false);
        tweetFormElem.querySelector("button.cancel-button").addEventListener("click", function (evt) {
            evt.currentTarget.parentNode.classList.remove("active");
            tweetFormElem.querySelector(".error-message").textContent = "";
        }, false);
        tweetFormElem.querySelector("button.tweet-button").addEventListener("click", function (evt) {
            that.sendStatus();
        }, false);
        // 返信をやめる
        var replyCancelButton = element.querySelector(".reply-cancel-button");
        replyCancelButton.addEventListener("click", function (evt) {
            that.removeReplyTo();
        }, false);
    }, {
        sendStatus: function () {
            /// <summary>ツイートを送信する</summary>
            var that = this;
            var tweetFormElem = this.element;
            var status = tweetFormElem.querySelector("textarea").value;
            tweetFormElem.querySelector(".error-message").textContent = "";
            tweetFormElem.classList.add("progress");
            var opts = {};
            if (this._replyTo) opts.in_reply_to_status_id = this._replyTo;
            this._client.postStatus(status, opts).then(function () {
                // 正常に完了したら初期化
                tweetFormElem.querySelector("textarea").value = "";
                tweetFormElem.classList.remove("active");
                that.removeReplyTo();
            }, function onError(err) {
                tweetFormElem.querySelector(".error-message").textContent = "投稿に失敗しました : " + err.description;
                console.dir(err);
            }).then(function () {
                tweetFormElem.classList.remove("progress");
            });
        },
        setReplyTo: function (statusIdStr, screenName, elem) {
            /// <summary>返信先ステータスをセットする</summary>
            this.removeReplyTo();

            var textareaElem = this._textareaElem;
            textareaElem.value = "@" + screenName + " " + textareaElem.value;
            this._replyTo = statusIdStr;
            this._replyToScreenName = screenName;
            var e = elem.cloneNode(true);
            this._statusRepliedToContainer.appendChild(e);
            this.element.classList.add("active");
            this.element.classList.add("reply");
        },
        removeReplyTo: function () {
            if (!this._replyTo) return;

            var delTargetStr = "@" + this._replyToScreenName + " ";
            var curStr = this._textareaElem.value;
            if (curStr.substring(0, delTargetStr.length) === delTargetStr) {
                this._textareaElem.value = curStr.substring(delTargetStr.length, curStr.length);
            }
            var c = this._statusRepliedToContainer;
            while (c.hasChildNodes()) c.removeChild(c.firstChild);

            this._replyTo = void 0;
            this._replyToScreenName = "";
            this.element.classList.remove("reply");
        },
    });

    var TimelineItemListView = WinJS.Class.define(function (element, options) {
        /// <param name="options" value="{
        ///     timelineItemList: new WinJS.Binding.List,
        ///     statusTemplate: new WinJS.Binding.Template,
        ///     retweetedStatusTemplate: new WinJS.Binding.Template
        /// }">引数</param>
        this.element = element;
        this._statusTemplate = options.statusTemplate;
        this._retweetedStatusTemplate = options.retweetedStatusTemplate;
        this._cmdsForStatus = [];
        this._hasReservationOfRefreshing = false;
        this._keyElemMap = {};
        this._refreshingProcessPromise = null;

        this.__bindList(options.timelineItemList);
        this.__setupEventListeners();
    }, {
        /// <field type="HTMLElement">Timeline の項目一覧を格納する要素</field>
        element: null,
        /// <field type="WinJS.Binding.List">Timeline の項目一覧を表すリスト</field>
        _list: null,
        /// <field type="WinJS.Binding.Template">通常の status を表す HTML 要素を構築するためのテンプレート</field>
        _statusTemplate: null,
        /// <field type="WinJS.Binding.Template">リツイートされた status を表す HTML 要素を構築するためのテンプレート</field>
        _retweetedStatusTemplate: null,
        /// <field type="Array">Status の追加や削除をまとめて処理するために, 追加や削除の情報をためておくための配列</field>
        _cmdsForStatus: null,
        /// <field type="Boolean">表示の更新が予約されているかどうか</field>
        _hasReservationOfRefreshing: false,
        /// <field>リストの key と status を表す HTML 要素の対応を表すマップ</field>
        _keyElemMap: null,
        /// <field type="WinJS.Promise">表示更新の処理を表す Promise オブジェクト</field>
        _refreshingProcessPromise: null,

        __setupEventListeners: function () {
            var that = this;
            function getStatusElemFromAncestors(e) {
                // 指定の要素の先祖の中から Status を表す要素を返す. なければ null
                while (e) {
                    if (e.classList.contains("status")) break;
                    e = e.parentElement;
                }
                return e;
            }
            // 項目がクリックされたときの処理
            this.element.addEventListener("click", function (evt) {
                var e = getStatusElemFromAncestors(evt.target);
                if (e) {
                    evt.preventDefault();
                    var key = e.getAttribute("data-item-key");
                    that.dispatchEvent("itemclicked", { itemKey: key, itemElement: e });
                }
            }, false);
            // ユーザーへの視覚的フィードバックのためのリスナ
            this.element.addEventListener("MSPointerDown", function (evt) {
                var e = getStatusElemFromAncestors(evt.target);
                if (e) WinJS.UI.Animation.pointerDown(e);
            }, false);
            var pointeroutHandler = function (evt) {
                var e = getStatusElemFromAncestors(evt.target);
                if (e) WinJS.UI.Animation.pointerUp(e);
            };
            // 参考 : クイック スタート: ポインター (JavaScript と HTML を使った Windows ストア アプリ) (Windows) 
            //        http://msdn.microsoft.com/ja-jp/library/windows/apps/hh465383.aspx
            // 以下のすべてののイベントタイプにリスナを登録する必要があるかどうかはわからないが, 一応
            this.element.addEventListener("MSPointerUp", pointeroutHandler, false);
            this.element.addEventListener("MSPointerOut", pointeroutHandler, false);
            this.element.addEventListener("MSPointerCancel", pointeroutHandler, false);
            this.element.addEventListener("MSLostPointerCapture", pointeroutHandler, false);
        },

        __bindList: function (list) {
            var that = this;
            this._list = list;
            list.addEventListener("iteminserted", function (evt) {
                that.__addStatus(evt.detail);
            }, false);
            list.addEventListener("itemremoved", function (evt) {
                that.__removeStatus(evt.detail);
            }, false);
        },

        __addStatus: function (addedData) {
            // addedData: { index: 10, key: "11", value: twitterStatus }
            this._cmdsForStatus.push({ type: "add", key: addedData.key });
            this.__makeReservationOfRefreshing();
        },
        __removeStatus: function (removedData) {
            this._cmdsForStatus.push({ type: "remove", key: removedData.key });
            this.__makeReservationOfRefreshing();
        },

        __makeReservationOfRefreshing: function () {
            var that = this;
            function timeout() {
                // that._refreshingProcessPromise に then で繋げてもいいかも
                WinJS.Promise.timeout(100).then(function () {
                    if (that._refreshingProcessPromise) {
                        timeout();
                    } else {
                        that._hasReservationOfRefreshing = false;
                        that.__refresh();
                    }
                });
            }
            if (!this._hasReservationOfRefreshing) {
                this._hasReservationOfRefreshing = true;
                timeout();
            }
        },

        __refresh: function () {
            var that = this;

            var cmdsForStatus = this._cmdsForStatus;
            this._cmdsForStatus = [];

            // 追加するものと削除するものを整理
            // 追加と削除が同時に行われる可能性もあるので
            var newlyAddedStatusKeysOrderedList = [];
            var newlyAddedStatusKeys = {};
            var removedStatusKeys = {};
            cmdsForStatus.forEach(function (cmd) {
                if (cmd.type === "add") {
                    newlyAddedStatusKeys[cmd.key] = true;
                    newlyAddedStatusKeysOrderedList.push(cmd.key);
                } else if (cmd.type === "remove") {
                    if (cmd.key in newlyAddedStatusKeys) {
                        delete newlyAddedStatusKeys[cmd.key];
                        // newlyAddedStatusKeysOrderedList からの除去は後で filter を使って行う
                    } else {
                        removedStatusKeys[cmd.key] = true;
                    }
                }
            });
            newlyAddedStatusKeysOrderedList = newlyAddedStatusKeysOrderedList.filter(function (key) {
                return (key in newlyAddedStatusKeys);
            });

            // 先に削除
            for (var key in removedStatusKeys) {
                this.element.removeChild(this._keyElemMap[key]);
                delete this._keyElemMap[key];
            }

            if (newlyAddedStatusKeysOrderedList.length === 0) return;

            var newlyAddedStatusKeyElemMap = {};
            (function () { // スコープ用
                var statusTemplate = this._statusTemplate;
                var retweetedStatusTemplate = this._retweetedStatusTemplate;
                newlyAddedStatusKeysOrderedList.forEach(function (key) {
                    var statusItem = that._list.getItemFromKey(key);
                    var status = statusItem.data;
                    var elemPromise;
                    if (status.retweeted_status) {
                        elemPromise = retweetedStatusTemplate.render(status);
                    } else {
                        elemPromise = statusTemplate.render(status);
                    }
                    newlyAddedStatusKeyElemMap[key] = elemPromise;
                });
            }).call(this);

            var statusListElem = this.element;
            // 最初に this._refreshingProcessPromise に代入しておかないと,
            // イベントループで次に処理を渡す前に Promsie の終了処理まで行ってしまった
            // 場合に this._refreshingProcessPromise が null であるということが起こり得るので
            // 最初に代入しておく
            this._refreshingProcessPromise = WinJS.Promise.as();
            this._refreshingProcessPromise.then(function () {
                return WinJS.Promise.join(newlyAddedStatusKeyElemMap);
            }).
            then(function (keMap) {
                var appendedStatusElems = [];
                var f = document.createDocumentFragment();
                newlyAddedStatusKeysOrderedList.reverse().forEach(function (key) {
                    var e = keMap[key];
                    f.appendChild(e); // 先に追加した方が上にくる
                    that._keyElemMap[key] = e;
                    appendedStatusElems.push(e);
                    // key を要素にもたせる
                    e.querySelector(".status").setAttribute("data-item-key", key);
                });
                var affectedItems = Array.prototype.slice.call(statusListElem.querySelectorAll(".win-template"));
                // Create addToList animation.
                var addToList = WinJS.UI.Animation.createAddToListAnimation(appendedStatusElems, affectedItems);
                // Insert new item into DOM tree.
                // This causes the affected items to change position.
                statusListElem.insertBefore(f, statusListElem.firstChild);
                // Execute the animation.
                return addToList.execute();
            }).
            then(null, function onError() { }). // 例外が出ても終了処理に行くように
            then(function () {
                // 終了処理
                var p = that._refreshingProcessPromise;
                that._refreshingProcessPromise = null;
                p.done();
            });
        },
    });
    // Set up event handlers for the control
    // 参考 http://blogs.msdn.com/b/windowsappdev_ja/archive/2012/10/16/javascript-windows-winjs.aspx
    WinJS.Class.mix(
        TimelineItemListView,
        WinJS.Utilities.createEventProperties("itemclicked"),
        WinJS.Utilities.eventMixin
    );

    var FavoriteManager = WinJS.Class.define(function (statusList) {
        /// <field>{ 2000(statusId): { referenceCound: 1, favorited: false }, ... } 形式のオブジェクト</field>
        this._favoritedInfo = {};
        /// <field type="WinJS.Binding.List">Twitter Status のリスト</param>
        this._list = statusList;

        this.__bindStatusList();
    }, {
        __bindStatusList: function () {
            var that = this;
            this._list.addEventListener("iteminserted", function (evt) {
                var status = evt.detail.value;
                that.startFavoritedManagementOrIncreaseAndUpdate(status.id_str, status.favorited);
                if (status.retweeted_status) {
                    status = status.retweeted_status;
                    that.startFavoritedManagementOrIncreaseAndUpdate(status.id_str, status.favorited);
                }
            }, false);
            this._list.addEventListener("itemremoved", function (evt) {
                var status = evt.detail.value;
                that.decreaseFavoritedManagementCount(status.id_str);
                if (status.retweeted_status) {
                    status = status.retweeted_status;
                    that.decreaseFavoritedManagementCount(status.id_str);
                }
            }, false);
        },
        startFavoritedManagementOrIncreaseAndUpdate: function (statusId, favorited) {
            /// <summary>指定の status を Fav したかどうかの管理を開始する; 既に管理開始している場合は更新</summary>
            // favorited が undefined ならば上書きしない (初めてなら false にする)
            // User Streaming API から取得したツイート情報の retweeted_status.favorited は役に
            // 立たなくてプロパティが削除されている可能性があるので, そこら辺の絡みでこの機能がある
            if (this._favoritedInfo[statusId]) {
                this._favoritedInfo[statusId].referenceCount++;
                if (typeof favorited !== "undefined") this.changeFavoritedStatus(statusId, favorited);
            } else {
                this._favoritedInfo[statusId] = { referenceCount: 1, favorited: !!favorited };
            }
        },
        increaseFavoritedManagementCount: function (statusId) {
            /// <summary>指定の status の参照カウントを増やす</summary>
            this._favoritedInfo[statusId].referenceCount++;
        },
        decreaseFavoritedManagementCount: function (statusId) {
            /// <summary>指定の status の参照カウントを減らす; 0 になったら除去する</summary>
            this._favoritedInfo[statusId].referenceCount--;
            if (this._favoritedInfo[statusId].referenceCount === 0) {
                delete this._favoritedInfo[statusId];
            }
        },
        changeFavoritedStatus: function (statusId, favorited) {
            /// <summary>指定の status を Fav したかどうかの状態を変更する</summary>
            // 同じなら何もしない
            if (this._favoritedInfo[statusId].favorited === favorited) return;
            this._favoritedInfo[statusId].favorited = favorited;
            this.dispatchEvent("favoritedchange", { statusId: statusId, favorited: favorited });
        },
        getFavoritedStatus: function (statusId) {
            /// <summary>指定の status を Fav したかどうかの情報を取得する</summary>
            return this._favoritedInfo[statusId].favorited;
        },
    });
    // Set up event handlers for the control
    // 参考 http://blogs.msdn.com/b/windowsappdev_ja/archive/2012/10/16/javascript-windows-winjs.aspx
    WinJS.Class.mix(
        FavoriteManager,
        WinJS.Utilities.createEventProperties("favoritedchanged"),
        WinJS.Utilities.eventMixin
    );

    var RetweetManager = WinJS.Class.define(function (statusList) {
        /// <field>{ 2000(statusId): { referenceCound: 1, retweeted: false }, ... } 形式のオブジェクト</field>
        this._retweetedInfo = {};
        /// <field type="WinJS.Binding.List">Twitter Status のリスト</param>
        this._list = statusList;

        this.__bindStatusList();
    }, {
        __bindStatusList: function () {
            var that = this;
            this._list.addEventListener("iteminserted", function (evt) {
                var status = evt.detail.value;
                that.startRetweetedManagementOrIncreaseAndUpdate(status.id_str, status.retweeted);
                if (status.retweeted_status) {
                    status = status.retweeted_status;
                    that.startRetweetedManagementOrIncreaseAndUpdate(status.id_str, status.retweeted);
                }
            }, false);
            this._list.addEventListener("itemremoved", function (evt) {
                var status = evt.detail.value;
                that.decreaseRetweetedManagementCount(status.id_str);
                if (status.retweeted_status) {
                    status = status.retweeted_status;
                    that.decreaseRetweetedManagementCount(status.id_str);
                }
            }, false);
        },
        startRetweetedManagementOrIncreaseAndUpdate: function (statusId, retweeted) {
            /// <summary>指定の status を RT したかどうかの管理を開始する; 既に管理開始している場合は更新</summary>
            // retweeted が undefined ならば上書きしない (初めてなら false にする)
            // User Streaming API から取得したツイート情報の retweeted_status.retweeted は役に
            // 立たなくてプロパティが削除されている可能性があるので, そこら辺の絡みでこの機能がある
            if (this._retweetedInfo[statusId]) {
                this._retweetedInfo[statusId].referenceCount++;
                if (typeof retweeted !== "undefined") this.changeRetweetedStatus(statusId, retweeted);
            } else {
                this._retweetedInfo[statusId] = { referenceCount: 1, retweeted: !!retweeted };
            }
        },
        increaseRetweetedManagementCount: function (statusId) {
            /// <summary>指定の status の参照カウントを増やす</summary>
            this._retweetedInfo[statusId].referenceCount++;
        },
        decreaseRetweetedManagementCount: function (statusId) {
            /// <summary>指定の status の参照カウントを減らす; 0 になったら除去する</summary>
            this._retweetedInfo[statusId].referenceCount--;
            if (this._retweetedInfo[statusId].referenceCount === 0) {
                delete this._retweetedInfo[statusId];
            }
        },
        changeRetweetedStatus: function (statusId, retweeted) {
            /// <summary>指定の status を RT したかどうかの状態を変更する</summary>
            // 同じなら何もしない
            if (this._retweetedInfo[statusId].retweeted === retweeted) return;
            this._retweetedInfo[statusId].retweeted = retweeted;
            this.dispatchEvent("retweetedchange", { statusId: statusId, retweeted: retweeted });
        },
        getRetweetedStatus: function (statusId) {
            /// <summary>指定の status を RT したかどうかの情報を取得する</summary>
            return this._retweetedInfo[statusId].retweeted;
        },
    });
    // Set up event handlers for the control
    // 参考 http://blogs.msdn.com/b/windowsappdev_ja/archive/2012/10/16/javascript-windows-winjs.aspx
    WinJS.Class.mix(
        RetweetManager,
        WinJS.Utilities.createEventProperties("retweetedchanged"),
        WinJS.Utilities.eventMixin
    );

    var TimelineView = WinJS.UI.Pages.define("/js/vividcode/meteorline/ui/TimelineView.html", {
        /// <field type="HTMLElement">この PageControl をホストする HTML 要素</field>
        element: null, // IntelliSense のために宣言しているだけ; 値の設定は PageControl のコンストラクタで行われる
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
        /// <field type="TweetFormView">投稿用フォーム</field>
        _tweetForm: null,
        /// <field type="WinJS.Binding.List">タイムライン内の項目一覧</field>
        _timelineItemList: null,
        /// <field type="TimelineItemListView">タイムラインの項目一覧を表示するための view</field>
        _timelineItemListView: null,
        /// <field type="FavoriteManager">Fav の管理</field>
        _favoriteManager: null,
        /// <field type="RetweetManager">RT の管理</field>
        _retweetManager: null,

        init: function (element, options) {
            element.classList.add("timeline-view-component");
            this.account = options.account;
            if (options.initHide) this.hide();

            this._client = new vividcode.twitter.TwitterClient({ key: CONSUMER_KEY, secret: CONSUMER_SECRET }, this.account.tokenCreds);
            this._timelineItemList = new WinJS.Binding.List();
            this._favoriteManager = new FavoriteManager(this._timelineItemList);
            this._retweetManager = new RetweetManager(this._timelineItemList);
        },

        processed: function (element, options) {
            var h1Elem = element.querySelector("section h1");
            WinJS.Binding.processAll(h1Elem, { screenName: this.account.screenId });

            var tweetFormElem = element.querySelector("section .tweet-form");
            this._tweetForm = new TweetFormView(tweetFormElem, { client: this._client });

            // Timeline の項目一覧の view を用意
            var statusListElem = this.element.querySelector(".status-list");
            var options = {
                timelineItemList: this._timelineItemList,
                statusTemplate: this.element.getElementsByClassName("twitter-status-view-template").item(0).winControl,
                retweetedStatusTemplate: this.element.getElementsByClassName("twitter-retweeted-status-view-template").item(0).winControl
            };
            this._timelineItemListView = new TimelineItemListView(statusListElem, options);
        },

        ready: function (element, options) {
            var that = this;

            this._timelineItemListView.addEventListener("itemclicked", function (evt) {
                var key = evt.detail.itemKey;
                var e = evt.detail.itemElement;
                var statusItem = that._timelineItemList.getItemFromKey(key);
                if (!statusItem) return; // 指定の key がない場合 (取り除かれた後で表示が変わる前にクリック) は何もしない
                var status = statusItem.data;
                // status の情報
                var statusIdStr;
                var screenName;
                if (status.retweeted_status) { // RT の場合は元のツイートを返信先にする
                    statusIdStr = status.retweeted_status.id_str;
                    screenName = status.retweeted_status.user.screen_name;
                } else {
                    statusIdStr = status.id_str;
                    screenName = status.user.screen_name;
                }

                var flyoutElem = that.element.querySelector(".timeline-item-flyout");
                /// <var type="WinJS.UI.Flyout">timeline の各項目に対する flyout</var>
                var flyout = flyoutElem.winControl;
                /// <var type="WinJS.Binding.Template">flyout の中身のテンプレート</var>
                var flyoutContentTemplate = that.element.querySelector(".timeline-item-flyout-content-template").winControl;

                flyoutContentTemplate.render().then(function (elem) {
                    // ツイート追加
                    flyoutElem.appendChild(elem);
                    var c = flyoutElem.querySelector(".target-item-container");
                    while (c.firstChild) c.removeChild(c.firstChild);
                    var e = evt.detail.itemElement.cloneNode(true);
                    c.appendChild(e);
                    // reply
                    flyoutElem.querySelector(".cmd-set-reply-to-button").addEventListener("click", function (evt) {
                        that._tweetForm.setReplyTo(statusIdStr, screenName, e);
                        evt.currentTarget.parentNode.classList.add("stat-completed");
                    }, false);
                    // Fav
                    var favCmdElem = flyoutElem.querySelector(".timeline-item-cmd-req-fav");
                    if (that._favoriteManager.getFavoritedStatus(statusIdStr)) {
                        favCmdElem.classList.add("stat-completed");
                    } else {
                        var favButton = flyoutElem.querySelector(".cmd-req-fav-button");
                        favButton.addEventListener("click", function (evt) {
                            favCmdElem.classList.add("stat-progress");
                            that._client.postFavorite(statusIdStr).then(function () {
                                that._favoriteManager.changeFavoritedStatus(statusIdStr, true);
                                // 正常に完了した場合の状態変更は FavoriteManager からのイベントに任せる
                            }, function onError(err) {
                                // 今のところはエラーメッセージは表示しない
                                console.dir(err);
                            }).then(function () {
                                favCmdElem.classList.remove("stat-progress");
                            });
                        }, false);
                        // イベントハンドラの追加と削除
                        var favchangeHandler = function (evt) {
                            if (evt.detail.statusId === statusIdStr) {
                                if (evt.detail.favorited) {
                                    favCmdElem.classList.add("stat-completed");
                                }
                            }
                        };
                        that._favoriteManager.increaseFavoritedManagementCount(statusIdStr);
                        that._favoriteManager.addEventListener("favoritedchange", favchangeHandler, false);
                        flyout.addEventListener("afterhide", function onafterhide(evt) {
                            flyout.removeEventListener("afterhide", onafterhide, false);
                                // 自分自身の remove : これをしないと flyout を表示するごとに登録されたリスナが増えていくので
                            that._favoriteManager.removeEventListener("favoritedchange", favchangeHandler, false);
                            that._favoriteManager.decreaseFavoritedManagementCount(statusIdStr);
                        }, false);
                    }
                    // RT
                    var rtCmdElem = flyoutElem.querySelector(".timeline-item-cmd-req-rt");
                    if (that._retweetManager.getRetweetedStatus(statusIdStr)) {
                        rtCmdElem.classList.add("stat-completed");
                    } else {
                        var rtButton = flyoutElem.querySelector(".cmd-req-rt-button");
                        if (status.user.protected || status.user.id_str === that.account.id) {
                            // protected の場合と自分自身の場合は RT できない
                            rtButton.disabled = true;
                        } else {
                            rtButton.addEventListener("click", function (evt) {
                                rtCmdElem.classList.add("stat-progress");
                                that._client.postRetweet(statusIdStr).then(function () {
                                    that._retweetManager.changeRetweetedStatus(statusIdStr, true);
                                    // 正常に完了した場合の状態変更は FavoriteManager からのイベントに任せる
                                }, function onError(err) {
                                    // 今のところはエラーメッセージは表示しない
                                    console.dir(err);
                                }).then(function () {
                                    rtCmdElem.classList.remove("stat-progress");
                                });
                            }, false);
                            // イベントハンドラの追加と削除
                            var rtchangeHandler = function (evt) {
                                if (evt.detail.statusId === statusIdStr) {
                                    if (evt.detail.retweeted) {
                                        rtCmdElem.classList.add("stat-completed");
                                    }
                                }
                            };
                            that._retweetManager.increaseRetweetedManagementCount(statusIdStr);
                            that._retweetManager.addEventListener("retweetedchange", rtchangeHandler, false);
                            flyout.addEventListener("afterhide", function onafterhide(evt) {
                                flyout.removeEventListener("afterhide", onafterhide, false);
                                // 自分自身の remove : これをしないと flyout を表示するごとに登録されたリスナが増えていくので
                                that._retweetManager.removeEventListener("retweetedchange", rtchangeHandler, false);
                                that._retweetManager.decreaseRetweetedManagementCount(statusIdStr);
                            }, false);
                        }
                    }
                    // 削除処理
                    flyout.addEventListener("afterhide", function onafterhide(evt) {
                        flyout.removeEventListener("afterhide", onafterhide, false);
                            // 自分自身の remove : これをしないと flyout を表示するごとに登録されたリスナが増えていくので
                        flyoutElem.removeChild(elem);
                    }, false);
                    flyout.show(evt.detail.itemElement, "top");
                });
            }, false);

            this._client.onuserstreammessage = function (json) {
                if (json.text) {
                    if (json.retweeted_status) {
                        // User Stream API から得た status object の retweeted_status.favorited と
                        // retweeted_status.retweeted は役に立たない (自分に対してでなく retweet した人
                        // に対する情報になっている) ので削除してしまう (Twitter のバグっぽい)
                        // 参考 : https://dev.twitter.com/issues/783
                        delete json.retweeted_status.favorited;
                        delete json.retweeted_status.retweeted;
                    }
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
                    statuses.push(status);
                });
                that.__pushStatuses(statuses);
            }, function onError(err) {
                console.error(err);
            });
        },
        __pushStatus: function (status) {
            if (this._timelineItemList.length >= this._maxNumItems) this._timelineItemList.shift();
            this._idStrOfLastAddedStatus = status.id_str;
            // entities を埋め込み
            status.text_html = this.__createEntitiesEmbeddedText(status);
            if (status.retweeted_status) status.retweeted_status.text_html = this.__createEntitiesEmbeddedText(status.retweeted_status);
            this._timelineItemList.push(status);
        },
        __pushStatuses: function (statuses) { // statuses のインデックスの大きい方が新しいツイート
            var that = this;
            statuses.forEach(function (status) { that.__pushStatus(status) });
        },

        __createEntitiesEmbeddedText: function (status) {
            /// <summary>Twitter の status オブジェクトを受け取り, entities を text に埋め込んだ文字列を返す</summary>

            function escapeForHTML(str) {
                /// <summary>&, ", ', <, > の 5 文字を文字参照または実体参照に変換する</summary>
                var map = {
                    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
                };
                function esc(char) {
                    return map[char];
                }
                return str.replace(/&|<|>|"|'/g, esc);
            }

            var text = status.text;
            var chars = []; // 文字を文字として扱うように (サロゲートペアの考慮)
            for (var i = 0; i < text.length; ++i) {
                if (/[\uD800-\uDFFF]/.test(text.substring(i, i+1))) {
                    chars.push(text.substring(i, i+2));
                    ++i;
                } else {
                    chars.push(text.substring(i, i+1));
                }
            }

            var entities = status.entities;
            var replacementTexts = [];
            // user_mentions
            entities.user_mentions.forEach(function (userMentionInfo) {
                var sIdx = userMentionInfo.indices[0];
                var eIdx = userMentionInfo.indices[1];
                var replacementText =
                    "<a href=\"https://twitter.com/" + escapeForHTML(encodeURIComponent(userMentionInfo.screen_name)) +
                    "\">@" + escapeForHTML(userMentionInfo.screen_name) + "</a>";
                replacementTexts.push({ text: replacementText, sIdx: sIdx, eIdx: eIdx });
            });
            // hashtags
            entities.hashtags.forEach(function (hashtagInfo) {
                var sIdx = hashtagInfo.indices[0];
                var eIdx = hashtagInfo.indices[1];
                var replacementText =
                    "<a href=\"https://twitter.com/search?q=%23" + escapeForHTML(encodeURIComponent(hashtagInfo.text)) +
                    "&src=hash\">#" + escapeForHTML(hashtagInfo.text) + "</a>";
                replacementTexts.push({ text: replacementText, sIdx: sIdx, eIdx: eIdx });
            });
            // urls
            entities.urls.forEach(function (urlInfo) {
                var sIdx = urlInfo.indices[0];
                var eIdx = urlInfo.indices[1];
                var replacementText =
                    "<a href=\"" + escapeForHTML(urlInfo.expanded_url) + "\">" + escapeForHTML(urlInfo.display_url) + "</a>";
                replacementTexts.push({ text: replacementText, sIdx: sIdx, eIdx: eIdx });
            });
            // media
            if (entities.media) {
                entities.media.forEach(function (mediaInfo) {
                    // とりあえず urls と同じ処理をするだけ; そのうち埋め込みとかしたい
                    var sIdx = mediaInfo.indices[0];
                    var eIdx = mediaInfo.indices[1];
                    var replacementText =
                        "<a href=\"" + escapeForHTML(mediaInfo.expanded_url) + "\">" + escapeForHTML(mediaInfo.display_url) + "</a>";
                    replacementTexts.push({ text: replacementText, sIdx: sIdx, eIdx: eIdx });
                });
            }
            // replace
            replacementTexts = replacementTexts.sort(function (a, b) {
                return a.sIdx < b.sIdx ? -1 : a.sIdx > b.sIdx ? 1 : 0;
            });
            var curIdx = 0;
            var replacedTextComps = [];
            replacementTexts.forEach(function (t) {
                replacedTextComps.push(chars.slice(curIdx, t.sIdx).join(""));
                replacedTextComps.push(t.text);
                curIdx = t.eIdx;
            });
            replacedTextComps.push(chars.slice(curIdx).join(""));
            var s = replacedTextComps.join("")
            // 改行を <br> に
            s = s.replace(/\n/g, "<br />");
            return s;
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
