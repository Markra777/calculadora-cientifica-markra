// src/app/app.ts
import { Component, signal, computed, effect, OnInit, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

interface Button {
  label: string;
  action: string;
  class: string;
  colspan?: number;
  rowspan?: number;
  tooltip?: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  // === SIGNALS ===
  display = signal('0');
  previousValue = signal<number | null>(null);
  operator = signal<string | null>(null);
  waitingForNewValue = signal(false);
  history = signal<string[]>([]);
  isDark = signal(true);
  isDegrees = signal(true);

  // === COMPUTED ===
  currentExpression = computed(() => {
    const prev = this.previousValue();
    const op = this.operator();
    const curr = this.display();
    if (prev !== null && op) return `${prev} ${op} ${curr}`;
    return curr;
  });

  // === BOTONES ===
  buttonLayout: Button[][] = [
    [
      { label: 'C', action: 'clear', class: 'func', tooltip: 'Limpiar' },
      { label: '±', action: 'toggleSign', class: 'func' },
      { label: '%', action: 'percent', class: 'func' },
      { label: '÷', action: '/', class: 'op' }
    ],
    [
      { label: 'sin', action: 'sin', class: 'sci' },
      { label: 'cos', action: 'cos', class: 'sci' },
      { label: 'tan', action: 'tan', class: 'sci' },
      { label: '×', action: '*', class: 'op' }
    ],
    [
      { label: 'log', action: 'log', class: 'sci' },
      { label: '√', action: 'sqrt', class: 'sci' },
      { label: 'x²', action: 'square', class: 'sci' },
      { label: '−', action: '-', class: 'op' }
    ],
    [
      { label: 'n!', action: 'fact', class: 'sci' },
      { label: '7', action: '7', class: 'num' },
      { label: '8', action: '8', class: 'num' },
      { label: '9', action: '9', class: 'num' }
    ],
    [
      { label: 'π', action: 'pi', class: 'sci' },
      { label: '4', action: '4', class: 'num' },
      { label: '5', action: '5', class: 'num' },
      { label: '6', action: '6', class: 'num' }
    ],
    [
      { label: 'e', action: 'e', class: 'sci' },
      { label: '1', action: '1', class: 'num' },
      { label: '2', action: '2', class: 'num' },
      { label: '3', action: '3', class: 'num' }
    ],
    [
      { label: 'Rad', action: 'toggleMode', class: 'func' },
      { label: '0', action: '0', class: 'num zero', colspan: 2 },
      { label: '.', action: '.', class: 'num' },
      { label: '=', action: 'equals', class: 'equals', rowspan: 2 }
    ]
  ];

  constructor(@Inject(PLATFORM_ID) private platformId: Object) { }

  /*ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem('calc-theme');
      if (saved !== null) {
        this.isDark.set(saved === 'dark');
      } else {
        this.isDark.set(window.matchMedia('(prefers-color-scheme: dark)').matches);
      }

      effect(() => {
        localStorage.setItem('calc-theme', this.isDark() ? 'dark' : 'light');
        document.body.classList.toggle('dark', this.isDark());
      });

      window.addEventListener('keydown', this.handleKey.bind(this));
    }
  }*/

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem('calc-theme');
      let shouldBeDark = true;

      if (saved !== null) {
        shouldBeDark = saved === 'dark';
      } else {
        shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }

      // APLICA EL TEMA INMEDIATAMENTE AL BODY
      document.body.classList.toggle('dark', shouldBeDark);

      // SETEA EL SIGNAL (dispara effect para cambios futuros)
      this.isDark.set(shouldBeDark);

      // EFFECT PARA CAMBIOS FUTUROS
      effect(() => {
        const isDark = this.isDark();
        localStorage.setItem('calc-theme', isDark ? 'dark' : 'light');
        document.body.classList.toggle('dark', isDark);
      });

      window.addEventListener('keydown', this.handleKey.bind(this));
    }
  }

  toggleTheme() {
    this.isDark.set(!this.isDark());
  }

  handleKey(e: KeyboardEvent) {
    const map: Record<string, Button> = {
      'Enter': { label: '=', action: 'equals', class: 'equals' },
      'Escape': { label: 'C', action: 'clear', class: 'func' },
      '+': { label: '+', action: '+', class: 'op' },
      '-': { label: '−', action: '-', class: 'op' },
      '*': { label: '×', action: '*', class: 'op' },
      '/': { label: '÷', action: '/', class: 'op' },
      '.': { label: '.', action: '.', class: 'num' }
    };

    const key = e.key;
    if (map[key]) {
      e.preventDefault();
      this.handleClick(map[key]);
    } else if (/[0-9]/.test(key)) {
      e.preventDefault();
      this.appendValue(key);
    }
  }

  handleClick(btn: Button) {
    const a = btn.action;
    if (a === 'clear') this.clear();
    else if (a === 'equals') this.equals();
    else if (a === 'toggleMode') this.isDegrees.update(v => !v);
    else if (a === 'toggleSign') this.display.update(v => String(-parseFloat(v || '0')));
    else if (a === 'percent') this.display.update(v => String(parseFloat(v || '0') / 100));
    else if (['+', '-', '*', '/'].includes(a)) this.setOperator(a);
    else if (['sin', 'cos', 'tan', 'log', 'sqrt', 'fact', 'pi', 'e', 'square'].includes(a)) {
      this.calculateScientific(a);
    } else {
      this.appendValue(a);
    }
  }

  appendValue(value: string) {
    if (this.waitingForNewValue()) {
      this.display.set(value === '.' ? '0.' : value);
      this.waitingForNewValue.set(false);
    } else {
      this.display.update(prev => {
        if (prev === '0' && value !== '.') return value;
        if (value === '.' && prev.includes('.')) return prev;
        return prev + value;
      });
    }
  }

  setOperator(op: string) {
    const current = parseFloat(this.display());
    if (this.previousValue() === null) {
      this.previousValue.set(current);
    } else if (this.operator()) {
      const result = this.calculate(this.previousValue()!, current, this.operator()!);
      this.display.set(this.format(result));
      this.previousValue.set(result);
      this.history.update(h => [...h, `${this.previousValue()} ${this.operator()} ${current} = ${result}`]);
    }
    this.waitingForNewValue.set(true);
    this.operator.set(op);
  }

  calculate(a: number, b: number, op: string): number {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b !== 0 ? a / b : 0;
      default: return b;
    }
  }

  calculateScientific(func: string) {
    const value = parseFloat(this.display());
    let result = 0;
    const rad = this.isDegrees() ? value * Math.PI / 180 : value;

    switch (func) {
      case 'sin': result = Math.sin(rad); break;
      case 'cos': result = Math.cos(rad); break;
      case 'tan': result = Math.tan(rad); break;
      case 'log': result = Math.log10(value); break;
      case 'sqrt': result = Math.sqrt(value); break;
      case 'fact': result = this.factorial(Math.floor(value)); break;
      case 'pi': result = Math.PI; break;
      case 'e': result = Math.E; break;
      case 'square': result = value * value; break;
    }

    this.display.set(this.format(result));
    this.history.update(h => [...h, `${func}(${value}) = ${result}`]);
    this.resetAfterScientific();
  }

  factorial(n: number): number {
    if (n < 0) return 0;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  format(num: number): string {
    if (!isFinite(num)) return 'Error';
    return num % 1 === 0 ? num.toString() : num.toFixed(8).replace(/\.?0+$/, '');
  }

  clear() {
    this.display.set('0');
    this.previousValue.set(null);
    this.operator.set(null);
    this.waitingForNewValue.set(false);
  }

  equals() {
    if (this.operator() && this.previousValue() !== null) {
      const current = parseFloat(this.display());
      const result = this.calculate(this.previousValue()!, current, this.operator()!);
      this.display.set(this.format(result));
      this.history.update(h => [...h, `${this.previousValue()} ${this.operator()} ${current} = ${result}`]);
      this.resetAfterScientific();
    }
  }

  private resetAfterScientific() {
    this.previousValue.set(null);
    this.operator.set(null);
    this.waitingForNewValue.set(true);
  }
}
