var expect = require('chai').expect
/****************************************************************************************/

import FeedManager from "../src/FeedManager.js"


describe("A suite", function() {
    it("contains spec with an expectation", function() {
        let fm = new FeedManager();
        expect(true).to.equal(true);
    });
});