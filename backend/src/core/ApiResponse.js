/**
 * Standardized JSON response wrapper used by every endpoint
 * so the frontend always receives a predictable shape.
 */
export class ApiResponse {
  constructor(success, code, message, data = null, error = null) {
    this.success = success;
    this.code = code;
    this.message = message;
    this.data = data;
    this.error = error;
    this.meta = { timestamp: new Date().toISOString() };
  }

  static ok(data, message = 'Success', code = 'OK') {
    return new ApiResponse(true, code, message, data, null);
  }

  static fail(message, code = 'BAD_REQUEST', ruleViolated = null, details = null) {
    return new ApiResponse(false, code, message, null, {
      ruleViolated,
      details,
    });
  }
}

