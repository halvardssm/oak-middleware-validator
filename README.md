# Oak Middleware Validator

[![GitHub Workflow Status (branch)](https://img.shields.io/github/workflow/status/halvardssm/oak-middleware-validator/CI/master?style=flat-square&logo=github)](https://github.com/halvardssm/oak-middleware-validator/actions?query=branch%3Amaster+workflow%3ACI)
[![(Deno)](https://img.shields.io/badge/deno-v1.2.0-green.svg?style=flat-square&logo=deno)](https://deno.land)
[![(Oak)](https://img.shields.io/badge/oak-v6.0.1-orange.svg?style=flat-square&logo=deno)](https://github.com/oakserver/oak)
[![deno doc](https://img.shields.io/badge/deno-doc-blue.svg?style=flat-square&logo=deno)](https://doc.deno.land/https/raw.githubusercontent.com/halvardssm/oak-middleware-validator/master/mod.ts)

Oak middleware for parameter and body validator

## Usage

* As a router middleware

  ```ts
  import { validatorMiddleware, ValidatorMiddlewareOptions } from "https://raw.githubusercontent.com/halvardssm/oak-middleware-validator/master/mod.ts"
  import { RouterMiddleware } from "https://deno.land/x/oak/mod.ts";
  
  const router = new Router();
  
  const app = new Application();

  const options: ValidatorMiddlewareOptions = {
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

* validations: ValidationT[]; // Array of validations
* bodyRequired?: boolean; // If true, will return error if body is empty
* bodyType?: BodyType; // Will validate the body against a provided body type
* errorMessages?: Partial<ErrorMessagesT>; // Customize your own error messages

### validationT

* key: string; // The key
* validationOption: ValidationFn | string; // The validation function, also accepts a `typeof` or a string to compare strings
* isOptional?: boolean; // Will allow the key to be missing
* isUrlParam?: boolean; // Will check the url instead of the body

### errorMessagesT

* ERROR_NO_BODY: "No body was provided",
* ERROR_INVALID_BODY: "Invalid body type",
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
  validationError: ValidationErrorFn, // The validation error callback
  errorMessages: ErrorMessagesT, // Exposes the error messages
  options: ValidatorMiddlewareOptions // Exposes the options
) => void
```

## Available validation methods

* `validateStringInArray(...values: string[])` // Checks if the value is in the array
* `validateIsNumber(min?: number, max?: number, radix?: number)` // Checks if the value is a number, and if min/max is given it compares them inclusively

## Contributing

All contributions are welcome, make sure to read the [contributing guidelines](./.github/CONTRIBUTING.md).

## Uses

* [Oak](https://deno.land/x/oak/)
