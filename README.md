# Web NAS Manager

自宅NAS向けのWebファイルマネージャー。iPhone、iPad、Mac、PCのブラウザからファイル操作、写真プレビュー、メタデータ確認ができます。

Next.js + Dockerで構築。RAWファイルの高速プレビュー、EXIF/GPS表示、地図ビューなど、写真管理に特化した機能を搭載しています。

## 機能

### ファイル管理
- ディレクトリ閲覧（パンくずナビゲーション）
- ドラッグ&ドロップでアップロード（最大2GB）
- ストリーミングダウンロード（大容量ファイル対応）
- フォルダ作成、リネーム、削除
- リスト / グリッド / マップの3つの表示モード
- 名前 / サイズ / 日付でソート
- `Cmd+K`でファイル検索

### 写真・メディア
- **RAWサムネイル** — RAF, CR2/CR3, NEF, ARW, DNG, ORF, RW2, PEF対応（埋め込みJPEG抽出、1ファイル約100ms）
- **HEIC/TIFF**サムネイル変換（sharp使用）
- **Lightroom風画像プレビュー** — 右サイドバーにメタデータ、下部にサムネイルストリップ
- **EXIF表示** — カメラ、レンズ、焦点距離、シャッター速度、絞り、ISO
- **GPSマップビュー** — 写真の撮影位置を地図上にピン表示（マーカークラスタリング対応）
- **動画ストリーミング** — Range Request対応（MP4, MOV, MKV, WebM, AVI）

### 整理
- タグ — ファイルに自由にラベル付け
- お気に入り — 星アイコンでワンクリック登録
- サイドバーにお気に入り・タグセクション

### アプリ
- JWT認証（ブルートフォース対策付き）
- ダーク / ライト / システム連動テーマ
- PWA対応（ホーム画面に追加可能）
- iOS Safari最適化（Safe Area、タッチ操作、レスポンシブ）

## 技術スタック

| カテゴリ | 技術 |
|----------|------|
| フレームワーク | Next.js (App Router) |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS |
| 画像処理 | sharp |
| EXIF解析 | exifr |
| 地図 | Leaflet + leaflet.markercluster |
| 認証 | jose + bcryptjs |
| コンテナ | Docker (node:20-alpine) |

## セットアップ

### 1. クローン & インストール

```bash
git clone https://github.com/sutobu000/web-nas-manager.git
cd web-nas-manager
pnpm install
```

### 2. 環境変数の設定

```bash
cp .env.example .env.local
```

`.env.local`を編集:

```env
# ストレージのパスを指定（自分の環境に合わせて変更）
DRIVE_1_PATH=/path/to/your/drive1
DRIVE_2_PATH=/path/to/your/drive2

# 認証情報
JWT_SECRET=your-random-secret-here
AUTH_USERNAME=admin
AUTH_PASSWORD_HASH=$2b$10$your-bcrypt-hash
```

認証情報の生成:

```bash
# JWT秘密鍵
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# パスワードハッシュ
node -e "require('bcryptjs').hash('your-password', 10).then(console.log)"
```

### 3. ドライブの設定

`src/lib/constants.ts`の`STORAGE_DRIVES`を自分の環境に合わせて編集:

```typescript
export const STORAGE_DRIVES: StorageDrive[] = [
  {
    id: "Photos",          // docker-compose.ymlのマウント名と一致させる
    name: "Photos",        // サイドバーに表示される名前
    path: "/data/Photos",
    description: "写真アーカイブ",
    icon: "hdd",           // "hdd" または "ssd"
  },
  {
    id: "Videos",
    name: "Videos",
    path: "/data/Videos",
    description: "動画アーカイブ",
    icon: "hdd",
  },
  // 必要に応じてドライブを追加・削除...
];
```

`docker-compose.yml`のvolumesも合わせて編集:

```yaml
volumes:
  # 形式: <ホストパス>:/data/<ドライブID>
  # ドライブIDはconstants.tsのSTORAGE_DRIVESのidと一致させる

  # Windows:
  - E:\:/data/Photos
  - F:\:/data/Videos

  # Linux:
  - /mnt/hdd1:/data/Photos
  - /mnt/ssd1:/data/Videos

  # Mac:
  - /Volumes/ExternalHDD:/data/Photos
```

### 4. 起動

**ローカル開発:**

```bash
# .env.localにDATA_ROOTを設定（テスト用ディレクトリ）
# DATA_ROOT=./dev-data

pnpm dev
# http://localhost:3000
```

**Docker（本番）:**

```bash
docker compose up -d --build
# http://YOUR_NAS_IP:3000
```

## 環境変数一覧

| 変数 | 説明 | 必須 |
|------|------|------|
| `DRIVE_1_PATH` | 1番目のドライブのホストパス | Docker時 |
| `DRIVE_2_PATH` | 2番目のドライブのホストパス | Docker時 |
| `JWT_SECRET` | JWT署名用の秘密鍵 | 認証有効時 |
| `AUTH_USERNAME` | ログインユーザー名 | 認証有効時 |
| `AUTH_PASSWORD_HASH` | パスワードのbcryptハッシュ | 認証有効時 |
| `DATA_ROOT` | データルートの上書き（ローカル開発用） | 開発時 |
| `THUMBNAIL_CACHE_DIR` | サムネイルキャッシュの上書き | 任意 |

**`.env`での`$`エスケープについて:**
- Next.js（`.env.local`）: `\$`
- Docker Compose（`.env`）: `$$`

`JWT_SECRET`を設定しなければ認証はスキップされます（開発用）。

## API一覧

| メソッド | エンドポイント | 説明 |
|----------|---------------|------|
| `GET` | `/api/files?path=` | ディレクトリ一覧 |
| `DELETE` | `/api/files` | ファイル/フォルダ削除 |
| `POST` | `/api/files/upload` | アップロード（最大2GB） |
| `POST` | `/api/files/mkdir` | フォルダ作成 |
| `POST` | `/api/files/rename` | リネーム |
| `GET` | `/api/files/download?path=` | ダウンロード |
| `GET` | `/api/files/stream?path=` | 動画ストリーミング |
| `GET` | `/api/files/search?q=` | ファイル検索 |
| `GET` | `/api/files/metadata?path=` | EXIF/GPSメタデータ |
| `GET` | `/api/files/gps-scan?path=` | GPS写真スキャン |
| `GET/POST` | `/api/files/tags` | タグ・お気に入り |
| `GET` | `/api/thumbnail?path=` | サムネイル |
| `POST` | `/api/auth/login` | ログイン |
| `POST` | `/api/auth/logout` | ログアウト |
| `GET` | `/api/auth/session` | セッション確認 |

## キーボードショートカット

| ショートカット | 動作 |
|---------------|------|
| `Cmd+K` / `Ctrl+K` | 検索を開く |
| `i` | 情報パネルの切替（画像プレビュー中） |
| `←` `→` | 画像ナビゲーション（プレビュー中） |
| `Esc` | モーダル/検索を閉じる |

## セキュリティ

- 全APIでパストラバーサル対策済み
- アップロード上限: 2GB
- JWT認証（HttpOnly Cookie）
- ログインレート制限: 5回失敗で30秒ロック
- SVGはサムネイル生成対象外（XSS防止）

## ライセンス

MIT
