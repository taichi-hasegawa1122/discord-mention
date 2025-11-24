# Gitリポジトリのセットアップ

## 現在の状態

✅ Gitリポジトリは初期化済みです
✅ `.env`ファイルと`node_modules`は除外されています
✅ 初回コミットが作成されました

## リモートリポジトリにプッシュする方法

### 1. GitHubでリポジトリを作成

1. [GitHub](https://github.com)にログイン
2. 右上の「+」→「New repository」をクリック
3. リポジトリ名を入力（例: `discord-mention-counter`）
4. 「Create repository」をクリック

### 2. リモートリポジトリを追加

```bash
git remote add origin https://github.com/your-username/your-repo-name.git
```

### 3. ブランチ名を確認・変更（必要に応じて）

```bash
# 現在のブランチ名を確認
git branch

# ブランチ名をmainに変更（必要に応じて）
git branch -M main
```

### 4. プッシュ

```bash
git push -u origin main
```

## 注意事項

⚠️ **重要**: `.env`ファイルは絶対にコミットしないでください
- Discord Bot Tokenが含まれているため、セキュリティ上危険です
- `.gitignore`に追加済みですが、念のため確認してください

## 今後の作業フロー

### 変更をコミットする場合

```bash
# 変更を確認
git status

# 変更をステージング
git add .

# コミット
git commit -m "変更内容の説明"

# プッシュ
git push
```

### 新しいファイルを追加する場合

```bash
git add ファイル名
git commit -m "新しいファイルを追加"
git push
```

## トラブルシューティング

### .envファイルが誤ってコミットされた場合

```bash
# コミット履歴から削除
git rm --cached .env
git commit -m ".envファイルを削除"
git push
```

### リモートリポジトリのURLを変更する場合

```bash
# 現在のリモートを確認
git remote -v

# リモートを削除
git remote remove origin

# 新しいリモートを追加
git remote add origin https://github.com/your-username/new-repo-name.git
```

