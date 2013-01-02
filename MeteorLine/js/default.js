
/// <reference path="/js/vividcode/meteorline/BackgroundImageManager.js" />
// ナビゲーション テンプレートの概要については、次のドキュメントを参照してください:
// http://go.microsoft.com/fwlink/?LinkId=232506
(function () {
    "use strict";

    WinJS.Binding.optimizeBindingReferences = true;

    var app = WinJS.Application;
    var activation = Windows.ApplicationModel.Activation;
    var nav = WinJS.Navigation;

    var accountList = new WinJS.Binding.List();
    WinJS.Namespace.define("vividcode.meteorline.global", {
        accountList: accountList,
        backgroundImageManager: new vividcode.meteorline.BackgroundImageManager(),
    });

    app.addEventListener("activated", function (args) {
        if (args.detail.kind === activation.ActivationKind.launch) {
            if (args.detail.previousExecutionState !== activation.ApplicationExecutionState.terminated) {
                // このアプリケーションは新しく起動しました。ここでアプリケーションを
                // 初期化します。
                vividcode.meteorline.global.backgroundImageManager.init();

                var accountList = vividcode.meteorline.global.accountList;

                var applicationData = Windows.Storage.ApplicationData.current;
                var localSettings = applicationData.localSettings;
                var accounts = JSON.parse(localSettings.values["accounts"] || "[]");
                accounts.forEach(function (a) {
                    accountList.push(a);
                });
                var saveAccounts = function () {
                    // 保存
                    var applicationData = Windows.Storage.ApplicationData.current;
                    var localSettings = applicationData.localSettings;
                    var accounts = accountList.map(function (account) {
                        return account;
                    });
                    localSettings.values["accounts"] = JSON.stringify(accounts);
                };
                var al = accountList;
                al.addEventListener("itemchanged", saveAccounts);
                al.addEventListener("iteminserted", saveAccounts);
                al.addEventListener("itemremoved", saveAccounts);
                al.addEventListener("reload", saveAccounts);
            } else {
                // TODO: このアプリケーションは中断状態から再度アクティブ化されました。
                // ここでアプリケーションの状態を復元します。
            }

            if (app.sessionState.history) {
                nav.history = app.sessionState.history;
            }
            args.setPromise(WinJS.UI.processAll().then(function () {
                if (nav.location) {
                    nav.history.current.initialPlaceholder = true;
                    return nav.navigate(nav.location, nav.state);
                } else {
                    return nav.navigate(Application.navigator.home);
                }
            }));
        }
    });

    app.oncheckpoint = function (args) {
        // TODO: このアプリケーションは中断しようとしています。ここで中断中に
        // 維持する必要のある状態を保存します。アプリケーションが中断される前に 
        // 非同期操作を終了する必要がある場合は 
        // args.setPromise() を呼び出してください。
        app.sessionState.history = nav.history;
    };

    // アプリ設定に関して - 参考 : http://vividcode.hatenablog.com/entry/winrt/app-settings-js
    app.addEventListener("settings", function (evt) {
        evt.detail.applicationcommands = {
            // プロパティ名は SettingsFlyout コントロールの ID (settingsCommandId)
            // title は設定ウィンドウの項目に表示される
            // href はその SettingsFlyout コントロールが定義されている HTML ファイル
            privacyPolicy: { title: "プライバシーポリシー", href: "/pages/setting/privacyPolicy.html" },
            appSetting: { title: "アプリの設定", href: "/pages/setting/appSetting.html" },
            //name: { title: ..., href: ... },
            // ...
        };
        WinJS.UI.SettingsFlyout.populateSettings(evt);
    });

    app.addEventListener("loaded", function (evt) {
        WinJS.Resources.processAll();
        WinJS.Resources.addEventListener("contextchanged", function (evt) { WinJS.Resources.processAll() }, false);
    });

    app.start();
})();
