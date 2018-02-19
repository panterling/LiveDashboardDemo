var expect = require('chai').expect
/****************************************************************************************/

import FeedManager from "../src/FeedManager.js"


describe("A suite", function() {
    it("This should pass....", function() {
        let fm = new FeedManager();
        expect(true).to.equal(true);
    });
});