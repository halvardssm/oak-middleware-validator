import { ValidationFn, ErrorMessagesT } from "./validatorMiddleware.ts";
const decoder = new TextDecoder();

/** Validates if a string is in the array */
export const validateStringInArray = (...values: string[]): ValidationFn => {
  return (key, value, throws, errorMessages: ErrorMessagesT) => {
    if (Array.isArray(value)) value = decoder.decode(value as Uint8Array);

    if (!values.includes(value as string)) {
      throws(errorMessages.ERROR_NOT_IN_ARRAY, key, value, `[${values}]`);
    }
  };
};

/** Validates if if the value is a number.
 * If min/max is given it compares them inclusively 
 */
export const validateIsNumber = (
  min?: number,
  max?: number,
  radix?: number,
): ValidationFn => {
  return (key, value, throws, errorMessages: ErrorMessagesT) => {
    if (Array.isArray(value)) value = decoder.decode(value as Uint8Array);

    const parsedVal = parseInt(value as string, radix);

    if (!parsedVal) {
      throws(errorMessages.ERROR_VALIDATION_FAILED, key, parsedVal, "number");
    }
    if (min && min > parsedVal) {
      throws(errorMessages.ERROR_NUMBER_MIN, key, parsedVal, min);
    }
    if (max && max < parsedVal) {
      throws(errorMessages.ERROR_NUMBER_MAX, key, parsedVal, max);
    }
  };
};
