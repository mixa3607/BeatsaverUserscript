import {Constructable, Container, Service} from "typedi";
import {ServiceOptions} from "typedi/types/interfaces/service-options.interface";

export interface ILogger {
  namespace: string;

  clear(): void;

  debug(...data: any[]): void;

  error(...data: any[]): void;

  info(...data: any[]): void;

  trace(...data: any[]): void;

  warn(...data: any[]): void;
}

type LogColor = { LevelBgLevelFgColor: string, LevelFgColor: string, NamespaceBgColor: string };
type LogLevelName = 'debug' | 'error' | 'info' | 'trace' | 'warn';

const LogColors: {
  [key in LogLevelName]: LogColor;
} = {
  debug: {LevelBgLevelFgColor: '#712bde', LevelFgColor: '#fff', NamespaceBgColor: '#8367d3'},
  error: {LevelBgLevelFgColor: '#f05033', LevelFgColor: '#fff', NamespaceBgColor: '#ff1a1a'},
  info: {LevelBgLevelFgColor: '#3174f1', LevelFgColor: '#fff', NamespaceBgColor: '#3291ff'},
  trace: {LevelBgLevelFgColor: '#666', LevelFgColor: '#fff', NamespaceBgColor: '#999'},
  warn: {LevelBgLevelFgColor: '#f5a623', LevelFgColor: '#000', NamespaceBgColor: '#f7b955'},
}

const LogLevelNames: { [key in LogLevelName]: string } = {
  debug: 'DBG',
  error: 'ERR',
  info: 'INF',
  trace: 'TRA',
  warn: 'WRN',
}

export function InjectLogger(namespace: string = null) {
  return function (object: Constructable<unknown>, propertyName: string, index?: number) {
    Container.registerHandler({
      object,
      propertyName,
      index,
      value: containerInstance => {
        const logger = containerInstance.get<ILogger>(Logger);
        logger.namespace = namespace;
        return logger;
      }
    });
  };
}

@Service({transient: true} as ServiceOptions)
export class Logger implements ILogger {
  namespace: string;

  clear(): void {
    console.clear();
  }

  debug(...data: any[]): void {
    this.sendLog("debug", data);
  }

  error(...data: any[]): void {
    this.sendLog("error", data);
  }

  info(...data: any[]): void {
    this.sendLog("info", data);
  }

  trace(...data: any[]): void {
    this.sendLog("trace", data);
  }

  warn(...data: any[]): void {
    this.sendLog("warn", data);
  }

  private sendLog(level: LogLevelName, data: any[]): void {
    const args: string[] = [];

    const colors = LogColors[level];
    const levelName = LogLevelNames[level];

    args.push(`%c ${levelName} `, `background-color:${colors.LevelBgLevelFgColor}; color: ${colors.LevelFgColor}`);
    if (!(this.namespace == null || this.namespace == '')) {
      args[0] += `%c ${this.namespace} `;
      args.push(`background-color:${colors.NamespaceBgColor}`);
    }
    args.push(...data);
    console[level].call(console, ...args);
  }
}
