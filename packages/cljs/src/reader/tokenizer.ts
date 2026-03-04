// Tokenizer — Converts Clojure source text into a stream of tokens.
//
// Design:
//   - Stateful iterator: call next() repeatedly to get tokens
//   - Token stores text slice of original source
//   - Tracks line/column (1-indexed) for error reporting
//   - Comma is whitespace (Clojure convention)
//   - Escape processing deferred to Reader stage

export type TokenKind =
  | 'lparen' | 'rparen'
  | 'lbracket' | 'rbracket'
  | 'lbrace' | 'rbrace'
  | 'quote'
  | 'backtick'
  | 'tilde'
  | 'tilde_at'
  | 'caret'
  | 'at'
  | 'hash'
  | 'hash_lparen'
  | 'hash_lbrace'
  | 'hash_quote'
  | 'hash_underscore'
  | 'hash_question'
  | 'hash_question_at'
  | 'hash_colon'
  | 'hash_hash'
  | 'integer' | 'float' | 'ratio'
  | 'string' | 'char'
  | 'symbol' | 'keyword'
  | 'regex'
  | 'eof'
  | 'invalid';

export type Token = {
  kind: TokenKind;
  text: string;
  line: number;
  col: number;
};

export class Tokenizer {
  private source: string;
  private pos = 0;
  private line = 1;
  private col = 1;

  constructor(source: string) {
    this.source = source;
  }

  /** Peek at char at current pos (or pos+offset). Returns '' at EOF. */
  private ch(offset = 0): string {
    return this.source.charAt(this.pos + offset);
  }

  private atEnd(offset = 0): boolean {
    return this.pos + offset >= this.source.length;
  }

  next(): Token {
    this.skipWhitespace();

    if (this.atEnd()) {
      return this.makeToken('eof', '', this.line, this.col);
    }

    const startLine = this.line;
    const startCol = this.col;
    const c = this.ch();

    switch (c) {
      case '(': return this.singleChar('lparen', startLine, startCol);
      case ')': return this.singleChar('rparen', startLine, startCol);
      case '[': return this.singleChar('lbracket', startLine, startCol);
      case ']': return this.singleChar('rbracket', startLine, startCol);
      case '{': return this.singleChar('lbrace', startLine, startCol);
      case '}': return this.singleChar('rbrace', startLine, startCol);
      case '\'': return this.singleChar('quote', startLine, startCol);
      case '`': return this.singleChar('backtick', startLine, startCol);
      case '^': return this.singleChar('caret', startLine, startCol);
      case '@': return this.singleChar('at', startLine, startCol);
      case '~': return this.readTilde(startLine, startCol);
      case '"': return this.readString(startLine, startCol);
      case ':': return this.readKeyword(startLine, startCol);
      case '\\': return this.readCharacter(startLine, startCol);
      case '#': return this.readDispatch(startLine, startCol);
      case '+': case '-':
        if (!this.atEnd(1) && isDigit(this.ch(1))) {
          return this.readNumber(startLine, startCol);
        }
        return this.readSymbol(startLine, startCol);
      default:
        if (isDigit(c)) return this.readNumber(startLine, startCol);
        return this.readSymbol(startLine, startCol);
    }
  }

  private singleChar(kind: TokenKind, line: number, col: number): Token {
    const text = this.ch();
    this.advance();
    return this.makeToken(kind, text, line, col);
  }

  private readTilde(line: number, col: number): Token {
    this.advance(); // ~
    if (!this.atEnd() && this.ch() === '@') {
      this.advance(); // @
      return this.makeToken('tilde_at', '~@', line, col);
    }
    return this.makeToken('tilde', '~', line, col);
  }

  private readString(line: number, col: number): Token {
    const start = this.pos;
    this.advance(); // opening "

    while (!this.atEnd()) {
      const c = this.ch();
      if (c === '"') {
        this.advance(); // closing "
        return this.makeToken('string', this.source.slice(start, this.pos), line, col);
      } else if (c === '\\') {
        this.advance(); // backslash
        if (!this.atEnd()) this.advance(); // escaped char
      } else {
        this.advance();
      }
    }

    return this.makeToken('invalid', this.source.slice(start, this.pos), line, col);
  }

  private readKeyword(line: number, col: number): Token {
    const start = this.pos;
    this.advance(); // :

    // :: auto-resolved
    if (!this.atEnd() && this.ch() === ':') {
      this.advance();
    }

    // Read name
    while (!this.atEnd() && isSymbolChar(this.ch())) {
      this.advance();
    }

    const text = this.source.slice(start, this.pos);
    if (text === ':' || text === '::') {
      return this.makeToken('invalid', text, line, col);
    }

    return this.makeToken('keyword', text, line, col);
  }

  private readCharacter(line: number, col: number): Token {
    const start = this.pos;
    this.advance(); // backslash

    if (this.atEnd()) {
      return this.makeToken('invalid', '\\', line, col);
    }

    // Read at least one character
    this.advance();

    // Continue for named characters (newline, space, u1234, etc.)
    while (!this.atEnd() && !isTerminator(this.ch())) {
      this.advance();
    }

    return this.makeToken('char', this.source.slice(start, this.pos), line, col);
  }

  private readDispatch(line: number, col: number): Token {
    const start = this.pos;
    this.advance(); // #

    if (this.atEnd()) {
      return this.makeToken('invalid', '#', line, col);
    }

    const c = this.ch();
    switch (c) {
      case '(': this.advance(); return this.makeToken('hash_lparen', '#(', line, col);
      case '{': this.advance(); return this.makeToken('hash_lbrace', '#{', line, col);
      case '\'': this.advance(); return this.makeToken('hash_quote', "#'", line, col);
      case '_': this.advance(); return this.makeToken('hash_underscore', '#_', line, col);
      case '#': this.advance(); return this.makeToken('hash_hash', '##', line, col);
      case '"': return this.readRegex(start, line, col);
      case '?': return this.readReaderCond(line, col);
      case ':': return this.readNsMap(start, line, col);
      case '!': return this.readShebang();
      default:
        return this.makeToken('hash', '#', line, col);
    }
  }

