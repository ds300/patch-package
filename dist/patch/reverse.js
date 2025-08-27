"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reversePatch = void 0;
const parse_1 = require("./parse");
const assertNever_1 = require("../assertNever");
function reverseHunk(hunk) {
    const header = {
        original: hunk.header.patched,
        patched: hunk.header.original,
    };
    const parts = [];
    for (const part of hunk.parts) {
        switch (part.type) {
            case "context":
                parts.push(part);
                break;
            case "deletion":
                parts.push({
                    type: "insertion",
                    lines: part.lines,
                    noNewlineAtEndOfFile: part.noNewlineAtEndOfFile,
                });
                break;
            case "insertion":
                parts.push({
                    type: "deletion",
                    lines: part.lines,
                    noNewlineAtEndOfFile: part.noNewlineAtEndOfFile,
                });
                break;
            default:
                (0, assertNever_1.assertNever)(part.type);
        }
    }
    // swap insertions and deletions over so deletions always come first
    for (let i = 0; i < parts.length - 1; i++) {
        if (parts[i].type === "insertion" && parts[i + 1].type === "deletion") {
            const tmp = parts[i];
            parts[i] = parts[i + 1];
            parts[i + 1] = tmp;
            i += 1;
        }
    }
    const result = {
        header,
        parts,
        source: hunk.source,
    };
    (0, parse_1.verifyHunkIntegrity)(result);
    return result;
}
function reversePatchPart(part) {
    switch (part.type) {
        case "file creation":
            return {
                type: "file deletion",
                path: part.path,
                hash: part.hash,
                hunk: part.hunk && reverseHunk(part.hunk),
                mode: part.mode,
            };
        case "file deletion":
            return {
                type: "file creation",
                path: part.path,
                hunk: part.hunk && reverseHunk(part.hunk),
                mode: part.mode,
                hash: part.hash,
            };
        case "rename":
            return {
                type: "rename",
                fromPath: part.toPath,
                toPath: part.fromPath,
            };
        case "patch":
            return {
                type: "patch",
                path: part.path,
                hunks: part.hunks.map(reverseHunk),
                beforeHash: part.afterHash,
                afterHash: part.beforeHash,
            };
        case "mode change":
            return {
                type: "mode change",
                path: part.path,
                newMode: part.oldMode,
                oldMode: part.newMode,
            };
    }
}
const reversePatch = (patch) => {
    return patch.map(reversePatchPart).reverse();
};
exports.reversePatch = reversePatch;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmV2ZXJzZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9wYXRjaC9yZXZlcnNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQU1nQjtBQUNoQixnREFBNEM7QUFFNUMsU0FBUyxXQUFXLENBQUMsSUFBVTtJQUM3QixNQUFNLE1BQU0sR0FBZTtRQUN6QixRQUFRLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPO1FBQzdCLE9BQU8sRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVE7S0FDOUIsQ0FBQTtJQUNELE1BQU0sS0FBSyxHQUFrQixFQUFFLENBQUE7SUFFL0IsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDOUIsUUFBUSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDbEIsS0FBSyxTQUFTO2dCQUNaLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ2hCLE1BQUs7WUFDUCxLQUFLLFVBQVU7Z0JBQ2IsS0FBSyxDQUFDLElBQUksQ0FBQztvQkFDVCxJQUFJLEVBQUUsV0FBVztvQkFDakIsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO29CQUNqQixvQkFBb0IsRUFBRSxJQUFJLENBQUMsb0JBQW9CO2lCQUNoRCxDQUFDLENBQUE7Z0JBQ0YsTUFBSztZQUNQLEtBQUssV0FBVztnQkFDZCxLQUFLLENBQUMsSUFBSSxDQUFDO29CQUNULElBQUksRUFBRSxVQUFVO29CQUNoQixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7b0JBQ2pCLG9CQUFvQixFQUFFLElBQUksQ0FBQyxvQkFBb0I7aUJBQ2hELENBQUMsQ0FBQTtnQkFDRixNQUFLO1lBQ1A7Z0JBQ0UsSUFBQSx5QkFBVyxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUMxQixDQUFDO0lBQ0gsQ0FBQztJQUVELG9FQUFvRTtJQUNwRSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUMxQyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssV0FBVyxJQUFJLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQ3RFLE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNwQixLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUN2QixLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQTtZQUNsQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ1IsQ0FBQztJQUNILENBQUM7SUFFRCxNQUFNLE1BQU0sR0FBUztRQUNuQixNQUFNO1FBQ04sS0FBSztRQUNMLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtLQUNwQixDQUFBO0lBRUQsSUFBQSwyQkFBbUIsRUFBQyxNQUFNLENBQUMsQ0FBQTtJQUUzQixPQUFPLE1BQU0sQ0FBQTtBQUNmLENBQUM7QUFFRCxTQUFTLGdCQUFnQixDQUFDLElBQW1CO0lBQzNDLFFBQVEsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2xCLEtBQUssZUFBZTtZQUNsQixPQUFPO2dCQUNMLElBQUksRUFBRSxlQUFlO2dCQUNyQixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7Z0JBQ2YsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO2dCQUNmLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO2dCQUN6QyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7YUFDaEIsQ0FBQTtRQUNILEtBQUssZUFBZTtZQUNsQixPQUFPO2dCQUNMLElBQUksRUFBRSxlQUFlO2dCQUNyQixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7Z0JBQ2YsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7Z0JBQ3pDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtnQkFDZixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7YUFDaEIsQ0FBQTtRQUNILEtBQUssUUFBUTtZQUNYLE9BQU87Z0JBQ0wsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsUUFBUSxFQUFFLElBQUksQ0FBQyxNQUFNO2dCQUNyQixNQUFNLEVBQUUsSUFBSSxDQUFDLFFBQVE7YUFDdEIsQ0FBQTtRQUNILEtBQUssT0FBTztZQUNWLE9BQU87Z0JBQ0wsSUFBSSxFQUFFLE9BQU87Z0JBQ2IsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO2dCQUNmLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUM7Z0JBQ2xDLFVBQVUsRUFBRSxJQUFJLENBQUMsU0FBUztnQkFDMUIsU0FBUyxFQUFFLElBQUksQ0FBQyxVQUFVO2FBQzNCLENBQUE7UUFDSCxLQUFLLGFBQWE7WUFDaEIsT0FBTztnQkFDTCxJQUFJLEVBQUUsYUFBYTtnQkFDbkIsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO2dCQUNmLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTztnQkFDckIsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO2FBQ3RCLENBQUE7SUFDTCxDQUFDO0FBQ0gsQ0FBQztBQUVNLE1BQU0sWUFBWSxHQUFHLENBQUMsS0FBc0IsRUFBbUIsRUFBRTtJQUN0RSxPQUFPLEtBQUssQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtBQUM5QyxDQUFDLENBQUE7QUFGWSxRQUFBLFlBQVksZ0JBRXhCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgUGFyc2VkUGF0Y2hGaWxlLFxuICBQYXRjaEZpbGVQYXJ0LFxuICBIdW5rLFxuICBIdW5rSGVhZGVyLFxuICB2ZXJpZnlIdW5rSW50ZWdyaXR5LFxufSBmcm9tIFwiLi9wYXJzZVwiXG5pbXBvcnQgeyBhc3NlcnROZXZlciB9IGZyb20gXCIuLi9hc3NlcnROZXZlclwiXG5cbmZ1bmN0aW9uIHJldmVyc2VIdW5rKGh1bms6IEh1bmspOiBIdW5rIHtcbiAgY29uc3QgaGVhZGVyOiBIdW5rSGVhZGVyID0ge1xuICAgIG9yaWdpbmFsOiBodW5rLmhlYWRlci5wYXRjaGVkLFxuICAgIHBhdGNoZWQ6IGh1bmsuaGVhZGVyLm9yaWdpbmFsLFxuICB9XG4gIGNvbnN0IHBhcnRzOiBIdW5rW1wicGFydHNcIl0gPSBbXVxuXG4gIGZvciAoY29uc3QgcGFydCBvZiBodW5rLnBhcnRzKSB7XG4gICAgc3dpdGNoIChwYXJ0LnR5cGUpIHtcbiAgICAgIGNhc2UgXCJjb250ZXh0XCI6XG4gICAgICAgIHBhcnRzLnB1c2gocGFydClcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgXCJkZWxldGlvblwiOlxuICAgICAgICBwYXJ0cy5wdXNoKHtcbiAgICAgICAgICB0eXBlOiBcImluc2VydGlvblwiLFxuICAgICAgICAgIGxpbmVzOiBwYXJ0LmxpbmVzLFxuICAgICAgICAgIG5vTmV3bGluZUF0RW5kT2ZGaWxlOiBwYXJ0Lm5vTmV3bGluZUF0RW5kT2ZGaWxlLFxuICAgICAgICB9KVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSBcImluc2VydGlvblwiOlxuICAgICAgICBwYXJ0cy5wdXNoKHtcbiAgICAgICAgICB0eXBlOiBcImRlbGV0aW9uXCIsXG4gICAgICAgICAgbGluZXM6IHBhcnQubGluZXMsXG4gICAgICAgICAgbm9OZXdsaW5lQXRFbmRPZkZpbGU6IHBhcnQubm9OZXdsaW5lQXRFbmRPZkZpbGUsXG4gICAgICAgIH0pXG4gICAgICAgIGJyZWFrXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBhc3NlcnROZXZlcihwYXJ0LnR5cGUpXG4gICAgfVxuICB9XG5cbiAgLy8gc3dhcCBpbnNlcnRpb25zIGFuZCBkZWxldGlvbnMgb3ZlciBzbyBkZWxldGlvbnMgYWx3YXlzIGNvbWUgZmlyc3RcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXJ0cy5sZW5ndGggLSAxOyBpKyspIHtcbiAgICBpZiAocGFydHNbaV0udHlwZSA9PT0gXCJpbnNlcnRpb25cIiAmJiBwYXJ0c1tpICsgMV0udHlwZSA9PT0gXCJkZWxldGlvblwiKSB7XG4gICAgICBjb25zdCB0bXAgPSBwYXJ0c1tpXVxuICAgICAgcGFydHNbaV0gPSBwYXJ0c1tpICsgMV1cbiAgICAgIHBhcnRzW2kgKyAxXSA9IHRtcFxuICAgICAgaSArPSAxXG4gICAgfVxuICB9XG5cbiAgY29uc3QgcmVzdWx0OiBIdW5rID0ge1xuICAgIGhlYWRlcixcbiAgICBwYXJ0cyxcbiAgICBzb3VyY2U6IGh1bmsuc291cmNlLFxuICB9XG5cbiAgdmVyaWZ5SHVua0ludGVncml0eShyZXN1bHQpXG5cbiAgcmV0dXJuIHJlc3VsdFxufVxuXG5mdW5jdGlvbiByZXZlcnNlUGF0Y2hQYXJ0KHBhcnQ6IFBhdGNoRmlsZVBhcnQpOiBQYXRjaEZpbGVQYXJ0IHtcbiAgc3dpdGNoIChwYXJ0LnR5cGUpIHtcbiAgICBjYXNlIFwiZmlsZSBjcmVhdGlvblwiOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogXCJmaWxlIGRlbGV0aW9uXCIsXG4gICAgICAgIHBhdGg6IHBhcnQucGF0aCxcbiAgICAgICAgaGFzaDogcGFydC5oYXNoLFxuICAgICAgICBodW5rOiBwYXJ0Lmh1bmsgJiYgcmV2ZXJzZUh1bmsocGFydC5odW5rKSxcbiAgICAgICAgbW9kZTogcGFydC5tb2RlLFxuICAgICAgfVxuICAgIGNhc2UgXCJmaWxlIGRlbGV0aW9uXCI6XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiBcImZpbGUgY3JlYXRpb25cIixcbiAgICAgICAgcGF0aDogcGFydC5wYXRoLFxuICAgICAgICBodW5rOiBwYXJ0Lmh1bmsgJiYgcmV2ZXJzZUh1bmsocGFydC5odW5rKSxcbiAgICAgICAgbW9kZTogcGFydC5tb2RlLFxuICAgICAgICBoYXNoOiBwYXJ0Lmhhc2gsXG4gICAgICB9XG4gICAgY2FzZSBcInJlbmFtZVwiOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogXCJyZW5hbWVcIixcbiAgICAgICAgZnJvbVBhdGg6IHBhcnQudG9QYXRoLFxuICAgICAgICB0b1BhdGg6IHBhcnQuZnJvbVBhdGgsXG4gICAgICB9XG4gICAgY2FzZSBcInBhdGNoXCI6XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiBcInBhdGNoXCIsXG4gICAgICAgIHBhdGg6IHBhcnQucGF0aCxcbiAgICAgICAgaHVua3M6IHBhcnQuaHVua3MubWFwKHJldmVyc2VIdW5rKSxcbiAgICAgICAgYmVmb3JlSGFzaDogcGFydC5hZnRlckhhc2gsXG4gICAgICAgIGFmdGVySGFzaDogcGFydC5iZWZvcmVIYXNoLFxuICAgICAgfVxuICAgIGNhc2UgXCJtb2RlIGNoYW5nZVwiOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogXCJtb2RlIGNoYW5nZVwiLFxuICAgICAgICBwYXRoOiBwYXJ0LnBhdGgsXG4gICAgICAgIG5ld01vZGU6IHBhcnQub2xkTW9kZSxcbiAgICAgICAgb2xkTW9kZTogcGFydC5uZXdNb2RlLFxuICAgICAgfVxuICB9XG59XG5cbmV4cG9ydCBjb25zdCByZXZlcnNlUGF0Y2ggPSAocGF0Y2g6IFBhcnNlZFBhdGNoRmlsZSk6IFBhcnNlZFBhdGNoRmlsZSA9PiB7XG4gIHJldHVybiBwYXRjaC5tYXAocmV2ZXJzZVBhdGNoUGFydCkucmV2ZXJzZSgpXG59XG4iXX0=