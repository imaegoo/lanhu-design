// 兼容私有部署的旧版 TLS 重协商：必须在任何 fetch 之前执行。
import tls from "node:tls";

const SSL_OP_LEGACY_SERVER_CONNECT = 0x4;
const original = tls.connect;

tls.connect = function patchedConnect(...args) {
  const options = args[0];
  if (options && typeof options === "object") {
    options.secureOptions = (options.secureOptions ?? 0) | SSL_OP_LEGACY_SERVER_CONNECT;
  }
  return Reflect.apply(original, this, args);
};
