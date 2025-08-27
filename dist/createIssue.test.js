"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const createIssue_1 = require("./createIssue");
describe(createIssue_1.shouldRecommendIssue, () => {
    it("Allows most repos", () => {
        const eigen = (0, createIssue_1.shouldRecommendIssue)({
            org: "artsy",
            repo: "eigen",
            provider: "GitHub",
        });
        expect(eigen).toBeTruthy();
        const typescript = (0, createIssue_1.shouldRecommendIssue)({
            org: "Microsoft",
            repo: "TypeScript",
            provider: "GitHub",
        });
        expect(typescript).toBeTruthy();
    });
    it("does not recommend DefinitelyTyped", () => {
        const typescript = (0, createIssue_1.shouldRecommendIssue)({
            org: "DefinitelyTyped",
            repo: "DefinitelyTyped",
            provider: "GitHub",
        });
        expect(typescript).toBeFalsy();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlSXNzdWUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9jcmVhdGVJc3N1ZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsK0NBQW9EO0FBRXBELFFBQVEsQ0FBQyxrQ0FBb0IsRUFBRSxHQUFHLEVBQUU7SUFDbEMsRUFBRSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtRQUMzQixNQUFNLEtBQUssR0FBRyxJQUFBLGtDQUFvQixFQUFDO1lBQ2pDLEdBQUcsRUFBRSxPQUFPO1lBQ1osSUFBSSxFQUFFLE9BQU87WUFDYixRQUFRLEVBQUUsUUFBUTtTQUNuQixDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUE7UUFFMUIsTUFBTSxVQUFVLEdBQUcsSUFBQSxrQ0FBb0IsRUFBQztZQUN0QyxHQUFHLEVBQUUsV0FBVztZQUNoQixJQUFJLEVBQUUsWUFBWTtZQUNsQixRQUFRLEVBQUUsUUFBUTtTQUNuQixDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUE7SUFDakMsQ0FBQyxDQUFDLENBQUE7SUFFRixFQUFFLENBQUMsb0NBQW9DLEVBQUUsR0FBRyxFQUFFO1FBQzVDLE1BQU0sVUFBVSxHQUFHLElBQUEsa0NBQW9CLEVBQUM7WUFDdEMsR0FBRyxFQUFFLGlCQUFpQjtZQUN0QixJQUFJLEVBQUUsaUJBQWlCO1lBQ3ZCLFFBQVEsRUFBRSxRQUFRO1NBQ25CLENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQTtJQUNoQyxDQUFDLENBQUMsQ0FBQTtBQUNKLENBQUMsQ0FBQyxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgc2hvdWxkUmVjb21tZW5kSXNzdWUgfSBmcm9tIFwiLi9jcmVhdGVJc3N1ZVwiXG5cbmRlc2NyaWJlKHNob3VsZFJlY29tbWVuZElzc3VlLCAoKSA9PiB7XG4gIGl0KFwiQWxsb3dzIG1vc3QgcmVwb3NcIiwgKCkgPT4ge1xuICAgIGNvbnN0IGVpZ2VuID0gc2hvdWxkUmVjb21tZW5kSXNzdWUoe1xuICAgICAgb3JnOiBcImFydHN5XCIsXG4gICAgICByZXBvOiBcImVpZ2VuXCIsXG4gICAgICBwcm92aWRlcjogXCJHaXRIdWJcIixcbiAgICB9KVxuICAgIGV4cGVjdChlaWdlbikudG9CZVRydXRoeSgpXG5cbiAgICBjb25zdCB0eXBlc2NyaXB0ID0gc2hvdWxkUmVjb21tZW5kSXNzdWUoe1xuICAgICAgb3JnOiBcIk1pY3Jvc29mdFwiLFxuICAgICAgcmVwbzogXCJUeXBlU2NyaXB0XCIsXG4gICAgICBwcm92aWRlcjogXCJHaXRIdWJcIixcbiAgICB9KVxuICAgIGV4cGVjdCh0eXBlc2NyaXB0KS50b0JlVHJ1dGh5KClcbiAgfSlcblxuICBpdChcImRvZXMgbm90IHJlY29tbWVuZCBEZWZpbml0ZWx5VHlwZWRcIiwgKCkgPT4ge1xuICAgIGNvbnN0IHR5cGVzY3JpcHQgPSBzaG91bGRSZWNvbW1lbmRJc3N1ZSh7XG4gICAgICBvcmc6IFwiRGVmaW5pdGVseVR5cGVkXCIsXG4gICAgICByZXBvOiBcIkRlZmluaXRlbHlUeXBlZFwiLFxuICAgICAgcHJvdmlkZXI6IFwiR2l0SHViXCIsXG4gICAgfSlcbiAgICBleHBlY3QodHlwZXNjcmlwdCkudG9CZUZhbHN5KClcbiAgfSlcbn0pXG4iXX0=