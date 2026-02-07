// これで解消出来なかったので追加
// https://github.com/tursodatabase/libsql-client-ts/issues/303

export const fetch = globalThis.fetch;
export const Request = globalThis.Request;
export const Headers = globalThis.Headers;
export const Response = globalThis.Response;
export default fetch;
