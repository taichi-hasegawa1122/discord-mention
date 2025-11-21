#!/bin/bash

# プロジェクトのディレクトリに移動
cd "$(dirname "$0")"

# .envファイルの存在確認
if [ ! -f .env ]; then
    echo "エラー: .envファイルが見つかりません"
    echo "プロジェクトのルートディレクトリに.envファイルを作成してください"
    echo ""
    echo ".envファイルの内容例:"
    echo "DISCORD_TOKEN=your_token_here"
    echo "PORT=3000"
    read -p "Enterキーを押して終了..."
    exit 1
fi

# node_modulesの存在確認
if [ ! -d node_modules ]; then
    echo "依存関係をインストールしています..."
    npm install
fi

# サーバーを起動
echo "サーバーを起動しています..."
echo "ブラウザが自動で開きます..."
echo ""
echo "サーバーを停止するには、このウィンドウで Ctrl+C を押してください"
echo ""

# 少し待ってからブラウザを開く
(sleep 3 && open http://localhost:3000) &

# サーバーを起動
npm start

