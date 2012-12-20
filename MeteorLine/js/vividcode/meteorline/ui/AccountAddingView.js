// ページ コントロール テンプレートの概要については、次のドキュメントを参照してください:
// http://go.microsoft.com/fwlink/?LinkId=232511
(function () {
    "use strict";

    var AccountAddingView = WinJS.UI.Pages.define("/js/vividcode/meteorline/ui/AccountAddingView.html", {
        /// <field type="HTMLElement">この PageControl をホストする HTML 要素</field>
        element: null, // IntelliSense のために宣言しているだけ; 値の設定は PageControl のコンストラクタで行われる

        // 初期化処理: コンストラクタで行うような処理はここで実行する
        init: function (element, options) {
            element.classList.add("account-adding-view-component");
            if (!options) options = {};
            if (options.initHide) this.hide();
        },

        // この関数は、ユーザーがこのページに移動するたびに呼び出されます。
        // ページ要素にアプリケーションのデータを設定します。
        ready: function (element, options) {
            // TODO: ここでページを初期化します。
        },

        unload: function () {
            // TODO: このページからの移動に対応します。
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
        AccountAddingView: AccountAddingView
    });
})();
