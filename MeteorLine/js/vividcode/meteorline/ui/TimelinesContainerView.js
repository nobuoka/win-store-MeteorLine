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
        TimelinesContainerView: TimelinesContainerView
    });
})();
