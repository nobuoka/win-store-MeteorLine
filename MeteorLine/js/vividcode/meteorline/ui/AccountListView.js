// ページ コントロール テンプレートの概要については、次のドキュメントを参照してください:
// http://go.microsoft.com/fwlink/?LinkId=232511
(function () {
    "use strict";

    var AccountListView = WinJS.UI.Pages.define("/js/vividcode/meteorline/ui/AccountListView.html", {
        /// <field type="WinJS.Binding.List">アカウント一覧</field>
        _accountList: null,

        // 初期化処理: コンストラクタで行うような処理はここで実行する
        init: function (element, options) {
            element.classList.add("account-list-view-component");
            this._accountList = options.accountList;
        },

        // この PageControl の中身が使えるようになった状態になった後に行う処理
        ready: function (element, options) {
            /// <var name="listView" type="WinJS.UI.ListView">アカウント一覧を表示する ListView</var>
            var listView = this.element.getElementsByClassName("account-list-view").item(0).winControl;
            listView.itemDataSource = this._accountList.dataSource;
            listView.itemTemplate = this.element.getElementsByClassName("account-list-item-template").item(0);
        },

        // 終了処理
        unload: function () {
        },

        show: function () {
            this.element.classList.remove("hide");
            /// <var name="listView" type="WinJS.UI.ListView">アカウント一覧を表示する ListView</var>
            var listView = this.element.getElementsByClassName("account-list-view").item(0).winControl;
            listView.forceLayout(); // これをしないと, リストの内容が表示されない場合がある
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
        AccountListView: AccountListView
    });
})();
