import {Service} from "typedi";
import {ILogger, InjectLogger} from "@/logger/logger";

class XhrEventSub<K extends keyof XMLHttpRequestEventMap> {
  type: K;
  listener: (this: XMLHttpRequest, ev: XMLHttpRequestEventMap[K]) => any;
  options?: boolean | AddEventListenerOptions;
  origListener: (req: XMLHttpRequest, ev: XMLHttpRequestEventMap[K]) => any;
}

@Service()
export class XhrHooker {
  private subs: XhrEventSub<any>[] = [];

  constructor(@InjectLogger('XHR') public logger: ILogger) {
  }

  public init(): void {
    const origOpen = XMLHttpRequest.prototype.open;
    const subs = this.subs;
    XMLHttpRequest.prototype.open = function (...args: any[]) {
      for (const sub of subs) {
        this.addEventListener(sub.type, sub.listener, sub.options);
      }
      origOpen.apply(this, args);
    };
    this.logger.info('Initialized');
  }

  public addEventListener<K extends keyof XMLHttpRequestEventMap>(type: K, listener: (req: XMLHttpRequest, ev: XMLHttpRequestEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void {
    this.subs.push({
      type, options,
      listener: function (ev: XMLHttpRequestEventMap[K]) {
        return listener(this, ev);
      },
      origListener: listener
    });
  }

  public removeEventListener(type: string, listener: (req: XMLHttpRequest, ev: Event) => any): void {
    this.subs = this.subs.filter(x => !(x.type === type && x.origListener === listener));
  }
}
