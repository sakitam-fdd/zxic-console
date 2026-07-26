/// <reference types="@rsbuild/core/types" />

interface ImportMetaEnv {
  readonly PUBLIC_BASE_URL?: string;
  /** 为 "true" 时使用 HAR 脱敏 mock，不访问真实设备 */
  readonly PUBLIC_MOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
