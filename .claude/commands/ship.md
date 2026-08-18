---
description: 現在のフォルダをGitHubリポジトリ化してpushする
---
1. .git がなければ git init
2. 内容に応じた .gitignore と README.md を生成
3. git add -A して、変更内容に沿った日本語コミットメッセージでコミット
4. リモート未設定なら `gh repo create <フォルダ名> --private --source=. --remote=origin --push`
   設定済みなら git push
