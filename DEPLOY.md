# エックスサーバーへのデプロイ手順

## 前提条件

エックスサーバーでNode.jsアプリケーションを動かすには、以下のいずれかの方法が必要です：

1. **エックスサーバーのNode.js対応プランを使用する**
2. **別のホスティングサービス（Heroku、Railway、Renderなど）でNode.jsサーバーを動かし、エックスサーバーからAPIを呼び出す**

## 方法1: エックスサーバーでNode.jsを直接実行する場合

### 1. ファイルのアップロード

1. FTPクライアント（FileZillaなど）を使用して、以下のファイルをアップロード：
   - `server.js`
   - `package.json`
   - `.env`（トークンを含む）
   - `public/`フォルダ全体
   - `node_modules/`フォルダ（ローカルで`npm install`したもの）

### 2. サーバー側での設定

1. SSHでサーバーに接続
2. プロジェクトディレクトリに移動
3. 依存関係をインストール（必要に応じて）：
   ```bash
   npm install --production
   ```
4. Node.jsプロセスを起動：
   ```bash
   node server.js
   ```
5. バックグラウンドで実行する場合：
   ```bash
   nohup node server.js > app.log 2>&1 &
   ```

### 3. ポート番号の設定

エックスサーバーでは、通常ポート3000は使用できません。環境変数でポートを変更してください：

```bash
PORT=8080 node server.js
```

または`.env`ファイルに追加：
```
PORT=8080
```

## 方法2: 別のホスティングサービスを使用する場合（推奨）

### 1. Node.jsサーバーを別のサービスで動かす

**Herokuの場合：**
1. Herokuアカウントを作成
2. Heroku CLIをインストール
3. プロジェクトディレクトリで：
   ```bash
   heroku create your-app-name
   heroku config:set DISCORD_TOKEN=your_token_here
   git push heroku main
   ```

**Railwayの場合：**
1. Railwayアカウントを作成
2. GitHubリポジトリと連携
3. 環境変数を設定（DISCORD_TOKEN）
4. デプロイ

**Renderの場合：**
1. Renderアカウントを作成
2. GitHubリポジトリと連携
3. 環境変数を設定
4. デプロイ

### 2. エックスサーバー側の設定

1. `public/`フォルダの内容をエックスサーバーにアップロード
2. `public/app.js`のAPI_BASEを変更：
   ```javascript
   const API_BASE = 'https://your-nodejs-app.herokuapp.com';
   ```
   または
   ```javascript
   const API_BASE = 'https://your-app.railway.app';
   ```

### 3. CORS設定

Node.jsサーバー側で、エックスサーバーのドメインからのアクセスを許可する必要があります。

`server.js`のCORS設定を確認：
```javascript
app.use(cors({
  origin: ['https://your-domain.com', 'http://localhost:3000']
}));
```

## 方法3: 静的ファイルのみをエックスサーバーにアップロード

Node.jsサーバーを別の場所で動かし、エックスサーバーにはフロントエンドのみを配置する方法です。

### 1. アップロードするファイル

- `public/index.html`
- `public/style.css`
- `public/app.js`
- `public/test.html`（オプション）

### 2. app.jsの修正

`public/app.js`の先頭で、APIのベースURLを設定：

```javascript
// 本番環境用
const API_BASE = 'https://your-nodejs-server.com';

// 開発環境用（コメントアウト）
// const API_BASE = '';
```

## セキュリティに関する注意事項

1. **`.env`ファイルは絶対にアップロードしないでください**
   - `.gitignore`に追加済みですが、FTPアップロード時も注意
   - 環境変数はサーバーの管理画面で設定

2. **トークンの管理**
   - Discord Bot Tokenは機密情報です
   - 公開リポジトリにコミットしないでください

3. **HTTPSの使用**
   - 本番環境では必ずHTTPSを使用してください

## トラブルシューティング

### サーバーが起動しない

- ポート番号が正しいか確認
- 環境変数が正しく設定されているか確認
- ログファイルを確認

### CORSエラー

- サーバー側のCORS設定を確認
- 許可されているオリジンにエックスサーバーのドメインが含まれているか確認

### 接続エラー

- Node.jsサーバーが起動しているか確認
- ファイアウォールの設定を確認
- ポート番号が正しいか確認

