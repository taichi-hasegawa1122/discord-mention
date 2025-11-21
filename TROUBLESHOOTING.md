# トラブルシューティングガイド

## Discord Botが接続されない場合

### 1. 環境変数の確認

Vercel Dashboardで環境変数が正しく設定されているか確認：

1. [Vercel Dashboard](https://vercel.com/dashboard) → プロジェクトを選択
2. 「Settings」→「Environment Variables」
3. `DISCORD_TOKEN`が存在するか確認
4. 値が正しいか確認（Discord Developer Portalのトークンと一致しているか）

### 2. 再デプロイの確認

環境変数を追加・変更した後は**必ず再デプロイ**が必要です：

1. Vercel Dashboard → 「Deployments」タブ
2. 最新のデプロイメントの「⋯」→「Redeploy」
3. 再デプロイが完了するまで待つ（1-2分）

### 3. Vercelのログを確認

Vercel Dashboardでエラーログを確認：

1. Vercel Dashboard → プロジェクト → 「Logs」タブ
2. 以下のログを確認：
   - ✅ `DISCORD_TOKEN環境変数が設定されています` → 正常
   - ⚠️ `DISCORD_TOKEN環境変数が設定されていません` → 環境変数未設定
   - ✅ `Vercel環境: Discord Bot接続完了` → 接続成功
   - ❌ `Discord Botの接続に失敗しました` → 接続エラー

### 4. ブラウザの開発者ツールで確認

1. ブラウザでF12キーを押して開発者ツールを開く
2. 「Network」タブを開く
3. ページをリロード
4. `/api/status`のリクエストを確認
5. レスポンスの`debug`フィールドを確認：
   ```json
   {
     "hasToken": true/false,
     "isVercel": true,
     "hasClient": true/false,
     "isReady": true/false
   }
   ```

### 5. よくある原因と解決方法

#### 原因1: 環境変数が設定されていない

**症状**: `hasToken: false`が表示される

**解決方法**:
1. Vercel Dashboard → Settings → Environment Variables
2. `DISCORD_TOKEN`を追加
3. 値をDiscord Developer Portalのトークンに設定
4. **再デプロイ**

#### 原因2: 環境変数は設定されているが、再デプロイしていない

**症状**: `hasToken: true`だが`hasClient: false`または`isReady: false`

**解決方法**:
1. Vercel Dashboard → Deployments → 最新のデプロイメント → 「⋯」→「Redeploy」
2. 再デプロイ完了を待つ（1-2分）

#### 原因3: トークンが間違っている

**症状**: Vercelのログに「Discord Botの接続に失敗しました」と表示される

**解決方法**:
1. [Discord Developer Portal](https://discord.com/developers/applications)にアクセス
2. アプリケーションを選択 → 「Bot」タブ
3. 「Reset Token」でトークンを再生成（必要に応じて）
4. 新しいトークンをコピー
5. Vercel Dashboardで環境変数を更新
6. **再デプロイ**

#### 原因4: Intentsが有効になっていない

**症状**: 接続は成功するが、メッセージを取得できない

**解決方法**:
1. [Discord Developer Portal](https://discord.com/developers/applications)にアクセス
2. アプリケーションを選択 → 「Bot」タブ
3. 「Privileged Gateway Intents」セクションで以下を有効化：
   - ✅ MESSAGE CONTENT INTENT
   - ✅ SERVER MEMBERS INTENT（必要に応じて）

#### 原因5: Botがサーバーに参加していない

**症状**: 接続は成功するが、サーバーが表示されない

**解決方法**:
1. Botをサーバーに招待
2. 必要な権限を付与：
   - Read Messages/View Channels
   - Read Message History

### 6. デバッグエンドポイント

`/api/status`エンドポイントにアクセスすると、詳細な情報が返されます：

```bash
curl https://your-app.vercel.app/api/status
```

レスポンス例：
```json
{
  "connected": false,
  "guilds": [],
  "error": "DISCORD_TOKEN環境変数が設定されていません...",
  "debug": {
    "hasToken": false,
    "isVercel": true,
    "hasClient": false,
    "isReady": false
  }
}
```

### 7. それでも解決しない場合

1. Vercel DashboardのLogsでエラーメッセージを確認
2. エラーメッセージをコピー
3. エラーメッセージと一緒に問題を報告

