# フックシステム

## フックの種類

- **PreToolUse**: ツール実行前（バリデーション、パラメータ修正）
- **PostToolUse**: ツール実行後（自動フォーマット、チェック）
- **Stop**: セッション終了時（最終検証）

## 現在のフック（~/.claude/settings.json 内）

### PreToolUse
- **tmuxリマインダー**: 長時間実行コマンド（npm, pnpm, yarn, cargo等）にtmuxの使用を提案
- **git pushレビュー**: push前にZedでレビューを開く
- **ドキュメントブロッカー**: 不要な.md/.txtファイルの作成をブロック

### PostToolUse
- **PR作成**: PR URLとGitHub Actionsのステータスをログ出力
- **Prettier**: 編集後にJS/TSファイルを自動フォーマット
- **TypeScriptチェック**: .ts/.tsxファイル編集後にtscを実行
- **console.log警告**: 編集ファイル内のconsole.logについて警告

### Stop
- **console.log監査**: セッション終了前に全変更ファイルのconsole.logをチェック

## 自動承認パーミッション

慎重に使用すること:
- 信頼できる明確な計画に対して有効化する
- 探索的な作業では無効化する
- dangerously-skip-permissionsフラグは絶対に使用しない
- 代わりに `~/.claude.json` の `allowedTools` を設定する

## TodoWriteのベストプラクティス

TodoWriteツールの用途:
- マルチステップタスクの進捗を追跡する
- 指示の理解を確認する
- リアルタイムのステアリングを可能にする
- 詳細な実装ステップを表示する

Todoリストで判明すること:
- 順序が正しくないステップ
- 不足している項目
- 不要な余分な項目
- 粒度の誤り
- 要件の誤解
