import { RouterMiddleware, Status, BodyType, FormDataReader } from "../deps.ts";
export type ValidationFn = (
  key: string,
  value: string | Uint8Array | FormDataReader,
  validationError: ValidationErrorFn,
  errorMessages: ErrorMessagesT,
  options: ValidatorMiddlewareOptions,
) => void;

export type ValidationErrorFn = (
  message: string,
  key?: string,
  value?: any,
  shouldBe?: any,
) => never;

export type ValidationT = {
  key: string;
  validationOption: ValidationFn | string;
  isOptional?: boolean;
  isUrlParam?: boolean;
};

export type ValidatorMiddlewareOptions = {
  validations: ValidationT[];
  bodyRequired?: boolean;
  bodyType?: BodyType;
  errorMessages?: Partial<ErrorMessagesT>;
};

export type ErrorKeys =
  | "ERROR_NO_BODY"
  | "ERROR_INVALID_BODY"
  | "ERROR_MISSING_REQUIRED"
  | "ERROR_VALIDATION_FAILED"
  | "ERROR_NOT_IN_ARRAY"
  | "ERROR_NUMBER_MIN"
  | "ERROR_NUMBER_MAX";

export type ErrorMessagesT = Record<ErrorKeys, string>;

export interface JsonT {
  [key: string]: string | undefined; //| JsonT
}

export const errors: ErrorMessagesT = {
  ERROR_NO_BODY: "No body was provided",
  ERROR_INVALID_BODY: "Invalid body type",
  ERROR_MISSING_REQUIRED: "No value was provided",
  ERROR_VALIDATION_FAILED: "Validation failed",
  ERROR_NOT_IN_ARRAY: "Value not in array",
  ERROR_NUMBER_MIN: "Value is smaller than the allowed size",
  ERROR_NUMBER_MAX: "Value is larger than the allowed size",
};

/** Validatior middleware */
export const validatorMiddleware = (options: ValidatorMiddlewareOptions) => {
  Object.assign(errors, options.errorMessages);

  const core: RouterMiddleware = async (ctx, next) => {
    const validateElement = (valEl: ValidationT, element?: string) => {
      if (element) {
        if (typeof valEl.validationOption === "function") {
          valEl.validationOption(
            valEl.key,
            element,
            validationError,
            errors,
            options,
          );
        } else if (
          typeof element !== valEl.validationOption &&
          element !== valEl.validationOption
        ) {
          validationError(
            errors.ERROR_VALIDATION_FAILED,
            valEl.key,
            element,
            valEl.validationOption,
          );
        }
      } else {
        if (!valEl.isOptional) {
          validationError(errors.ERROR_MISSING_REQUIRED, valEl.key);
        }
      }
    };

    const validateBody = async (valEl: ValidationT) => {
      const validateForm = (body: URLSearchParams) => {
        if (body.has(valEl.key)) {
          const values = body.getAll(valEl.key);
          values.forEach((el) => {
            validateElement(valEl, el);
          });
        } else if (!valEl.isOptional) {
          validationError(errors.ERROR_MISSING_REQUIRED, valEl.key);
        }
      };

      const validateJson = (body: JsonT) => {
        const value = body[valEl.key];

        validateElement(valEl, value);
      };

      const body = ctx.request.body();
      console.log;
      switch (body.type) {
        case "form":
          validateForm(await body.value);
          break;
        case "json":
          validateJson(await body.value);
          break;
        default:
          if (!body.value && options.bodyRequired) {
            validationError(errors.ERROR_NO_BODY);
          } else if (
            typeof valEl.validationOption === "function" && body.value
          ) {
            valEl.validationOption(
              valEl.key,
              await body.value,
              validationError,
              errors,
              options,
            );
          }
      }
    };

    const validationError: ValidationErrorFn = (
      message,
      key,
      value,
      shouldBe,
    ) =>
      ctx.throw(
        Status.UnprocessableEntity,
        message +
          `;${key ? ` Key: ${key};` : ""}${value ? ` Value: ${value};` : ""}${
            shouldBe ? ` Should Be: ${shouldBe};` : ""
          }`,
      );

    if (options.bodyRequired && !ctx.request.hasBody) {
      validationError(errors.ERROR_NO_BODY);
    }

    const body = await ctx.request.body();

    if (
      ctx.request.hasBody && options.bodyType && body.type !== options.bodyType
    ) {
      validationError(
        errors.ERROR_INVALID_BODY,
        undefined,
        body.type,
        options.bodyType,
      );
    }

    for await (const valEl of options.validations) {
      if (valEl.isUrlParam) {
        validateElement(valEl, ctx.params[valEl.key]);
      } else {
        await validateBody(valEl);
      }
    }

    await next();
  };

  return core;
};

export default { validatorMiddleware };
