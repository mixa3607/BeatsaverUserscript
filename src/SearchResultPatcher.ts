import {Service} from "typedi";
import {ILogger, InjectLogger} from "@/logger/logger";
import {XhrHooker} from "@/tools/XhrHooker";
import {DomChangeDetector} from "@/tools/DomChangeDetector";
import {MapDetail, SearchResponse} from "@/models/beatsaver-api/models";
import {filter, from, map} from "rxjs";
import axios from "axios";

@Service()
export class SearchResultPagePatcher {
  private maps: MapDetail[] = [];
  private players: HTMLAudioElement[] = [];

  constructor(@InjectLogger('SRPatcher') private logger: ILogger,
              private xhrHooker: XhrHooker,
              private domChangeDetector: DomChangeDetector,) {
  }

  public init(): void {
    this.xhrHooker.addEventListener('load', ((req, ev) => {
      if (!/.*api\/search\/text.*/.test(req.responseURL)) {
        return;
      }
      const resp = JSON.parse(req.responseText) as SearchResponse;
      this.maps.push(...resp.docs);
      this.logger.info('Add maps:', resp.docs.length);
    }));

    //this.domChangeDetector.mutations$.subscribe(x => this.logger.debug(x));
    this.domChangeDetector.mutations$.pipe(
      filter(x =>
        x.target instanceof HTMLDivElement && x.target.classList.contains('beatmap') &&
        x.addedNodes.length === 1 && x.addedNodes[0] instanceof HTMLDivElement && x.addedNodes[0].classList.contains('body')
      ),
      map(x => x.addedNodes[0] as HTMLDivElement)
    ).subscribe(x => setTimeout(() => this.patchMapCard(x), 150));

    this.logger.info('Initialized');
  }

  private buildPlayButton(audioUrl: string): HTMLAnchorElement {
    const iEl = document.createElement('i');
    iEl.classList.add('fas', 'fa-play-circle', 'text-info');
    iEl.ariaHidden = 'true';

    const aEl = document.createElement('a');
    aEl.ariaLabel = '10 sec';
    aEl.title = '10 sec';
    aEl.style.margin = '0';
    aEl.appendChild(iEl);
    aEl.addEventListener('click', async () => {
      if (playerEl.paused) {
        if (playerEl.src == null || playerEl.src == '') {
          iEl.classList.add('fa-spinner');
          playerEl.src = await this.getB64Audio(audioUrl);
          iEl.classList.remove('fa-spinner');
        }
        await playerEl.play();
      } else {
        playerEl.pause();
      }
    });

    const playerEl = document.createElement('audio');
    playerEl.controls = false;
    playerEl.addEventListener('play', () => {
      this.players.filter(x => x !== playerEl).forEach(x => {
        x.pause();
        x.currentTime = 0;
      });
      iEl.classList.remove('fa-play-circle');
      iEl.classList.add('fa-pause-circle');
    });
    playerEl.addEventListener('pause', () => {
      iEl.classList.remove('fa-pause-circle');
      iEl.classList.add('fa-play-circle');
    });
    this.players.push(playerEl);
    return aEl;
  }

  private patchMapCard(divEl: HTMLDivElement) {
    const linksDivEl = divEl.querySelector('.links') as HTMLDivElement;
    const linkEl = Array.from(linksDivEl.children).find(x => x instanceof HTMLAnchorElement && x.title === 'One-Click') as HTMLAnchorElement;
    if (linkEl == null) {
      this.logger.warn('Link href not found', divEl);
      return;
    }
    // @ts-ignore
    const {groups: {id}} = /beatsaver:\/\/(?<id>[^\/]*).*/.exec(linkEl.href);
    if (id == null) {
      this.logger.warn('Can\'t extract map id from', linkEl);
      return;
    }

    const mapInfo = this.maps.find(x => x.id === id);
    if (mapInfo == null) {
      this.logger.warn('Can\'t find map info', id);
      return;
    }

    const audPrewUrl = mapInfo.versions.find(x => x.previewURL != null).previewURL;
    if (audPrewUrl == null) {
      this.logger.warn('Prew url empty');
      return;
    }
    linksDivEl.appendChild(this.buildPlayButton(audPrewUrl));
    this.logger.debug('Patch map card', divEl);
  }

  private async getB64Audio(url: string): Promise<string> {
    const resp = await axios.get(url, {responseType: 'arraybuffer'});
    return 'data:audio/mpeg;base64,' + this.arrayBufferToBase64(resp.data);
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}
