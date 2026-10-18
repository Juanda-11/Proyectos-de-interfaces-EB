export class AIError extends Error {
  constructor(message, { cause } = {}) {
    super(message, { cause })
    this.name = 'AIError'
  }
}
