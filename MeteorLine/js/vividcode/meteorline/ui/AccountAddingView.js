// ページ コントロール テンプレートの概要については、次のドキュメントを参照してください:
// http://go.microsoft.com/fwlink/?LinkId=232511
(function () {
    "use strict";

    var CONSUMER_KEY = vividcode.meteorline.Config.twitter.consumerKey;
    var CONSUMER_SECRET = vividcode.meteorline.Config.twitter.consumerSecret;

    var AccountAddingView = WinJS.UI.Pages.define("/js/vividcode/meteorline/ui/AccountAddingView.html", {
        /// <field type="HTMLElement">この PageControl をホストする HTML 要素</field>
        element: null, // IntelliSense のために宣言しているだけ; 値の設定は PageControl のコンストラクタで行われる
        /// <field>アカウント追加処理に関する要素を集めたオブジェクト</field>
        _processElems: null,
        /// <field type="HTMLElement">アカウント追加処理の最初に戻るためのボタン</field>
        _resetButton: null,
        /// <field type="WinJS.Promise">処理中の Promise. 再初期化するときはこれを cancel すること</field>
        _processingPromise: null,
        /// <field type="vividcode.meteorline.twitter.OAuthCredentialsObtainer">Twitter OAuth 認証のトークン取得処理を担うオブジェクト</field>
        _credsObtainer: null,
        /// <field type="WinJS.Binding.List">アカウント一覧</field>
        _accountList: null,

        // 初期化処理: コンストラクタで行うような処理はここで実行する
        // options のプロパティとして accountList を必ず渡すこと
        init: function (element, options) {
            element.classList.add("account-adding-view-component");
            this._accountList = options.accountList;
            if (options.initHide) this.hide();
            this._processElems = {};
            this._processingPromise = null;
        },

        // この PageControl の中身が使えるようになった状態になった後に行う処理
        ready: function (element, options) {
            // 処理中に表示する各種要素の取得
            this._processElems.initial = this.element.getElementsByClassName("initial").item(0);
            this._processElems.progress = this.element.getElementsByClassName("progress").item(0);
            this._processElems.verifyForm = this.element.getElementsByClassName("verify-form").item(0);
            this._processElems.messageBox = this.element.getElementsByClassName("message-box").item(0);

            this._resetButton = this.element.getElementsByClassName("reset-button").item(0);
            // 初期化
            this.__initialize();
        },

        // 終了処理
        unload: function () {
            if (this._processingPromise) this._processingPromise.cancel();
            // 子の PageControl の unload 呼び出し
            var pageControl = this.element.querySelector(".account-list-view-container > .pagecontrol").winControl;
            if (pageControl.unload) pageControl.unload();
        },

        show: function () {
            this.element.classList.remove("hide");
            this.element.querySelector(".account-list-view-container").firstElementChild.winControl.show();
        },
        hide: function () {
            this.element.querySelector(".account-list-view-container").firstElementChild.winControl.hide();
            this.element.classList.add("hide");
        },

        __requestTempCreds: function () {
            /// <summary>OAuth 認証の Temporary Credentials の取得処理を行う</summary>
            var that = this;
            this.__showProgress();
            var promise = this._processingPromise = this._credsObtainer.requestTemporaryCredentials().then(function (tempCreds) {
                that.__showVerifyForm(that._credsObtainer.getResourceOwnerAuthorizationUriStr());
            }, function onError(err) {
                if (err && err.name === "Canceled" && err.description === "Canceled") return; // do nothing
                that.__showMessage(err);
            }).then(function () { // 上で非同期処理を返さなければ, then の間に別の処理が入ることはない
                promise.done();
                if (that._processingPromise === promise) that._processingPromise = null;
            });
        },

        __requestTokenCreds: function () {
            /// <summary>OAuth 認証の Token Credentials の取得処理を行う</summary>
            var that = this;
            that.__showProgress();
            var verifier = that._processElems.verifyForm.getElementsByClassName("verifier-input").item(0).value;
            var promise = this._processingPromise = this._credsObtainer.requestTokenCredentials(verifier).then(function (tokenCreds) {
                that.__showMessage("OK!");
                var targetIndex = void 0;
                for (var i = 0, len = that._accountList.length; i < len; ++i) {
                    var accountObj = that._accountList.getAt(i);
                    if (accountObj.type === "twitter" && accountObj.id === tokenCreds.userId) {
                        targetIndex = i;
                        break;
                    }
                }
                var accountObj = {
                    type: "twitter",
                    id: tokenCreds.userId,
                    screenId: tokenCreds.screenName,
                    tokenCreds: {
                        token: tokenCreds.token,
                        secret: tokenCreds.secret
                    }
                };
                if (typeof targetIndex === "undefined") {
                    that._accountList.push(accountObj);
                } else {
                    that._accountList.setAt(targetIndex, accountObj);
                }
            }, function onError(err) {
                if (err && err.name === "Canceled" && err.description === "Canceled") return; // do nothing
                that.__showMessage(err);
            }).then(function () { // 上で非同期処理を返さなければ, then の間に別の処理が入ることはない
                promise.done();
                if (that._processingPromise === promise) that._processingPromise = null;
            });
        },

        __initialize: function () {
            /// <summary>アカウント追加処理のためのイベントリスナの登録などの初期化処理</summary>
            // 1 回しか呼び出してはいけない
            var that = this;
            this._processElems.initial.firstElementChild.addEventListener("click", function (evt) {
                that._resetButton.classList.remove("hide");
            }, false);
            this._processElems.initial.firstElementChild.addEventListener("click", this.__requestTempCreds.bind(this), false);
            var verifyOkButton = this._processElems.verifyForm.getElementsByClassName("verifier-ok-button").item(0);
            verifyOkButton.addEventListener("click", this.__requestTokenCreds.bind(this), false);
            this._resetButton.addEventListener("click", function (evt) {
                that.__reinitialize();
            }, false);
            this.__reinitialize();
        },
        __reinitialize: function () {
            /// <summary>アカウント追加処理の最初の状態にする</summary>
            // 複数回呼び出してよい
            if (this._processingPromise) this._processingPromise.cancel();
            this._credsObtainer = new vividcode.twitter.OAuthCredentialsObtainer(CONSUMER_KEY, CONSUMER_SECRET);
            this.__hideAllProcessElems();
            this._processElems.initial.classList.remove("hide");
            this._resetButton.classList.add("hide");
        },

        __hideAllProcessElems: function () {
            /// <summary>アカウント追加処理に関わる全ての要素を隠す</summary>
            this._processElems.initial.classList.add("hide");
            this._processElems.progress.classList.add("hide");
            this._processElems.verifyForm.classList.add("hide");
            this._processElems.messageBox.classList.add("hide");
        },
        __showProgress: function () {
            /// <summary>アカウント追加処理のプログレスバーを表示する</summary>
            this.__hideAllProcessElems();
            this._processElems.progress.classList.remove("hide");
        },
        __showVerifyForm: function (uriStr) {
            /// <summary>アカウント追加処理の verifier を入力するフォームを表示する</summary>
            /// <param name="uriStr" type="String">OAuth 認証の Resource Owner Authorization URI</param>
            this.__hideAllProcessElems();
            var uriElem = this._processElems.verifyForm.getElementsByClassName("verify-uri").item(0);
            uriElem.href = uriStr;
            uriElem.textContent = uriStr;
            this._processElems.verifyForm.classList.remove("hide");
        },
        __showMessage: function (msg) {
            /// <summary>アカウント追加処理に関するメッセージを表示する</summary>
            /// <param name="msg" type="String">表示するメッセージ</param>
            this.__hideAllProcessElems();
            this._processElems.messageBox.getElementsByClassName("message").item(0).textContent = msg;
            this._processElems.messageBox.classList.remove("hide");
        },

        updateLayout: function (element, viewState, lastViewState) {
            /// <param name="element" domElement="true" />

            // TODO: viewState の変更に対応します。
        }
    });

    WinJS.Namespace.define("vividcode.meteorline.ui", {
        AccountAddingView: AccountAddingView
    });
})();
