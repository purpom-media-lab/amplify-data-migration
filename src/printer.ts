export interface Printer {
  log(message: string): void;
}

class ConsolePrinter implements Printer {
  log(message: string): void {
    console.log(message);
  }
}

export const printer: Printer = new ConsolePrinter();
