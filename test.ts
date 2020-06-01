import {
  assertThrowsAsync,
  createHttpError,
  RouterContext,
  ServerRequest,
  httpErrors,
  Request,
} from "./deps.ts";
import {
  validatorMiddleware,
  validateStringInArray,
  validateIsNumber,
} from "./mod.ts";

const encoder = new TextEncoder();

function createMockBodyReader(body: string): Deno.Reader {
  const buf = encoder.encode(body);
  let offset = 0;
  return {
    async read(p: Uint8Array): Promise<number | null> {
      if (offset >= buf.length) {
        return null;
      }
      const chunkSize = Math.min(p.length, buf.length - offset);
      p.set(buf);
      offset += chunkSize;
      return chunkSize;
    },
  };
}

interface MockServerRequestOptions {
  url?: string;
  host?: string;
  body?: string;
  headerValues?: Record<string, string>;
  proto?: string;
}

function createMockServerRequest(
  {
    url = "/",
    host = "localhost",
    body = "",
    headerValues = {},
    proto = "HTTP/1.1",
  }: MockServerRequestOptions = {},
): ServerRequest {
  const headers = new Headers();
  headers.set("host", host);
  for (const [key, value] of Object.entries(headerValues)) {
    headers.set(key, value);
  }
  if (body.length && !headers.has("content-length")) {
    headers.set("content-length", String(body.length));
  }
  return {
    headers,
    method: "GET",
    url,
    proto,
    body: createMockBodyReader(body),
    async respond() {},
  } as any;
}

const mockContext = (
  params: Record<string, string> = {},
  body: string = "",
  bodyType: string = "application/json",
): RouterContext => {
  const request = new Request(createMockServerRequest({
    url: createMockUrl(params),
    body,
    headerValues: {
      "Content-Type": bodyType,
    },
  }));
  const result = {
    params,
    request,
    throw: (status: number, msg: string) => {
      throw createHttpError(status, msg);
    },
  };

  return result as unknown as RouterContext;
};

const mockNext = () => {
  return new Promise<void>((resolve) => {
    resolve();
  });
};

const createMockUrl = (object: Record<string, string>) => {
  let result = `http://foo.bar/?`;
  for (let [key, value] of Object.entries(object)) {
    result += `&${key}=${value}`;
  }
  result = result.replace("?&", "?");
  result = result.endsWith("?") ? result.slice(undefined, -1) : result;
  return result;
};

