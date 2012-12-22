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
        },

        // 終了処理
        unload: function () {
        },

        show: function () {
            this.element.classList.remove("hide");
        },
        hide: function () {
            this.element.classList.add("hide");
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
