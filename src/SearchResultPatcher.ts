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
  private buttons: { i: HTMLElement; a: HTMLAnchorElement; songId: string }[] = [];
  private audioPlayer: HTMLAudioElement;
  private audioCache: { remoteUrl: string; localUrl: string }[] = [];

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

    this.domChangeDetector.mutations$.pipe(
      filter(x =>
        x.target instanceof HTMLDivElement && x.target.classList.contains('beatmap') &&
        x.addedNodes.length === 1 && x.addedNodes[0] instanceof HTMLDivElement && x.addedNodes[0].classList.contains('body')
      ),
      map(x => x.addedNodes[0] as HTMLDivElement)
    ).subscribe(x => this.patchMapCard(x));

    this.audioPlayer = document.createElement('audio');
    this.audioPlayer.controls = false;
    this.audioPlayer.addEventListener('pause', () => this.setPlayStyle(null));

    this.logger.info('Initialized');
  }

  private buildPlayButton(songId: string): HTMLAnchorElement {
    const iEl = document.createElement('i');
    iEl.classList.add('fas', 'fa-play-circle', 'text-info');
    iEl.ariaHidden = 'true';

    const aEl = document.createElement('a');
    aEl.ariaLabel = '10 sec';
    aEl.title = '10 sec';
    aEl.style.margin = '0';
    aEl.appendChild(iEl);
    aEl.addEventListener('click', async () => {
      if (iEl.classList.contains('playing')){
        this.audioPlayer.pause();
        return;
      }

      const remoteUrl = this.maps.find(x => x.id === songId).versions.find(x => x.previewURL != null && x.previewURL != '')?.previewURL;
      if (remoteUrl == null) {
        this.logger.warn('Preview url for song not found', songId);
        aEl.style.cursor = 'pointer';
        return;
      }
      iEl.classList.add('fa-spinner');
      const localUrl = await this.getAudioLocalUrl(remoteUrl);
      iEl.classList.remove('fa-spinner');

      this.audioPlayer.pause();
      this.audioPlayer.currentTime = 0;
      this.audioPlayer.src = localUrl;
      this.setPlayStyle(songId);
      await this.audioPlayer.play();
    });
    this.buttons.push({i: iEl, a: aEl, songId});

    return aEl;
  }

  private setPlayStyle(songId: string | null): void {
    for (const button of this.buttons) {
      if (button.songId === songId) {
        button.i.classList.add('fa-pause-circle', 'playing');
        button.i.classList.remove('fa-play-circle');
      } else {
        button.i.classList.add('fa-play-circle');
        button.i.classList.remove('fa-pause-circle', 'playing');
      }
    }
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

    linksDivEl.appendChild(this.buildPlayButton(id));
    this.logger.debug('Patch map card', divEl);
  }

  private async getAudioLocalUrl(url: string): Promise<string> {
    const cached = this.audioCache.find(x => x.remoteUrl === url);
    if (cached != null) {
      return cached.localUrl;
    }
    const resp = await axios.get<Blob>(url, {responseType: 'blob'});
    const blobUrl = URL.createObjectURL(resp.data);
    this.audioCache.push({localUrl: blobUrl, remoteUrl: url});
    return blobUrl;
  }
}
