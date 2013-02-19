MeteorLine
==============================

Windows ストアアプリ “MeteorLine” のソースコードです。
ソースコードの公開は Windows ストアアプリ開発者同士の情報交換のためのものです。
利用条件については LICENSE.txt をご覧ください。

一般の Windows ユーザーの方で MeteorLine を利用したい方は、下記ページをご覧ください。

* http://apps.microsoft.com/windows/ja-JP/app/meteorline/3e20fa73-bf60-470c-9360-cf7b77a63437

手元での実行方法
------------------------------

本ソースコードを手元で実行するためには、まずソースコードをローカル環境にダウンロードしてください。
git clone するのが一番良いかと思いますが、GitHub では ZIP でダウンロードすることも可能です。

Visual Studio でプロジェクトを開き、MeteorLine/js/vividcode/meteorline/Config.js の内容を書きかえてください。
バージョン 0.1.0.2 現在、書きかえるべき場所は Twitter の Client Credentials のみです。

あとは普通のプロジェクトと同様に実行してもらえれば問題なく動作するはずです。
