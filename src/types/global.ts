// @ts-ignore
import {XhrHooker} from "@/tools/XhrHooker";

declare global {
  interface Window {
  }

  let unsafeWindow: Window & typeof globalThis;
}
