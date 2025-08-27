"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeRegExp = void 0;
const chalk_1 = __importDefault(require("chalk"));
const makeRegExp = (reString, name, defaultValue, caseSensitive) => {
    if (!reString) {
        return defaultValue;
    }
    else {
        try {
            return new RegExp(reString, caseSensitive ? "" : "i");
        }
        catch (_) {
            console.log(`${chalk_1.default.red.bold("***ERROR***")}
Invalid format for option --${name}

  Unable to convert the string ${JSON.stringify(reString)} to a regular expression.
`);
            process.exit(1);
            return /unreachable/;
        }
    }
};
exports.makeRegExp = makeRegExp;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFrZVJlZ0V4cC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9tYWtlUmVnRXhwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLGtEQUF5QjtBQUVsQixNQUFNLFVBQVUsR0FBRyxDQUN4QixRQUFnQixFQUNoQixJQUFZLEVBQ1osWUFBb0IsRUFDcEIsYUFBc0IsRUFDZCxFQUFFO0lBQ1YsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2QsT0FBTyxZQUFZLENBQUE7SUFDckIsQ0FBQztTQUFNLENBQUM7UUFDTixJQUFJLENBQUM7WUFDSCxPQUFPLElBQUksTUFBTSxDQUFDLFFBQVEsRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDdkQsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWCxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsZUFBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDOzhCQUNwQixJQUFJOztpQ0FFRCxJQUFJLENBQUMsU0FBUyxDQUMzQyxRQUFRLENBQ1Q7Q0FDRixDQUFDLENBQUE7WUFFSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2YsT0FBTyxhQUFhLENBQUE7UUFDdEIsQ0FBQztJQUNILENBQUM7QUFDSCxDQUFDLENBQUE7QUF4QlksUUFBQSxVQUFVLGNBd0J0QiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjaGFsayBmcm9tIFwiY2hhbGtcIlxuXG5leHBvcnQgY29uc3QgbWFrZVJlZ0V4cCA9IChcbiAgcmVTdHJpbmc6IHN0cmluZyxcbiAgbmFtZTogc3RyaW5nLFxuICBkZWZhdWx0VmFsdWU6IFJlZ0V4cCxcbiAgY2FzZVNlbnNpdGl2ZTogYm9vbGVhbixcbik6IFJlZ0V4cCA9PiB7XG4gIGlmICghcmVTdHJpbmcpIHtcbiAgICByZXR1cm4gZGVmYXVsdFZhbHVlXG4gIH0gZWxzZSB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBuZXcgUmVnRXhwKHJlU3RyaW5nLCBjYXNlU2Vuc2l0aXZlID8gXCJcIiA6IFwiaVwiKVxuICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgIGNvbnNvbGUubG9nKGAke2NoYWxrLnJlZC5ib2xkKFwiKioqRVJST1IqKipcIil9XG5JbnZhbGlkIGZvcm1hdCBmb3Igb3B0aW9uIC0tJHtuYW1lfVxuXG4gIFVuYWJsZSB0byBjb252ZXJ0IHRoZSBzdHJpbmcgJHtKU09OLnN0cmluZ2lmeShcbiAgICByZVN0cmluZyxcbiAgKX0gdG8gYSByZWd1bGFyIGV4cHJlc3Npb24uXG5gKVxuXG4gICAgICBwcm9jZXNzLmV4aXQoMSlcbiAgICAgIHJldHVybiAvdW5yZWFjaGFibGUvXG4gICAgfVxuICB9XG59XG4iXX0=