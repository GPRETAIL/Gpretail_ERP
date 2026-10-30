import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
const mocks=vi.hoisted(()=>({vibrate:vi.fn(),decode:vi.fn(),fallbackStop:vi.fn()}));
vi.mock("react-redux",()=>({useSelector:select=>select({auth:{user:{id:1}}})}));
vi.mock("../../../api/axios",()=>({default:{get:()=>new Promise(()=>{}),post:vi.fn()}}));
vi.mock("../../offline/db",()=>({saveDraft:vi.fn(),addToSyncQueue:vi.fn(),getCachedData:vi.fn(),setCachedData:vi.fn()}));
vi.mock("../../../context/PrintContext",()=>({usePrintContext:()=>({queuePrintHtml:vi.fn()})}));
vi.mock("../../hooks/useHaptics",()=>({default:()=>({vibrate:mocks.vibrate})}));
vi.mock("../../hooks/useNativeShare",()=>({default:()=>({isSupported:false,shareFile:vi.fn()})}));
vi.mock("../../../utils/htmlToPdf",()=>({getHtmlAsPdfBlob:vi.fn()}));
vi.mock("../../../utils/posSaleReceiptPrinter",()=>({printPosSaleReceipt:vi.fn(),buildPosSaleReceiptHtmlForSale:vi.fn()}));
vi.mock("../../../utils/salesReceiptCustomization",()=>({fetchSalesReceiptCustomization:()=>new Promise(()=>{}),buildUpiPaymentUri:()=>"upi:test"}));
vi.mock("@zxing/browser",()=>({BrowserMultiFormatReader:class{decodeFromVideoDevice(...args){return mocks.decode(...args);}}}));
import CreateInvoiceScreen from "../CreateInvoiceScreen";
beforeEach(()=>{
 vi.clearAllMocks();
 vi.stubGlobal("requestAnimationFrame",vi.fn(()=>1));vi.stubGlobal("cancelAnimationFrame",vi.fn());
 mocks.decode.mockResolvedValue({stop:mocks.fallbackStop});
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
it("uses the lazy ZXing fallback when native BarcodeDetector is unavailable",async()=>{
 vi.stubGlobal("BarcodeDetector",undefined);
 const view=render(<CreateInvoiceScreen onBack={vi.fn()}/>);
 await waitFor(()=>expect(mocks.decode).toHaveBeenCalledOnce());
 view.unmount(); expect(mocks.fallbackStop).toHaveBeenCalledOnce();
});
it("stops a native stream when unmounted while video playback is still pending",async()=>{
 const stop=vi.fn();const stream={getTracks:()=>[{stop}]};let finishPlayback;
 const playback=new Promise(resolve=>{finishPlayback=resolve;});
 vi.spyOn(HTMLMediaElement.prototype,"play").mockImplementation(()=>playback);
 vi.stubGlobal("BarcodeDetector",class{detect(){return Promise.resolve([]);}});
 const oldMedia=navigator.mediaDevices;
 Object.defineProperty(navigator,"mediaDevices",{configurable:true,value:{getUserMedia:vi.fn().mockResolvedValue(stream)}});
 try {
  const view=render(<CreateInvoiceScreen onBack={vi.fn()}/>);
  await waitFor(()=>expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce());
  view.unmount(); expect(stop).toHaveBeenCalledOnce();
  await act(async()=>{finishPlayback();await playback;});
  expect(requestAnimationFrame).not.toHaveBeenCalled();
  expect(mocks.decode).not.toHaveBeenCalled();
 } finally {Object.defineProperty(navigator,"mediaDevices",{configurable:true,value:oldMedia});}
});
