export default async function recordCallerName(orderService, functionArgs) {
  return orderService.recordCallerName(functionArgs['callerName']);
}
