(function () {
    "use strict";

    var MainViewContainer = WinJS.Class.define(function (element) {
        this.element = element;
        this._timelinesContainerView = element.getElementsByClassName("timelines-container-view").item(0).winControl;
        this._accountAddingView = element.getElementsByClassName("account-adding-view").item(0).winControl;
    }, {
        showTimelinesContainerView: function () {
            this._accountAddingView.hide();
            this._timelinesContainerView.show();
        },
        showAccountAddingView: function () {
            this._timelinesContainerView.hide();
            this._accountAddingView.show();
        }
    });

    WinJS.UI.Pages.define("/pages/home/home.html", {
        // この関数は、ユーザーがこのページに移動するたびに呼び出されます。
        // ページ要素にアプリケーションのデータを設定します。
        ready: function (element, options) {
            WinJS.Resources.processAll(element);
            var mvc = this._mainViewContainer = new MainViewContainer(element.querySelector("section[role='main']"));
            element.getElementsByClassName("button-account-adding").item(0).addEventListener("click", function (evt) {
                mvc.showAccountAddingView();
            }, false);
            element.getElementsByClassName("button-timelines-container").item(0).addEventListener("click", function (evt) {
                mvc.showTimelinesContainerView();
            }, false);
            // 既にアカウントを持っている場合は, 最初にリスト一覧を表示する
            if (vividcode.meteorline.global.accountList.length !== 0) {
                mvc.showTimelinesContainerView();
            }
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
