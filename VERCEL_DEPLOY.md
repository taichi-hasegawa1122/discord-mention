# Vercelへのデプロイ手順

## 前提条件

- Vercelアカウント（[vercel.com](https://vercel.com)で作成）
- GitHubリポジトリにコードがプッシュされていること

## デプロイ方法

### 方法1: Vercel CLIを使用

1. Vercel CLIをインストール：
   ```bash
   npm install -g vercel
   ```

2. プロジェクトディレクトリでログイン：
   ```bash
   vercel login
   ```

3. デプロイ：
   ```bash
   vercel
   ```

4. 本番環境にデプロイ：
   ```bash
   vercel --prod
   ```

### 方法2: GitHubと連携（推奨）

1. [Vercel Dashboard](https://vercel.com/dashboard)にアクセス
2. 「Add New Project」をクリック
3. GitHubリポジトリを選択
4. プロジェクト設定：
   - **Framework Preset**: Other
   - **Root Directory**: `./`（そのまま）
   - **Build Command**: （空欄のまま）
   - **Output Directory**: （空欄のまま）

5. 環境変数を設定：
   - **DISCORD_TOKEN**: Discord Bot Token
   - **ALLOWED_ORIGINS**: （オプション）許可するオリジン（カンマ区切り）

6. 「Deploy」をクリック

## 環境変数の設定

Vercel Dashboardで以下の環境変数を設定してください：

1. **DISCORD_TOKEN**（必須）
   - Discord Developer Portalで取得したBot Token

2. **ALLOWED_ORIGINS**（オプション）
   - 許可するオリジン（例: `https://your-app.vercel.app`）
   - 複数指定する場合はカンマ区切り

3. **PORT**（通常は不要）
   - Vercelが自動で設定します

## トラブルシューティング

### 「Cannot GET」エラー

`vercel.json`の設定を確認してください。正しく設定されていれば、以下のように動作します：
- `/` → `public/index.html`が表示される
- `/api/*` → `server.js`のAPIエンドポイントが呼ばれる

### Discord Botが接続されない

1. 環境変数`DISCORD_TOKEN`が正しく設定されているか確認
2. Vercelのログを確認（Dashboard → Project → Logs）
3. BotのIntentsが有効になっているか確認

### 静的ファイルが読み込まれない

`vercel.json`の`routes`設定を確認してください。正しく設定されていれば、`public/`フォルダ内のファイルが自動で配信されます。

## デプロイ後の確認

1. Vercelが提供するURLにアクセス
2. ブラウザの開発者ツールでエラーを確認
3. Vercel DashboardのLogsでサーバー側のエラーを確認

## 注意事項

- Vercelの無料プランでは、サーバーレス関数の実行時間に制限があります
- 大量のメッセージを処理する場合、タイムアウトする可能性があります
- 必要に応じて、Vercel Proプランの使用を検討してください

