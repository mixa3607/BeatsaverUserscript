import 'reflect-metadata';
import {Container} from "typedi";
import {Logger} from "@/logger/logger";
import {DomChangeDetector} from "@/tools/DomChangeDetector";
import {XhrHooker} from "@/tools/XhrHooker";
import {SearchResultPagePatcher} from "@/SearchResultPatcher";
import adapter from "axios-userscript-adapter/dist/esm";
import axios from "axios";

function main(): void {
  const logger = Container.get(Logger);
  logger.info('Starting userscript');
  axios.defaults.adapter = adapter;

  Container.get(XhrHooker).init();
  Container.get(SearchResultPagePatcher).init();
  Container.get(DomChangeDetector).init();
}

main();
