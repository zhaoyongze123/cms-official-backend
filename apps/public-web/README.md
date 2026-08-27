# public-web

## 当前状态

`apps/public-web` 已迁移到 Next.js App Router，当前用于承接公开 SEO 站点。

当前技术栈：

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS 4
- Three.js / React Three Fiber

## 当前职责

该应用直接消费 Django CMS 公开文章 API，渲染公开落地页、解决方案列表页与文章详情页，并输出基础服务端 SEO metadata。

本阶段已经完成：

- 建立 monorepo 下独立 `apps/public-web` 应用目录
- 将原公开站视觉实现迁入 Next.js
- 接入 Django 公开文章 API：
  - `GET /api/public/articles/`
  - `GET /api/public/articles/{slug}/`
- 实现真实路由：
  - `/`
  - `/solutions`
  - `/articles/[slug]`
- 文章详情页支持服务端 metadata 输出
- 站点首页、方案页、文章页均输出服务端 `title`、`description`、`canonical`
- 站点级 `Organization` / `WebSite` JSON-LD 与文章页 `Article` / `BreadcrumbList` JSON-LD 已输出
- 方案页与文章页当前按实时模式从 Django 公开 API 取数
- `next build` 可生成静态首页、方案页与文章详情页

## 环境变量

复制 `.env.example` 并按本地环境设置：

```bash
cp apps/public-web/.env.example apps/public-web/.env.local
```

当前关键变量：

- `NEXT_PUBLIC_DJANGO_PUBLIC_BASE_URL`：Django CMS 公开 API 基础地址，默认 `http://127.0.0.1:9801`
- `NEXT_PUBLIC_SITE_URL`：public-web 对外站点基础地址，默认 `http://127.0.0.1:9303`

## 本地运行

完整本地环境以 Process UI 为唯一入口。在 `CMS 官网后台` 中点击“全部启动”，它会调用本仓库的 `docker-compose.dev.yml`，统一启动数据库、缓存、Django、AI 服务、Worker、邮件通知和两个 Next.js 服务。官网以生产模式常驻，编辑端使用 Webpack 开发模式；这样可在本机 Docker 内存配额内稳定共存。

官方访问地址：

```text
http://127.0.0.1:9303
```

仅调试 public-web 时可单独执行下列命令；脚本同样固定使用 `9303`，不能与完整环境同时运行：

```bash
npm install --prefix apps/public-web
npm run dev --prefix apps/public-web
```


## 生产验证

```bash
npm run build --prefix apps/public-web
npm run start --prefix apps/public-web
```

当前生产态实测：

- `/solutions` 在当前开发模式下返回 `Cache-Control: no-store, must-revalidate`
- `/articles/[slug]` 在当前开发模式下返回 `Cache-Control: no-store, must-revalidate`
- 方案页和文章页均可在 HTML 中直接看到 metadata 与 JSON-LD

## 当前已知限制

- 页面视觉中仍包含较重的客户端动画依赖，后续需要继续做 SSR 友好收敛
- Django 侧公开 SEO 字段尚未补齐更完整的 sitemap / 站点级 SEO API / FAQ JSON-LD 真相源协同
- 当前本地 `apps/cms-api` Python 依赖未安装，无法在此环境直接运行 Django 测试命令
