
/// <reference path="ms-appx://Microsoft.WinJS.1.0/js/base.js" />
(function () {
    "use strict";

    var BackgroundImageManager = WinJS.Class.define(function () {
        var applicationData = Windows.Storage.ApplicationData.current;
        this._folder = applicationData.localFolder;
        this._localSettings = applicationData.localSettings;
        this._backgroundImageFilename = "backgroundImage";
        this._settingKeyName = "background-image";
    }, {
        init: function () {
            // 初期化処理
            // 対象要素の指定と対象要素への背景画像設置
            // 他のメソッドを呼び出す前に 1 回だけ呼び出すこと
            this._targetElement = document.body;
            if (this.hasBackgroundImage()) {
                this.__setBackgroundImageToTargetElem();
            }
        },
        hasBackgroundImage: function () {
            return !!this._localSettings.values[this._settingKeyName];
        },
        removeBackgroundImage: function () {
            this._localSettings.values[this._settingKeyName] = "";
            this.__removeBackgroundImageFromTargetElem();
            // ファイルの削除
            this._folder.getFileAsync(this._backgroundImageFilename).
            then(function (backgroundImageFile) {
                backgroundImageFile.deleteAsync();
            }, function onError(err) {
                // ファイルが存在しない場合
            });
        },
        setBackgroundImage: function (file) {
            var that = this;

            // アプリのデータ全般 : http://msdn.microsoft.com/ja-jp/library/windows/apps/hh781225.aspx
            // local folder : http://msdn.microsoft.com/ja-jp/library/windows/apps/windows.storage.applicationdata.localfolder.aspx
            this._folder.createFileAsync(this._backgroundImageFilename, Windows.Storage.CreationCollisionOption.replaceExisting).
            then(function (backgroundImageFile) {
                return Windows.Storage.FileIO.readBufferAsync(file).then(function (buf) {
                    return Windows.Storage.FileIO.writeBufferAsync(backgroundImageFile, buf);
                });
            }).done(function () {
                that._localSettings.values[that._settingKeyName] = "{}";
                that.__setBackgroundImageToTargetElem();
            });
        },
        __removeBackgroundImageFromTargetElem: function () {
            this._targetElement.style.backgroundImage = "";
            this.dispatchEvent("backgroundchanged", {});
        },
        __setBackgroundImageToTargetElem: function () {
            var backgroundImageUriStr = "ms-appdata:///local/" + this._backgroundImageFilename;
            // キャッシュを無効化するためにクエリ文字列をつける
            backgroundImageUriStr += "?" + Date.now();
            this._targetElement.style.backgroundImage = "url(\"" + backgroundImageUriStr + "\")";
            this.dispatchEvent("backgroundchanged", {});
        }
    });

    // Set up event handlers for the control
    // 参考 http://blogs.msdn.com/b/windowsappdev_ja/archive/2012/10/16/javascript-windows-winjs.aspx
    WinJS.Class.mix(
        BackgroundImageManager,
        WinJS.Utilities.createEventProperties("backgroundchanged"),
        WinJS.Utilities.eventMixin
    );

    WinJS.Namespace.define("vividcode.meteorline", {
        BackgroundImageManager: BackgroundImageManager
    });
}).call(this);