const tests = [
  {
    name: "Success url",
    async fn() {
      const mw = validatorMiddleware({
        validations: [
          { key: "a", validationOption: "string", isUrlParam: true },
        ],
      });

      await mw(mockContext({ a: "b" }), mockNext);
    },
  },
  {
    name: "Success body JSON",
    async fn() {
      const mw = validatorMiddleware({
        validations: [
          { key: "a", validationOption: "string" },
        ],
      });

      await mw(mockContext({}, JSON.stringify({ a: "b" })), mockNext);
    },
  },
  {
    name: "Success body form",
    async fn() {
      const mw = validatorMiddleware({
        validations: [
          { key: "a", validationOption: "string" },
        ],
      });

      await mw(
        mockContext({}, "a=b", "application/x-www-form-urlencoded"),
        mockNext,
      );
    },
  },
  {
    name: "Success validation value",
    async fn() {
      const mw = validatorMiddleware({
        validations: [
          { key: "a", validationOption: "b" },
        ],
      });

      await mw(
        mockContext({}, "a=b", "application/x-www-form-urlencoded"),
        mockNext,
      );
    },
  },
  {
    name: "Success optional",
    async fn() {
      const mw = validatorMiddleware({
        validations: [
          { key: "a", validationOption: "b", isOptional: true },
        ],
      });

      await mw(
        mockContext({}),
        mockNext,
      );
    },
  },
  {
    name: "Success method stringIn",
    async fn() {
      const mw = validatorMiddleware({
        validations: [
          { key: "a", validationOption: validateStringInArray("b") },
        ],
      });

      await mw(
        mockContext({}, JSON.stringify({ a: "b" })),
        mockNext,
      );
    },
  },
  {
    name: "Success method number",
    async fn() {
      const mw = validatorMiddleware({
        validations: [
          { key: "a", validationOption: validateIsNumber() },
        ],
      });

      await mw(
        mockContext({}, JSON.stringify({ a: 2 })),
        mockNext,
      );
    },
  },
  {
    name: "Success method number with min/max",
    async fn() {
      const mw = validatorMiddleware({
        validations: [
          { key: "a", validationOption: validateIsNumber(1, 3) },
        ],
      });

      await mw(
        mockContext({}, JSON.stringify({ a: 2 })),
        mockNext,
      );
    },
  },
  {
    name: "Throws missing url",
    async fn() {
      const mw = validatorMiddleware({
        validations: [
          { key: "a", validationOption: "string", isUrlParam: true },
        ],
      });

      assertThrowsAsync(
        async () => await mw(mockContext({}), mockNext),
        httpErrors.UnprocessableEntity,
        "No value was provided; Key: a;",
      );
    },
  },
  {
    name: "Throws missing body",
    async fn() {
      const mw = validatorMiddleware({
        bodyRequired: true,
        validations: [],
      });

      assertThrowsAsync(
        async () => await mw(mockContext({}), mockNext),
        httpErrors.UnprocessableEntity,
        "No body was provided;",
      );
    },
  },
  {
    name: "Throws custom error",
    async fn() {
      const mw = validatorMiddleware({
        bodyRequired: true,
        validations: [],
        errorMessages: { ERROR_NO_BODY: "Custom error" },
      });

      assertThrowsAsync(
        async () => await mw(mockContext({}), mockNext),
        httpErrors.UnprocessableEntity,
        "Custom error;",
      );
    },
  },
  {
    name: "Throws wrong value",
    async fn() {
      const mw = validatorMiddleware({
        bodyRequired: true,
        validations: [
          { key: "a", validationOption: "c" },
        ],
      });

      assertThrowsAsync(
        async () =>
          await mw(
            mockContext({}, "a=b", "application/x-www-form-urlencoded"),
            mockNext,
          ),
        httpErrors.UnprocessableEntity,
        "Validation failed; Key: a; Value: b; Should Be: c;",
      );
    },
  },
  {
    name: "Throws optional",
    async fn() {
      const mw = validatorMiddleware({
        validations: [
          { key: "a", validationOption: "b", isOptional: true },
        ],
      });

      assertThrowsAsync(
        async () =>
          await mw(
            mockContext({}, "a=c", "application/x-www-form-urlencoded"),
            mockNext,
          ),
        httpErrors.UnprocessableEntity,
        "Validation failed; Key: a; Value: c; Should Be: b;",
      );
    },
  },
  {
    name: "Throws method stringIn",
    async fn() {
      const mw = validatorMiddleware({
        validations: [
          { key: "a", validationOption: validateStringInArray("b") },
        ],
      });

      assertThrowsAsync(
        async () =>
          await mw(
            mockContext({}, JSON.stringify({ a: "c" })),
            mockNext,
          ),
        httpErrors.UnprocessableEntity,
        "Value not in array; Key: a; Value: c; Should Be: [b];",
      );
    },
  },
  {
    name: "Throws method number min",
    async fn() {
      const mw = validatorMiddleware({
        validations: [
          { key: "a", validationOption: validateIsNumber(2) },
        ],
      });

      assertThrowsAsync(
        async () =>
          await mw(
            mockContext({}, JSON.stringify({ a: 1 })),
            mockNext,
          ),
        httpErrors.UnprocessableEntity,
        "Value is smaller than the allowed size; Key: a; Value: 1; Should Be: 2;",
      );
    },
  },
  {
    name: "Throws method number max",
    async fn() {
      const mw = validatorMiddleware({
        validations: [
          { key: "a", validationOption: validateIsNumber(0, 1) },
        ],
      });

      assertThrowsAsync(
        async () =>
          await mw(
            mockContext({}, JSON.stringify({ a: 2 })),
            mockNext,
          ),
        httpErrors.UnprocessableEntity,
        "Value is larger than the allowed size; Key: a; Value: 2; Should Be: 1;",
      );
    },
  },
];

for await (const test of tests) {
  Deno.test(test);
}
