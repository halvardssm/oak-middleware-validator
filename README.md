# Oak Middleware Validator

![CI](https://github.com/halvardssm/oak-middleware-validator/workflows/CI/badge.svg)
[![(Deno)](https://img.shields.io/badge/deno-1.0.3-green.svg)](https://deno.land)
[![deno doc](https://doc.deno.land/badge.svg)](https://doc.deno.land/https/raw.githubusercontent.com/halvardssm/oak-middleware-validator/master/mod.ts)

Oak middleware for parameter and body validator

## Usage

* As a router middleware

  ```ts
  import { sanitizerMiddleware, validatorMiddlewareOptions } from "https://raw.githubusercontent.com/halvardssm/oak-middleware-validator/master/mod.ts"
  import { RouterMiddleware } from "https://deno.land/x/oak/mod.ts";
  
  const router = new Router();
  
  const app = new Application();

  const options: validatorMiddlewareOptions = {
    validations: [
      { key: "a", validationOption: "string", isUrlParam: true },
      { key: "b", validationOption: "b", isOptional: true },
      { key: "c", validationOption: validateStringIn("b") },
      { key: "d", validationOption: validateIsNumber(0, 1) },
    ],
    bodyRequired: true,
    errorMessages: {
      ERROR_NO_BODY: "Custom message"
    }
  }
  
  router
    .get("/bar", validatorMiddleware(options),...)
  
  app.use(router.routes());
  
  await app.listen(appOptions);
  ```

## Options

* validations: validationT[]; // Array of validations
* bodyRequired?: boolean; // If true, will return error if body is empty
* errorMessages?: Partial<errorMessagesT>; // Customize your own error messages

### validationT

* key: string; // The key
* validationOption: validationFn | string; // The validation function, also accepts a `typeof` or a string to compare strings
* isOptional?: boolean; // Will allow the key to be missing
* isUrlParam?: boolean; // Will check the url instead of the body

### errorMessagesT

* ERROR_NO_BODY: "No body was provided",
* ERROR_MISSING_REQUIRED: "No value was provided",
* ERROR_VALIDATION_FAILED: "Validation failed",
* ERROR_NOT_IN_ARRAY: "Value not in array",
* ERROR_NUMBER_MIN: "Value is smaller than the allowed size",
* ERROR_NUMBER_MAX: "Value is larger than the allowed size"

### validationFn

``` ts
(
  key: string, // The key
  value: string | Uint8Array, // The value
  validationError: validationErrorFn, // The validation error callback
  errorMessages: errorMessagesT, // Exposes the error messages
  options: validatorMiddlewareOptions // Exposes the options
) => void
```

## Available validation methods

* `validateStringInArray(...values: string[])` // Checks if the value is in the array
* `validateIsNumber(min?: number, max?: number, radix?: number)` // Checks if the value is a number, and if min/max is given it compares them inclusively

## Contributing

All contributions are welcome, make sure to read the [contributing guidelines](./.github/CONTRIBUTING.md).

## Uses

* [Oak](https://deno.land/x/oak/)