  private readRegex(start: number, line: number, col: number): Token {
    this.advance(); // opening "

    while (!this.atEnd()) {
      const c = this.ch();
      if (c === '"') {
        this.advance(); // closing "
        return this.makeToken('regex', this.source.slice(start, this.pos), line, col);
      } else if (c === '\\') {
        this.advance();
        if (!this.atEnd()) this.advance();
      } else {
        this.advance();
      }
    }

    return this.makeToken('invalid', this.source.slice(start, this.pos), line, col);
  }

  private readReaderCond(line: number, col: number): Token {
    this.advance(); // ?
    if (!this.atEnd() && this.ch() === '@') {
      this.advance(); // @
      return this.makeToken('hash_question_at', '#?@', line, col);
    }
    return this.makeToken('hash_question', '#?', line, col);
  }

  private readNsMap(start: number, line: number, col: number): Token {
    this.advance(); // first :
    if (!this.atEnd() && this.ch() === ':') {
      this.advance();
    }
    while (!this.atEnd() && isSymbolChar(this.ch())) {
      this.advance();
    }
    return this.makeToken('hash_colon', this.source.slice(start, this.pos), line, col);
  }

  private readShebang(): Token {
    while (!this.atEnd() && this.ch() !== '\n') {
      this.advance();
    }
    return this.next();
  }

  private readNumber(line: number, col: number): Token {
    const start = this.pos;

    // Optional sign
    if (!this.atEnd() && (this.ch() === '+' || this.ch() === '-')) {
      this.advance();
    }

    let hasDot = false;
    let hasExp = false;
    let hasRatio = false;

    // Hex: 0x...
    if (!this.atEnd() && this.ch() === '0' && !this.atEnd(1) && (this.ch(1) === 'x' || this.ch(1) === 'X')) {
      this.advance(); // 0
      this.advance(); // x
      while (!this.atEnd() && isHexDigit(this.ch())) {
        this.advance();
      }
    } else {
      // Integer digits
      while (!this.atEnd() && isDigit(this.ch())) {
        this.advance();
      }

      // Radix: NNrXXX
      if (!this.atEnd() && (this.ch() === 'r' || this.ch() === 'R')) {
        this.advance();
        while (!this.atEnd() && isRadixDigit(this.ch())) {
          this.advance();
        }
      } else {
        // Ratio: N/N
        if (!this.atEnd() && this.ch() === '/' && !this.atEnd(1) && isDigit(this.ch(1))) {
          hasRatio = true;
          this.advance(); // /
          while (!this.atEnd() && isDigit(this.ch())) {
            this.advance();
          }
        }

        // Decimal part
        if (!hasRatio && !this.atEnd() && this.ch() === '.') {
          hasDot = true;
          this.advance();
          while (!this.atEnd() && isDigit(this.ch())) {
            this.advance();
          }
        }

        // Exponent
        if (!hasRatio && !this.atEnd() && (this.ch() === 'e' || this.ch() === 'E')) {
          hasExp = true;
          this.advance();
          if (!this.atEnd() && (this.ch() === '+' || this.ch() === '-')) {
            this.advance();
          }
          while (!this.atEnd() && isDigit(this.ch())) {
            this.advance();
          }
        }
      }
    }

    // Suffix N or M
    if (!this.atEnd() && (this.ch() === 'N' || this.ch() === 'M')) {
      this.advance();
    }

    const text = this.source.slice(start, this.pos);
    const kind: TokenKind = hasRatio ? 'ratio' : (hasDot || hasExp) ? 'float' : 'integer';
    return this.makeToken(kind, text, line, col);
  }

  private readSymbol(line: number, col: number): Token {
    const start = this.pos;
    while (!this.atEnd() && isSymbolChar(this.ch())) {
      this.advance();
    }
    const text = this.source.slice(start, this.pos);
    return this.makeToken('symbol', text, line, col);
  }

  private skipWhitespace(): void {
    while (!this.atEnd()) {
      if (isWhitespace(this.ch())) {
        this.advance();
      } else if (this.ch() === ';') {
        while (!this.atEnd() && this.ch() !== '\n') {
          this.advance();
        }
      } else {
        break;
      }
    }
  }

  private advance(): void {
    if (!this.atEnd()) {
      if (this.source.charAt(this.pos) === '\n') {
        this.line++;
        this.col = 1;
      } else {
        this.col++;
      }
      this.pos++;
    }
  }

  private makeToken(kind: TokenKind, text: string, line: number, col: number): Token {
    return { kind, text, line, col };
  }
}

// -- Character classification --

function isDigit(c: string): boolean {
  return c >= '0' && c <= '9';
}

function isHexDigit(c: string): boolean {
  return isDigit(c) || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F');
}

function isRadixDigit(c: string): boolean {
  return isDigit(c) || (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
}

function isWhitespace(c: string): boolean {
  return c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f' || c === ',';
}

function isTerminator(c: string): boolean {
  return isWhitespace(c) || c === '"' || c === ';' || c === '@' || c === '^' ||
    c === '`' || c === '~' || c === '(' || c === ')' || c === '[' || c === ']' ||
    c === '{' || c === '}' || c === '\\';
}

function isSymbolChar(c: string): boolean {
  return !isTerminator(c);
}
