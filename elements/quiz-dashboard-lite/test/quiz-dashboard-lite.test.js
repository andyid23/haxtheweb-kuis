import { html, fixture, expect } from '@open-wc/testing';
import "../quiz-dashboard-lite.js";

describe("QuizDashboardLite test", () => {
  let element;
  beforeEach(async () => {
    element = await fixture(html`
      <quiz-dashboard-lite
        title="title"
      ></quiz-dashboard-lite>
    `);
  });

  it("basic will it blend", async () => {
    expect(element).to.exist;
  });

  it("passes the a11y audit", async () => {
    await expect(element).shadowDom.to.be.accessible();
  });
});
