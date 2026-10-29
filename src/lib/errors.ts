/** An error with an HTTP status and a message that is safe to show to the client. */
export class HttpError extends Error {
  readonly status: number;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(status: number, message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  static badRequest(message: string, fieldErrors?: Record<string, string[]>) {
    return new HttpError(400, message, fieldErrors);
  }
  static unauthorized(message = "You must be signed in.") {
    return new HttpError(401, message);
  }
  static forbidden(message = "You do not have permission to do this.") {
    return new HttpError(403, message);
  }
  static notFound(message = "Not found.") {
    return new HttpError(404, message);
  }
  static conflict(message: string) {
    return new HttpError(409, message);
  }
}
