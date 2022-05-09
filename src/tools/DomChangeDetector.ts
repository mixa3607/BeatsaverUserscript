import {Subject} from "rxjs";
import {Service} from "typedi";
import {ILogger, InjectLogger} from "@/logger/logger";

@Service()
export class DomChangeDetector {
  public mutations$ = new Subject<MutationRecord>();
  private observer: MutationObserver;

  constructor(@InjectLogger('DCD') private logger: ILogger) {
    //this.mutations$.subscribe(x => logger.info(x));
  }

  public init(): void {
    this.observer = new MutationObserver((mutations, observer) => this.onMutate(mutations, observer));
    this.observer.observe(document, {subtree: true, childList: true});
    this.logger.info('Initialized');
  }

  private onMutate(mutations: MutationRecord[], observer: MutationObserver): void {
    for (const mutation of mutations) {
      this.mutations$.next(mutation);
    }
  }
}
