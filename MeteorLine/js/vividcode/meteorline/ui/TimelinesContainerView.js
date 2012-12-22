// ページ コントロール テンプレートの概要については、次のドキュメントを参照してください:
// http://go.microsoft.com/fwlink/?LinkId=232511
(function () {
    "use strict";

    var TimelinesContainerView = WinJS.UI.Pages.define("/js/vividcode/meteorline/ui/TimelinesContainerView.html", {
        /// <field type="WinJS.Binding.List">アカウント一覧</field>
        _accountList: null,

        init: function (element, options) {
            element.classList.add("timelines-container-view-component");
            this._accountList = options.accountList;
            if (options.initHide) this.hide();
        },

        // この関数は、ユーザーがこのページに移動するたびに呼び出されます。
        // ページ要素にアプリケーションのデータを設定します。
        ready: function (element, options) {
            var that = this;
            var al = this._accountList = options.accountList;
            this._timelineViewsContainer = element.getElementsByClassName("timeline-views-container").item(0);
            al.addEventListener("itemchanged", function (evt) {
                /// <param name="evt" value='{ detail: {
                ///     index: 1,
                ///     key: "the value used as the key in the getItemFromKey and indexOfKey methods",
                ///     newItem: "the new key. The newItem.data field contains the item.",
                ///     newValue: { example: "the new item" },
                ///     oldItem: "the old key. The oldItem.data field contains the item.",
                ///     oldValue: { example: "the old item" }
                /// } }'>イベントオブジェクト</param>
                var accountInfo = evt.detail.value;
                that.__removeTimelineView(accountInfo);
                that.__addTimelineView(accountInfo);
            });
            al.addEventListener("iteminserted", function (evt) {
                /// <param name="evt" value='{ detail: {
                ///     index: 1,
                ///     key: "the value used as the key in the getItemFromKey and indexOfKey methods",
                ///     value: { example: "the new item" }
                /// } }'>イベントオブジェクト</param>
                var accountInfo = evt.detail.value;
                that.__addTimelineView(accountInfo);
            });
            al.addEventListener("itemremoved", function (evt) {
                /// <param name="evt" value='{ detail: {
                ///     index: 1,
                ///     key: "the value used as the key in the getItemFromKey and indexOfKey methods",
                ///     value: { example: "the new item" }
                /// } }'>イベントオブジェクト</param>
                var accountInfo = evt.detail.value;
                that.__removeTimelineView(accountInfo);
            });
            al.addEventListener("reload", function (evt) {
                /// <param name="evt" value='{ detail: null }'>イベントオブジェクト</param>
            });

            al.forEach(function (accountInfo) {
                that.__addTimelineView(accountInfo);
            });
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

        __addTimelineView: function (accountInfo) {
            // TODO TimelineView の追加
            console.log("timeline view 追加");
        },
        __removeTimelineView: function (accountInfo) {
            // TODO TimelineView の削除
            console.log("timeline view 削除");
        },

        updateLayout: function (element, viewState, lastViewState) {
            /// <param name="element" domElement="true" />

            // TODO: viewState の変更に対応します。
        }
    });

    WinJS.Namespace.define("vividcode.meteorline.ui", {
        TimelinesContainerView: TimelinesContainerView
    });
})();
