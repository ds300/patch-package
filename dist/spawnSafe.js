"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spawnSafeSync = void 0;
const cross_spawn_1 = require("cross-spawn");
const defaultOptions = {
    logStdErrOnError: true,
    throwOnError: true,
};
const spawnSafeSync = (command, args, options) => {
    const mergedOptions = Object.assign({}, defaultOptions, options);
    const result = (0, cross_spawn_1.sync)(command, args, options);
    if (result.error || result.status !== 0) {
        if (mergedOptions.logStdErrOnError) {
            if (result.stderr) {
                console.log(result.stderr.toString());
            }
            else if (result.error) {
                console.log(result.error);
            }
        }
        if (mergedOptions.throwOnError) {
            throw result;
        }
    }
    return result;
};
exports.spawnSafeSync = spawnSafeSync;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3Bhd25TYWZlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3NwYXduU2FmZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2Q0FBK0M7QUFTL0MsTUFBTSxjQUFjLEdBQXFCO0lBQ3ZDLGdCQUFnQixFQUFFLElBQUk7SUFDdEIsWUFBWSxFQUFFLElBQUk7Q0FDbkIsQ0FBQTtBQUVNLE1BQU0sYUFBYSxHQUFHLENBQzNCLE9BQWUsRUFDZixJQUFlLEVBQ2YsT0FBMEIsRUFDMUIsRUFBRTtJQUNGLE1BQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLGNBQWMsRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUNoRSxNQUFNLE1BQU0sR0FBRyxJQUFBLGtCQUFTLEVBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUNoRCxJQUFJLE1BQU0sQ0FBQyxLQUFLLElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUN4QyxJQUFJLGFBQWEsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ25DLElBQUksTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNsQixPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtZQUN2QyxDQUFDO2lCQUFNLElBQUksTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUN4QixPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUMzQixDQUFDO1FBQ0gsQ0FBQztRQUNELElBQUksYUFBYSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQy9CLE1BQU0sTUFBTSxDQUFBO1FBQ2QsQ0FBQztJQUNILENBQUM7SUFDRCxPQUFPLE1BQU0sQ0FBQTtBQUNmLENBQUMsQ0FBQTtBQXBCWSxRQUFBLGFBQWEsaUJBb0J6QiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHN5bmMgYXMgc3Bhd25TeW5jIH0gZnJvbSBcImNyb3NzLXNwYXduXCJcbmltcG9ydCB7IFNwYXduT3B0aW9ucyB9IGZyb20gXCJjaGlsZF9wcm9jZXNzXCJcblxuZXhwb3J0IGludGVyZmFjZSBTcGF3blNhZmVPcHRpb25zIGV4dGVuZHMgU3Bhd25PcHRpb25zIHtcbiAgdGhyb3dPbkVycm9yPzogYm9vbGVhblxuICBsb2dTdGRFcnJPbkVycm9yPzogYm9vbGVhblxuICBtYXhCdWZmZXI/OiBudW1iZXJcbn1cblxuY29uc3QgZGVmYXVsdE9wdGlvbnM6IFNwYXduU2FmZU9wdGlvbnMgPSB7XG4gIGxvZ1N0ZEVyck9uRXJyb3I6IHRydWUsXG4gIHRocm93T25FcnJvcjogdHJ1ZSxcbn1cblxuZXhwb3J0IGNvbnN0IHNwYXduU2FmZVN5bmMgPSAoXG4gIGNvbW1hbmQ6IHN0cmluZyxcbiAgYXJncz86IHN0cmluZ1tdLFxuICBvcHRpb25zPzogU3Bhd25TYWZlT3B0aW9ucyxcbikgPT4ge1xuICBjb25zdCBtZXJnZWRPcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdE9wdGlvbnMsIG9wdGlvbnMpXG4gIGNvbnN0IHJlc3VsdCA9IHNwYXduU3luYyhjb21tYW5kLCBhcmdzLCBvcHRpb25zKVxuICBpZiAocmVzdWx0LmVycm9yIHx8IHJlc3VsdC5zdGF0dXMgIT09IDApIHtcbiAgICBpZiAobWVyZ2VkT3B0aW9ucy5sb2dTdGRFcnJPbkVycm9yKSB7XG4gICAgICBpZiAocmVzdWx0LnN0ZGVycikge1xuICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQuc3RkZXJyLnRvU3RyaW5nKCkpXG4gICAgICB9IGVsc2UgaWYgKHJlc3VsdC5lcnJvcikge1xuICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQuZXJyb3IpXG4gICAgICB9XG4gICAgfVxuICAgIGlmIChtZXJnZWRPcHRpb25zLnRocm93T25FcnJvcikge1xuICAgICAgdGhyb3cgcmVzdWx0XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHRcbn1cbiJdfQ==