/**
 * Default logger implementation (console-based)
 */
export class ConsoleLogger {
  log(message: string): void {
    console.log(message)
  }

  error(message: string): void {
    console.error(message)
  }

  warn(message: string): void {
    console.warn(message)
  }

  debug(message: string): void {
    console.debug(message)
  }
}
