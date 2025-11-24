# Vercel環境変数の設定方法

## 問題: Discord Botが接続されない

Vercelで「Discord Botが接続されていません」というエラーが表示される場合、環境変数が正しく設定されていない可能性があります。

## 解決方法

### 1. Vercel Dashboardで環境変数を設定

1. [Vercel Dashboard](https://vercel.com/dashboard)にアクセス
2. プロジェクトを選択
3. 「Settings」タブをクリック
4. 左メニューから「Environment Variables」を選択
5. 以下の環境変数を追加：

#### 必須の環境変数

- **Key**: `DISCORD_TOKEN`
- **Value**: Discord Developer Portalで取得したBot Token
- **Environment**: Production, Preview, Development すべてにチェック

#### オプションの環境変数

- **Key**: `ALLOWED_ORIGINS`
- **Value**: 許可するオリジン（例: `https://your-app.vercel.app`）
- **Environment**: Production, Preview, Development すべてにチェック

### 2. 環境変数の確認方法

Vercel Dashboardの「Logs」タブで、以下のログを確認できます：

- `✅ DISCORD_TOKEN環境変数が設定されています` → 正常
- `⚠️ 警告: DISCORD_TOKEN環境変数が設定されていません` → 環境変数が未設定

### 3. 再デプロイ

環境変数を追加・変更した後は、**必ず再デプロイ**が必要です：

1. Vercel Dashboardで「Deployments」タブを開く
2. 最新のデプロイメントの「⋯」メニューから「Redeploy」を選択
3. または、GitHubにプッシュして自動デプロイをトリガー

### 4. トラブルシューティング

#### 環境変数が反映されない

- 環境変数を追加した後、必ず再デプロイしてください
- 「Environment」でProduction、Preview、Developmentすべてにチェックが入っているか確認

#### Discord Botが接続できない

1. **トークンが正しいか確認**
   - Discord Developer Portal → Bot → Token で確認
   - トークンは再生成されていないか確認

2. **Intentsが有効か確認**
   - Discord Developer Portal → Bot → Privileged Gateway Intents
   - 以下が有効になっているか確認：
     - ✅ MESSAGE CONTENT INTENT
     - ✅ SERVER MEMBERS INTENT（必要に応じて）

3. **Botがサーバーに参加しているか確認**
   - Botをサーバーに招待しているか確認
   - 必要な権限（Read Messages/View Channels, Read Message History）が付与されているか確認

4. **Vercelのログを確認**
   - Vercel Dashboard → Project → Logs
   - エラーメッセージを確認

### 5. 環境変数のセキュリティ

⚠️ **重要**: 環境変数には機密情報が含まれています

- 環境変数はVercel Dashboardでのみ設定・変更してください
- `.env`ファイルをGitHubにコミットしないでください（`.gitignore`に追加済み）
- トークンが漏洩した場合は、Discord Developer Portalで再生成してください


