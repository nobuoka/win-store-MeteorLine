
/// <reference path="ms-appx://Microsoft.WinJS.1.0/js/base.js" />
(function () {
    "use strict";

    // アプリの背景画像を管理するクラス
    var BackgroundImageManager = WinJS.Class.define(function () {
        this._backgroundImageFilename = "backgroundImage";
        this._settingKeyName = "background-image";
        var applicationData = Windows.Storage.ApplicationData.current;
        this._folder = applicationData.localFolder;
        this._localSettings = applicationData.localSettings;

        /// <field value='{ horizontalPosition: "", verticalPosition: "", hasBackgroundImage: true }'>
        /// 背景画像の設定
        /// </field>
        this._bgImgSetting = null;
        /// <field type="HTMLElement">背景画像を設定する対象の HTML 要素</field>
        this._targetElement = null;
        this.__loadSetting();
    }, {
        init: function () {
            // 初期化処理
            // 対象要素の指定と対象要素への背景画像設置
            // 他のメソッドを呼び出す前に 1 回だけ呼び出すこと
            this._targetElement = document.body;
            this.__changeBgImgOfTargetElem();
        },
        hasBackgroundImage: function () {
            return this._bgImgSetting.hasBackgroundImage;
        },
        removeBackgroundImage: function () {
            // 値の変更と保存
            this._bgImgSetting.hasBackgroundImage = false;
            this.__saveSetting();
            // View への通知
            this.__changeBgImgOfTargetElem();
            this.dispatchEvent("backgroundchanged", {});
            // ファイルの削除 (View への通知より先にすべき?)
            this._folder.getFileAsync(this._backgroundImageFilename).
            then(function (backgroundImageFile) {
                backgroundImageFile.deleteAsync();
            }, function onError(err) {
                // ファイルが存在しない場合
            });
        },
        setBackgroundImage: function (file) {
            /// <var type="BackgroundImageManager"></var>
            var that = this;

            // アプリのデータ全般 : http://msdn.microsoft.com/ja-jp/library/windows/apps/hh781225.aspx
            // local folder : http://msdn.microsoft.com/ja-jp/library/windows/apps/windows.storage.applicationdata.localfolder.aspx
            this._folder.createFileAsync(this._backgroundImageFilename, Windows.Storage.CreationCollisionOption.replaceExisting).
            then(function (backgroundImageFile) {
                return Windows.Storage.FileIO.readBufferAsync(file).then(function (buf) {
                    return Windows.Storage.FileIO.writeBufferAsync(backgroundImageFile, buf);
                });
            }).done(function () {
                that._bgImgSetting.hasBackgroundImage = true;
                that.__saveSetting();
                that.__changeBgImgOfTargetElem();
                that.dispatchEvent("backgroundchanged", {});
            });
        },
        setBackgroundImageHorizontalPosition: function (val) {
            /// <summary>背景画像の横方向の表示位置を設定する. 背景画像が存在しない場合は何もしない. 予期せぬ値が渡された場合はデフォルト値を保存する.</summary>
            if (!this.hasBackgroundImage()) return;

            var expectedValues = { "left": 1, "center": 1, "right": 1 };
            this._bgImgSetting.horizontalPosition = expectedValues[val] ? val : "center";
            this.__saveSetting();
            this.__changeBgPosOfTargetElem();
            this.dispatchEvent("backgroundpositionchanged", {});
        },
        setBackgroundImageVerticalPosition: function (val) {
            /// <summary>背景画像の縦方向の表示位置を設定する. 背景画像が存在しない場合は何もしない. 予期せぬ値が渡された場合はデフォルト値を保存する.</summary>
            if (!this.hasBackgroundImage()) return;

            var expectedValues = { "top": 1, "center": 1, "bottom": 1 };
            this._bgImgSetting.verticalPosition = expectedValues[val] ? val : "center";
            this.__saveSetting();
            this.__changeBgPosOfTargetElem();
            this.dispatchEvent("backgroundpositionchanged", {});
        },
        getBackgroundImagePosition: function () {
            /// <summary>背景画像の表示位置の設定値を返す. 常に有効な値を返す.</summary>
            return { vertical: this._bgImgSetting.verticalPosition, horizontal: this._bgImgSetting.horizontalPosition };
        },

        // localSettings の操作
        __loadSetting: function () {
            var settingStr = this._localSettings.values[this._settingKeyName];
            var setting;
            if (settingStr) {
                setting = JSON.parse(settingStr);
            } else {
                setting = {
                    hasBackgroundImage: false,
                    horizontalPosition: "center",
                    verticalPosition: "center",
                };
            }
            this._bgImgSetting = setting;
        },
        __saveSetting: function () {
            var settingStr = JSON.stringify(this._bgImgSetting);
            this._localSettings.values[this._settingKeyName] = settingStr;
        },

        // View 相当の操作; 本来は別クラスとかにした方がいい
        __changeBgImgOfTargetElem: function () {
            if (this.hasBackgroundImage()) {
                var backgroundImageUriStr = "ms-appdata:///local/" + this._backgroundImageFilename;
                // キャッシュを無効化するためにクエリ文字列をつける
                backgroundImageUriStr += "?" + Date.now();
                this._targetElement.style.backgroundImage = "url(\"" + backgroundImageUriStr + "\")";
                this.__changeBgPosOfTargetElem();
            } else {
                this._targetElement.style.backgroundImage = "";
            }
        },
        __changeBgPosOfTargetElem: function () {
            this._targetElement.style.backgroundPosition =
                this._bgImgSetting.horizontalPosition + " " + this._bgImgSetting.verticalPosition;
        },
    });

    // Set up event handlers for the control
    // 参考 http://blogs.msdn.com/b/windowsappdev_ja/archive/2012/10/16/javascript-windows-winjs.aspx
    WinJS.Class.mix(
        BackgroundImageManager,
        WinJS.Utilities.createEventProperties("backgroundchanged"),
        WinJS.Utilities.createEventProperties("backgroundpositionchanged"),
        WinJS.Utilities.eventMixin
    );

    WinJS.Namespace.define("vividcode.meteorline", {
        BackgroundImageManager: BackgroundImageManager
    });
}).call(this);
