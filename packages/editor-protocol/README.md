# editor-protocol

这是给 Studio 直接消费的最小协议层，不替代 `contracts/`，只提供运行时可用的 TS 类型、常量、校验和基础 patch apply。

## 已提供能力

- TipTap 文档与 Patch 的最小 TS 类型
- 协议版本常量
- TipTap 根结构与 blockId、patch 字段校验
- 最小 patch apply helper

## 设计边界

- 不引入复杂依赖
- 不修改 `contracts/`
- 不依赖 Django/FastAPI
- 只覆盖最小可用协议面，不处理完整编辑器行为

