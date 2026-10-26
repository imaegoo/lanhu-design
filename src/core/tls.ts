import tls from "node:tls";

/** OpenSSL 的 SSL_OP_LEGACY_SERVER_CONNECT。 */
const SSL_OP_LEGACY_SERVER_CONNECT = 0x4;

let enabled = false;

/**
 * 部分私有部署的蓝湖仍在使用旧版 TLS 重协商，OpenSSL 3 默认拒绝握手
 * （ERR_SSL_UNSAFE_LEGACY_RENEGOTIATION_DISABLED），而 curl/Schannel 默认可连。
 * 这里为所有 TLS 连接打开 LEGACY_SERVER_CONNECT；现代服务端不受影响。
 */
export function enableLegacyTls(): void {
  if (enabled) return;
  enabled = true;
  const original = tls.connect;
  const patched = function patchedConnect(this: unknown, ...args: unknown[]) {
    const options = args[0];
    if (options && typeof options === "object") {
      const connection = options as tls.ConnectionOptions;
      connection.secureOptions = (connection.secureOptions ?? 0) | SSL_OP_LEGACY_SERVER_CONNECT;
    }
    return Reflect.apply(original, this, args);
  };
  tls.connect = patched as unknown as typeof tls.connect;
}
