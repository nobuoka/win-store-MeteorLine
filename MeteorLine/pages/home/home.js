(function () {
    "use strict";

    var MainViewContainer = WinJS.Class.define(function (element) {
        this.element = element;
        // TODO 今は HTML 要素を直接操作しているが, 将来的には JS のオブジェクトを扱うように
        this._timelinesContainerView = element.getElementsByClassName("timelines-container-view").item(0);
        this._accountAddingView = element.getElementsByClassName("account-adding-view").item(0).winControl;
    }, {
        showTimelinesContainerView: function () {
            this._accountAddingView.hide();
            this._timelinesContainerView.style.display = "";
        },
        showAccountAddingView: function () {
            this._timelinesContainerView.style.display = "none";
            this._accountAddingView.show();
        }
    });

    WinJS.UI.Pages.define("/pages/home/home.html", {
        // この関数は、ユーザーがこのページに移動するたびに呼び出されます。
        // ページ要素にアプリケーションのデータを設定します。
        ready: function (element, options) {
            var mvc = this._mainViewContainer = new MainViewContainer(element.querySelector("section[role='main']"));
            element.getElementsByClassName("button-account-adding").item(0).addEventListener("click", function (evt) {
                mvc.showAccountAddingView();
            }, false);
            element.getElementsByClassName("button-timelines-container").item(0).addEventListener("click", function (evt) {
                mvc.showTimelinesContainerView();
            }, false);
            // 初期状態ではタイムライン一覧 view は表示しない
            mvc.showAccountAddingView();
        },

        unload: function () {
            // 終了処理
            // ページ内に埋め込んだ PageControl の unload を呼び出す
            var pagecontrols = [];
            var pagecontrolElems = this.element.querySelectorAll(".homepage > section > .container > .pagecontrol");
            for (var i = 0, len = pagecontrolElems.length; i < len; ++i) {
                pagecontrols.push(pagecontrolElems.item(i).winControl);
            }
            pagecontrols.forEach(function (pagecontrol) {
                if (pagecontrol && pagecontrol.unload) pagecontrol.unload();
            });
        }
    });
})();
