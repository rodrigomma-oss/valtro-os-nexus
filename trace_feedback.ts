import { listFeedback } from "./src/lib/os/feedback.functions";
async function trace() {
  try {
    const result = await listFeedback({ data: {} });
    console.log("TRACE_START");
    console.log(JSON.stringify(result, null, 2));
    console.log("TRACE_END");
  } catch (e: any) {
    console.error("SERVER_FN_ERROR:" + e.message);
  }
}
trace();
