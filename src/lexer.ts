import { createWriteStream, readFileSync } from "fs";
import { Cursor } from "./cursor";
import { Token, TokenType } from "./token";

const MAX_IDENTIFIER_LENGTH = 16;

export class Lexer {
  private line = 1;
  private cursor: Cursor<string>;

  constructor() {
    this.cursor = new Cursor(Lexer.readSource());
  }

  public tokenize() {
    let success = true;

    const writeTokenStream = createWriteStream("output/source.dyd");
    const writeErrorStream = createWriteStream("output/source.err");

    while (this.cursor.isOpen()) {
      try {
        const token = this.getNextToken();
        writeTokenStream.write(Lexer.formatToken(token));
      } catch (error) {
        writeErrorStream.write(Lexer.formatError(error));
        success = false;
      }
    }

    const endOfFileToken = { type: TokenType.END_OF_FILE, value: "EOF" };
    writeTokenStream.write(Lexer.formatToken(endOfFileToken));

    writeTokenStream.close();
    writeErrorStream.close();

    return success;
  }

  private getNextToken(): Token {
    while (this.cursor.current === " ") {
      this.cursor.consume();
    }

    const initial = this.cursor.consume();

    if (Lexer.isLetter(initial)) {
      let value = initial;
      while (
        Lexer.isLetter(this.cursor.current) ||
        Lexer.isDigit(this.cursor.current)
      ) {
        value += this.cursor.consume();
      }

      const keywordType = Lexer.getKeywordType(value);
      if (keywordType !== undefined) {
        return { type: keywordType, value };
      }

      if (value.length <= MAX_IDENTIFIER_LENGTH) {
        return { type: TokenType.IDENTIFIER, value };
      }

      throw new Error(
        `Line ${this.line}: Identifier name '${value}' exceeds ${MAX_IDENTIFIER_LENGTH} characters`
      );
    }

    if (Lexer.isDigit(initial)) {
      let value = initial;
      while (Lexer.isDigit(this.cursor.current)) {
        value += this.cursor.consume();
      }
      return { type: TokenType.CONSTANT, value };
    }

    if (initial === "=") {
      return { type: TokenType.EQUAL, value: "=" };
    }

    if (initial === "-") {
      return { type: TokenType.SUBTRACT, value: "-" };
    }

    if (initial === "*") {
      return { type: TokenType.MULTIPLY, value: "*" };
    }

    if (initial === "(") {
      return { type: TokenType.LEFT_PARENTHESES, value: "(" };
    }

    if (initial === ")") {
      return { type: TokenType.RIGHT_PARENTHESES, value: ")" };
    }

    if (initial === "<") {
      if (this.cursor.current === "=") {
        this.cursor.consume();
        return { type: TokenType.LESS_THAN_OR_EQUAL, value: "<=" };
      }

      if (this.cursor.current === ">") {
        this.cursor.consume();
        return { type: TokenType.NOT_EQUAL, value: "<>" };
      }

      return { type: TokenType.LESS_THAN, value: "<" };
    }

    if (initial === ">") {
      if (this.cursor.current === "=") {
        this.cursor.consume();
        return { type: TokenType.GREATER_THAN_OR_EQUAL, value: ">=" };
      }

      return { type: TokenType.GREATER_THAN, value: ">" };
    }

    if (initial === ":") {
      if (this.cursor.current === "=") {
        this.cursor.consume();
        return { type: TokenType.ASSIGN, value: ":=" };
      }

      throw new Error(`Line ${this.line}: Misused colon`);
    }

    if (initial === ";") {
      return { type: TokenType.SEMICOLON, value: ";" };
    }

    if (initial === "\n") {
      this.line++;
      return { type: TokenType.END_OF_LINE, value: "EOLN" };
    }

    throw new Error(`Line ${this.line}: Invalid character '${initial}'`);
  }

  private static isLetter(value: string) {
    return /^[a-z]$/i.test(value);
  }

  private static isDigit(value: string) {
    return /^\d$/.test(value);
  }

  private static getKeywordType(value: string) {
    switch (value.toLowerCase()) {
      case "begin":
        return TokenType.BEGIN;
      case "end":
        return TokenType.END;
      case "integer":
        return TokenType.INTEGER;
      case "if":
        return TokenType.IF;
      case "then":
        return TokenType.THEN;
      case "else":
        return TokenType.ELSE;
      case "function":
        return TokenType.FUNCTION;
      case "read":
        return TokenType.READ;
      case "write":
        return TokenType.WRITE;
      default:
        return undefined;
    }
  }

  private static readSource() {
    return readFileSync("input/source.pas").toString().trim().split("");
  }

  private static formatToken(token: Token) {
    const value = token.value.padStart(16);
    const type = token.type.toString().padStart(2, "0");
    return `${value} ${type}\n`;
  }

  private static formatError(error: unknown) {
    if (error instanceof Error) {
      return `${error.message}\n`;
    }

    throw error;
  }
}
