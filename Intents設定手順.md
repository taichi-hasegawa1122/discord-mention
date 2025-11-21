# Discord Bot Intents設定手順（重要）

## 現在のエラー
```
❌ 接続に失敗しました:
エラーメッセージ: Used disallowed intents
```

このエラーは、Discord Developer PortalでIntentsが有効になっていないことが原因です。

## 解決手順（必須）

### ステップ1: Discord Developer Portalにアクセス
1. ブラウザで [https://discord.com/developers/applications](https://discord.com/developers/applications) を開く
2. Discordアカウントでログイン

### ステップ2: アプリケーションを選択
1. 作成したBotのアプリケーションをクリック

### ステップ3: Bot設定を開く
1. 左サイドバーから「**Bot**」をクリック

### ステップ4: Privileged Gateway Intentsを有効化 ⚠️ 重要
1. ページを下にスクロールして「**Privileged Gateway Intents**」セクションを見つける
2. 以下のチェックボックスを**必ず有効化**してください：

   ✅ **MESSAGE CONTENT INTENT**（必須）
   - メッセージの内容を読み取るために必要
   - これがないとメンションをカウントできません

   ✅ **SERVER MEMBERS INTENT**（推奨）
   - サーバーメンバー情報を取得するために必要

3. 変更は自動保存されます

### ステップ5: 確認
- チェックボックスが**ON**になっていることを確認してください
- 画面を更新して、設定が保存されているか確認してください

### ステップ6: 接続を再テスト
Intentsを有効化したら、以下のコマンドで接続を確認してください：

```bash
node check-connection.js
```

成功すると、以下のようなメッセージが表示されます：
```
✅ Discord Botに接続成功！
Bot名: YourBot#1234
参加しているサーバー数: 1

参加しているサーバー:
  - サーバー名 (ID: 123456789)
```

## 注意事項
- Intentsを有効化しないと、Botは接続できません
- Intentsの変更は即座に反映されます
- 既に接続しているBotは切断される場合がありますが、問題ありません

## トラブルシューティング
- Intentsを有効化してもエラーが出る場合：
  1. ブラウザのキャッシュをクリア
  2. Discord Developer Portalのページを更新
  3. 設定が保存されているか再確認
  4. 数秒待ってから再度接続テスト

