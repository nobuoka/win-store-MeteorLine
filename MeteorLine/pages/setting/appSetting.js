﻿
/// <reference path="/js/default.js" />
// ページ コントロール テンプレートの概要については、次のドキュメントを参照してください:
// http://go.microsoft.com/fwlink/?LinkId=232511
(function () {
    "use strict";

    WinJS.UI.Pages.define("/pages/setting/appSetting.html", {
        /// <field type="HTMLElement">この PageControl をホストする HTML 要素</field>
        element: null, // IntelliSense のために宣言しているだけ; 値の設定は PageControl のコンストラクタで行われる
        /// <field type="HTMLButtonElement">背景画像の削除をするボタン</field>
        _removingBgImgButton: null,

        // PageControl の読み込み処理の中で実行される処理
        // SettingsFlyout へのイベントリスナの登録はここでやる
        processed: function (element, options) {
            this.__setEventListenersOntoAppSettingView();
        },

        // 注意) showSettingsFlyout によって SettingsFlyout が表示された場合, SettingsFlyout を閉じる際に
        // unload イベントが呼び出されることなく DOM ツリーから PageControl が除去される

        __setEventListenersOntoAppSettingView: function () {
            var that = this;

            var settingBgImgButton = this.element.querySelector(".setting-background-image-button");
            var removingBgImgButton = this._removingBgImgButton = this.element.querySelector(".removing-background-image-button");

            var settingBgImgButtonClickedEventListener = function (evt) {
                that.__setBackgroundImage();
            };
            var removingBgImgButtonClickedEventListener = function (evt) {
                that.__removeBackgroundImage();
            };

            var backgroundchangedEventListener = function (evt) {
                that.__setRemovingBgImgButtonStatus();
            };
            this.__setRemovingBgImgButtonStatus();

            /// <var type="WinJS.UI.SettingsFlyout">アプリの設定を行うための SettingsFlyout</var>
            var settingsFlyout = this.element.querySelector(".app-setting").winControl;
            settingsFlyout.addEventListener("beforeshow", function (evt) {
                settingBgImgButton.addEventListener("click", settingBgImgButtonClickedEventListener, false);
                removingBgImgButton.addEventListener("click", removingBgImgButtonClickedEventListener, false);
                vividcode.meteorline.global.backgroundImageManager.addEventListener("backgroundchanged", backgroundchangedEventListener, false);
            }, false);
            settingsFlyout.addEventListener("afterhide", function (evt) {
                settingBgImgButton.removeEventListener("click", settingBgImgButtonClickedEventListener, false);
                removingBgImgButton.removeEventListener("click", removingBgImgButtonClickedEventListener, false);
                vividcode.meteorline.global.backgroundImageManager.removeEventListener("backgroundchanged", backgroundchangedEventListener, false);
            }, false);
        },

        __setBackgroundImage: function () {
            var that = this;

            // ファイルの選択 - 参考 http://msdn.microsoft.com/ja-jp/library/windows/apps/hh465199.aspx
            // Verify that we are currently not snapped, or that we can unsnap to open the picker
            var currentState = Windows.UI.ViewManagement.ApplicationView.value;
            if (currentState === Windows.UI.ViewManagement.ApplicationViewState.snapped &&
                !Windows.UI.ViewManagement.ApplicationView.tryUnsnap()) {
                // Fail silently if we can't unsnap
                return;
            }

            // Create the picker object and set options
            var openPicker = new Windows.Storage.Pickers.FileOpenPicker();
            openPicker.viewMode = Windows.Storage.Pickers.PickerViewMode.thumbnail;
            openPicker.suggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.picturesLibrary;
            // Users expect to have a filtered view of their folders depending on the scenario.
            // For example, when choosing a documents folder, restrict the filetypes to documents for your application.
            openPicker.fileTypeFilter.replaceAll([".png", ".jpg", ".jpeg", ".gif"]);

            // Open the picker for the user to pick a file
            openPicker.pickSingleFileAsync().then(function (file) {
                if (file) {
                    vividcode.meteorline.global.backgroundImageManager.setBackgroundImage(file);
                }
                // ファイルピッカーを開くと設定ポップアップが閉じてしまうので, 再度開く
                WinJS.UI.SettingsFlyout.showSettings("appSetting", "/pages/setting/appSetting.html");
            });
        },

        __removeBackgroundImage: function () {
            vividcode.meteorline.global.backgroundImageManager.removeBackgroundImage();
        },

        __setRemovingBgImgButtonStatus: function () {
            if (vividcode.meteorline.global.backgroundImageManager.hasBackgroundImage()) {
                this._removingBgImgButton.disabled = false;
            } else {
                this._removingBgImgButton.disabled = true;
            }
        },
    });
})();
