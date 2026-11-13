/**
 * Custom application & domain rule error class.
 * When a rule (R1-R9) is violated, use AppError.ruleViolation(ruleId, message, details).
 */
export class AppError extends Error {
  constructor(
    message,
    statusCode = 400,
    errorCode = 'BAD_REQUEST',
    ruleViolated = null,
    details = null
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.ruleViolated = ruleViolated;
    this.details = details;
  }

  /**
   * @param {'R1'|'R2'|'R3'|'R4'|'R5'|'R6'|'R7'|'R8'|'R9'} ruleId
   * @param {string} message
   * @param {Record<string, any>} [details]
   */
  static ruleViolation(ruleId, message, details = null) {
    return new AppError(
      `[Rule ${ruleId} Violated] ${message}`,
      422,
      `RULE_${ruleId}_VIOLATION`,
      ruleId,
      details
    );
  }
}

